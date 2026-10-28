import BlobImage from '../components/BlobImage';
import { LeafIcon } from '../components/Icons';
import type { DiaryRecord, Plant } from '../types';
import { fmtCN, latestRecord, sortPlants } from '../util';

interface Props {
  plants: Plant[];
  records: DiaryRecord[];
  usageMB: number | null;
  onOpen: (plantId: string) => void;
  onCreate: () => void;
  onClearAll: () => void;
}

export default function PlantList({ plants, records, usageMB, onOpen, onCreate, onClearAll }: Props) {
  const sorted = sortPlants(plants, records);
  const totalRecords = records.length;

  if (plants.length === 0) {
    return (
      <div className="empty">
        <div className="glyph">
          <LeafIcon />
        </div>
        <h3>还没有植株</h3>
        <p>先添一盆正在养的植物，之后每次拍照都会留在它的时间线上，随时可以拼出生长对比。</p>
        <button className="btn primary" onClick={onCreate}>
          新建第一株
        </button>
        <div className="footnote">
          数据只保存在这台设备的浏览器里，不会上传，也不跨设备同步。
          <br />
          <button className="link-btn" onClick={onClearAll}>
            清空本机数据
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="list-head">
        <h1>我的植物</h1>
        <span className="count">
          {plants.length} 株 · {totalRecords} 条记录
        </span>
      </div>

      {sorted.map((plant) => {
        const latest = latestRecord(records, plant.id);
        const count = records.filter((r) => r.plantId === plant.id).length;
        const cover = latest?.photos[0]?.thumb;
        const meta = [plant.place, plant.species].filter(Boolean).join(' · ') || '未填写品种与位置';

        return (
          <button key={plant.id} className="plant-card" onClick={() => onOpen(plant.id)}>
            <span className="plant-cover">
              {cover ? <BlobImage blob={cover} alt={`${plant.name}的最近一张照片`} /> : <span className="fallback">叶</span>}
            </span>
            <span className="plant-main">
              <span className="plant-name">
                {plant.name}
                {count === 0 && <span className="pill gray">新</span>}
              </span>
              <span className="plant-meta">
                {meta} · {count} 条记录
              </span>
            </span>
            <span className="plant-side">
              <span className="last">{latest ? fmtCN(latest.date) : '暂无记录'}</span>
            </span>
          </button>
        );
      })}

      <div className="footnote">
        数据只保存在这台设备的浏览器里，不会上传，也不跨设备同步。
        {usageMB != null && ` 已占用约 ${usageMB.toFixed(1)}MB。`}
        <br />
        <button className="link-btn" onClick={onClearAll}>
          清空本机数据
        </button>
      </div>
    </>
  );
}
