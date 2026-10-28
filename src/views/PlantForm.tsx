import { useState } from 'react';
import type { Plant } from '../types';
import { newId, todayISO } from '../util';

interface Props {
  plant?: Plant;
  onSave: (plant: Plant) => Promise<void>;
  onCancel: () => void;
  onDelete: (plant: Plant) => Promise<void>;
}

export default function PlantForm({ plant, onSave, onCancel, onDelete }: Props) {
  const isEdit = Boolean(plant);
  const [name, setName] = useState(plant?.name ?? '');
  const [species, setSpecies] = useState(plant?.species ?? '');
  const [place, setPlace] = useState(plant?.place ?? '');
  const [acquiredAt, setAcquiredAt] = useState(plant?.acquiredAt ?? todayISO());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0 && trimmedName.length <= 20 && !saving;

  const submit = async () => {
    if (!trimmedName) {
      setError('给这株植物起个名字，方便之后在列表里认出它');
      return;
    }
    if (trimmedName.length > 20) {
      setError('名称最多 20 字');
      return;
    }
    if (acquiredAt > todayISO()) {
      setError('入手日期不能晚于今天');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave({
        id: plant?.id ?? newId('p'),
        name: trimmedName,
        species: species.trim() || undefined,
        place: place.trim() || undefined,
        acquiredAt: acquiredAt || undefined,
        createdAt: plant?.createdAt ?? Date.now(),
      });
    } catch (e) {
      setError(`保存失败：${e instanceof Error ? e.message : '未知错误'}。已填内容仍在，可重试。`);
      setSaving(false);
    }
  };

  return (
    <>
      {error && <div className="error-box">{error}</div>}

      <div className="form-section">
        <div className="field">
          <label htmlFor="plant-name">
            名称 <span className="counter">{trimmedName.length}/20</span>
          </label>
          <input
            id="plant-name"
            className="input"
            placeholder="如：龟背竹、窗台绿萝"
            value={name}
            maxLength={20}
            autoFocus={!isEdit}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="hint">允许重名，两盆都叫「绿萝」也没关系，用位置区分即可。</div>
        </div>

        <div className="field">
          <label htmlFor="plant-species">
            品种 <span className="opt">选填</span>
            <span className="counter">{species.length}/30</span>
          </label>
          <input
            id="plant-species"
            className="input"
            placeholder="如：Monstera deliciosa"
            value={species}
            maxLength={30}
            onChange={(e) => setSpecies(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="plant-place">
            摆放位置 <span className="opt">选填</span>
            <span className="counter">{place.length}/20</span>
          </label>
          <input
            id="plant-place"
            className="input"
            placeholder="如：客厅、南阳台"
            value={place}
            maxLength={20}
            onChange={(e) => setPlace(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="plant-acquired">
            入手日期 <span className="opt">选填</span>
          </label>
          <input
            id="plant-acquired"
            className="input"
            type="date"
            value={acquiredAt}
            max={todayISO()}
            onChange={(e) => setAcquiredAt(e.target.value)}
          />
          <div className="hint">仅作展示，用来算「已陪伴多少天」。</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="row">
          <button className="btn ghost" onClick={onCancel}>
            取消
          </button>
          <button className="btn primary grow" disabled={!canSave} onClick={() => void submit()}>
            {saving ? '保存中…' : isEdit ? '保存修改' : '保存并添加记录'}
          </button>
        </div>
      </div>

      {isEdit && plant && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button className="link-btn danger" onClick={() => void onDelete(plant)}>
            删除这株植物
          </button>
        </div>
      )}
    </>
  );
}
