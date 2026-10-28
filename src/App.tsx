import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  clearAll,
  deletePlantWithRecords,
  deleteRecordById,
  estimateUsageMB,
  getAllPlants,
  getAllRecords,
  getMeta,
  putPlant,
  putRecord,
  setMeta,
} from './db';
import { buildSeedData } from './seed';
import type { DiaryRecord, Plant } from './types';
import { recordsOfPlant } from './util';
import { BackIcon, PlusIcon } from './components/Icons';
import PlantList from './views/PlantList';
import PlantDetail from './views/PlantDetail';
import PlantForm from './views/PlantForm';
import RecordForm from './views/RecordForm';
import CollageView from './views/CollageView';

type View =
  | { name: 'list' }
  | { name: 'plant'; plantId: string }
  | { name: 'plantForm'; plantId?: string }
  | { name: 'recordForm'; plantId: string; recordId?: string }
  | { name: 'collage'; plantId: string };

interface ConfirmState {
  title: string;
  message: string;
  confirmText: string;
  danger: boolean;
  resolve: (value: boolean) => void;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState('');
  const [plants, setPlants] = useState<Plant[]>([]);
  const [records, setRecords] = useState<DiaryRecord[]>([]);
  const [view, setView] = useState<View>({ name: 'list' });
  const [toastMsg, setToastMsg] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [usageMB, setUsageMB] = useState<number | null>(null);

  const booted = useRef(false);
  const toastTimer = useRef<number>();

  const toast = useCallback((message: string) => {
    setToastMsg(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2600);
  }, []);

  const refresh = useCallback(async () => {
    const [nextPlants, nextRecords] = await Promise.all([getAllPlants(), getAllRecords()]);
    setPlants(nextPlants);
    setRecords(nextRecords);
    setUsageMB(await estimateUsageMB());
  }, []);

  const bootstrap = useCallback(async () => {
    setFatal('');
    try {
      const [storedPlants, storedRecords, seeded] = await Promise.all([
        getAllPlants(),
        getAllRecords(),
        getMeta('seeded'),
      ]);
      if (!seeded && storedPlants.length === 0) {
        const seed = await buildSeedData();
        await Promise.all(seed.plants.map((p) => putPlant(p)));
        await Promise.all(seed.records.map((r) => putRecord(r)));
        await setMeta('seeded', '1');
        setPlants(seed.plants);
        setRecords(seed.records);
      } else {
        setPlants(storedPlants);
        setRecords(storedRecords);
      }
      setUsageMB(await estimateUsageMB());
      setReady(true);
    } catch (e) {
      setFatal(e instanceof Error ? e.message : '未知错误');
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void bootstrap();
  }, [bootstrap]);

  // 视图指向的植株被删除后回到列表
  useEffect(() => {
    const plantId = 'plantId' in view ? view.plantId : undefined;
    if (plantId && plants.length > 0 && !plants.some((p) => p.id === plantId)) {
      setView({ name: 'list' });
    }
  }, [plants, view]);

  const confirm = useCallback(
    (options: { title: string; message: string; confirmText?: string; danger?: boolean }) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({
          title: options.title,
          message: options.message,
          confirmText: options.confirmText ?? '确定',
          danger: options.danger ?? false,
          resolve,
        });
      }),
    [],
  );

  const closeConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  const currentPlant = 'plantId' in view ? plants.find((p) => p.id === view.plantId) : undefined;
  const currentRecords = currentPlant ? recordsOfPlant(records, currentPlant.id) : [];

  async function savePlant(plant: Plant) {
    await putPlant(plant);
    await refresh();
    setView({ name: 'plant', plantId: plant.id });
    toast('植株已保存');
  }

  async function removePlant(plant: Plant) {
    const count = recordsOfPlant(records, plant.id).length;
    const ok = await confirm({
      title: `删除「${plant.name}」？`,
      message: `将同时删除该株的 ${count} 条记录与全部照片。\n删除后不可恢复。`,
      confirmText: '删除植株',
      danger: true,
    });
    if (!ok) return;
    try {
      await deletePlantWithRecords(plant.id);
      await refresh();
      setView({ name: 'list' });
      toast('已删除');
    } catch {
      toast('删除失败，请重试');
    }
  }

  async function saveRecord(record: DiaryRecord) {
    const isEdit = records.some((r) => r.id === record.id);
    await putRecord(record);
    await refresh();
    setView({ name: 'plant', plantId: record.plantId });
    toast(isEdit ? '记录已更新' : '记录已保存');
  }

  async function removeRecord(record: DiaryRecord) {
    const ok = await confirm({
      title: '删除这条记录？',
      message: `将删除 ${record.date} 的记录与 ${record.photos.length} 张照片。\n删除后不可恢复。`,
      confirmText: '删除记录',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteRecordById(record.id);
      await refresh();
      setView({ name: 'plant', plantId: record.plantId });
      toast('记录已删除');
    } catch {
      toast('删除失败，请重试');
    }
  }

  async function clearData() {
    const ok = await confirm({
      title: '清空本机全部数据？',
      message: '所有植株、记录与照片都会被删除，包括示例数据。\n此操作不可恢复。',
      confirmText: '清空',
      danger: true,
    });
    if (!ok) return;
    try {
      await clearAll();
      await setMeta('seeded', '1');
      await refresh();
      setView({ name: 'list' });
      toast('已清空本机数据');
    } catch {
      toast('清空失败，请重试');
    }
  }

  /* ---------------- app bar 配置 ---------------- */
  let title = '养植日记';
  let onBack: (() => void) | null = null;
  let right: ReactNode = null;

  if (view.name === 'plant' && currentPlant) {
    title = currentPlant.name;
    onBack = () => setView({ name: 'list' });
    right = (
      <button className="icon-btn text" onClick={() => setView({ name: 'plantForm', plantId: currentPlant.id })}>
        编辑
      </button>
    );
  } else if (view.name === 'plantForm') {
    title = view.plantId ? '编辑植株' : '新建植株';
    onBack = () => setView(view.plantId ? { name: 'plant', plantId: view.plantId } : { name: 'list' });
  } else if (view.name === 'recordForm' && currentPlant) {
    title = view.recordId ? '编辑记录' : '添加记录';
    onBack = () => setView({ name: 'plant', plantId: currentPlant.id });
  } else if (view.name === 'collage' && currentPlant) {
    title = '对比生长';
    onBack = () => setView({ name: 'plant', plantId: currentPlant.id });
  } else if (view.name === 'list') {
    right = (
      <button className="icon-btn plus" aria-label="新建植株" onClick={() => setView({ name: 'plantForm' })}>
        <PlusIcon />
      </button>
    );
  }

  /* ---------------- 渲染 ---------------- */
  return (
    <div className="app-shell">
      <header className="appbar">
        {onBack ? (
          <button className="icon-btn" aria-label="返回" onClick={onBack}>
            <BackIcon />
          </button>
        ) : (
          <span />
        )}
        <div className="appbar-title">{title}</div>
        {right ?? <span />}
      </header>

      <main className="screen">
        {!ready ? (
          <>
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </>
        ) : fatal ? (
          <div className="empty">
            <div className="glyph">!</div>
            <h3>本地数据读取失败</h3>
            <p>{fatal}。可能是浏览器禁用了存储，或处于无痕模式。可尝试重新载入页面，或换用普通浏览窗口。</p>
            <button className="btn primary" onClick={() => void bootstrap()}>
              重新载入
            </button>
          </div>
        ) : view.name === 'list' ? (
          <PlantList
            plants={plants}
            records={records}
            usageMB={usageMB}
            onOpen={(plantId) => setView({ name: 'plant', plantId })}
            onCreate={() => setView({ name: 'plantForm' })}
            onClearAll={() => void clearData()}
          />
        ) : view.name === 'plant' && currentPlant ? (
          <PlantDetail
            plant={currentPlant}
            records={currentRecords}
            onAddRecord={() => setView({ name: 'recordForm', plantId: currentPlant.id })}
            onOpenRecord={(recordId) => setView({ name: 'recordForm', plantId: currentPlant.id, recordId })}
            onCollage={() => setView({ name: 'collage', plantId: currentPlant.id })}
          />
        ) : view.name === 'plantForm' && (!view.plantId || plants.some((p) => p.id === view.plantId)) ? (
          <PlantForm
            plant={view.plantId ? plants.find((p) => p.id === view.plantId) : undefined}
            onSave={savePlant}
            onCancel={() => setView(view.plantId ? { name: 'plant', plantId: view.plantId } : { name: 'list' })}
            onDelete={async (plant) => {
              await removePlant(plant);
              setView({ name: 'list' });
            }}
          />
        ) : view.name === 'recordForm' && currentPlant ? (
          <RecordForm
            plant={currentPlant}
            record={view.recordId ? records.find((r) => r.id === view.recordId) : undefined}
            onSave={saveRecord}
            onDelete={(record) => void removeRecord(record)}
            onCancel={() => setView({ name: 'plant', plantId: currentPlant.id })}
            toast={toast}
          />
        ) : view.name === 'collage' && currentPlant ? (
          <CollageView
            plant={currentPlant}
            records={currentRecords}
            onBack={() => setView({ name: 'plant', plantId: currentPlant.id })}
            toast={toast}
          />
        ) : (
          <div className="empty">
            <div className="glyph">·</div>
            <h3>这株植物不在了</h3>
            <p>它可能已被删除。回到列表看看其他植株吧。</p>
            <button className="btn primary" onClick={() => setView({ name: 'list' })}>
              回到列表
            </button>
          </div>
        )}
      </main>

      <div className={`toast ${toastMsg ? 'on' : ''}`} role="status" aria-live="polite">
        {toastMsg}
      </div>

      {confirmState && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>{confirmState.title}</h3>
            <p>{confirmState.message}</p>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => closeConfirm(false)}>
                取消
              </button>
              <button
                className={`btn ${confirmState.danger ? 'danger' : 'primary'}`}
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
