import { useRef, useState } from 'react';
import BlobImage from '../components/BlobImage';
import { compressPhoto, ImageError } from '../image';
import type { DiaryRecord, Photo, Plant } from '../types';
import { fmtDot, newId, todayISO } from '../util';

interface Props {
  plant: Plant;
  record?: DiaryRecord;
  onSave: (record: DiaryRecord) => Promise<void>;
  onDelete: (record: DiaryRecord) => void;
  onCancel: () => void;
  toast: (message: string) => void;
}

const MAX_PHOTOS = 9;
const MAX_NOTE = 500;

export default function RecordForm({ plant, record, onSave, onDelete, onCancel, toast }: Props) {
  const isEdit = Boolean(record);
  const [date, setDate] = useState(record?.date ?? todayISO());
  const [note, setNote] = useState(record?.note ?? '');
  const [height, setHeight] = useState(record?.heightCm != null ? String(record.heightCm) : '');
  const [photos, setPhotos] = useState<Photo[]>(record?.photos ?? []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const albumRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast('一条记录最多 9 张照片');
      return;
    }
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) toast(`最多 9 张，已选择前 ${room} 张`);

    setBusy(true);
    const added: Photo[] = [];
    for (const file of picked) {
      try {
        added.push(await compressPhoto(file));
      } catch (e) {
        toast(e instanceof ImageError ? e.message : '图片处理失败，请换一张');
      }
    }
    setPhotos((prev) => [...prev, ...added]);
    setBusy(false);
  };

  const submit = async () => {
    if (!date) {
      setError('请选择这条记录的日期');
      return;
    }
    if (date > todayISO()) {
      setError('记录日期不能晚于今天，请重新选择');
      return;
    }
    const trimmed = note.trim();
    if (photos.length === 0 && !trimmed) {
      setError('至少填写照片或文字，才能保存这条记录');
      return;
    }
    let heightCm: number | undefined;
    if (height.trim() !== '') {
      if (!/^\d{1,3}$/.test(height.trim())) {
        setError('株高请填 0–999 之间的整数（厘米），或留空');
        return;
      }
      heightCm = Number(height.trim());
    }

    setError('');
    setSaving(true);
    try {
      await onSave({
        id: record?.id ?? newId('r'),
        plantId: plant.id,
        date,
        note: trimmed,
        heightCm,
        photos,
        createdAt: record?.createdAt ?? Date.now(),
      });
    } catch (e) {
      const reason = e instanceof DOMException && e.name === 'QuotaExceededError' ? '本机存储空间不足' : '写入本地存储失败';
      setError(`保存失败：${reason}。已填内容仍然保留，可以删掉几张照片后重试。`);
      setSaving(false);
    }
  };

  return (
    <>
      {error && <div className="error-box">{error}</div>}

      <div className="form-section">
        <div className="field">
          <label htmlFor="record-date">日期</label>
          <input
            id="record-date"
            className="input"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="hint">可选今天及之前的任意一天，方便补录旧照片。</div>
        </div>

        <div className="field">
          <label>
            照片 <span className="opt">与文字至少填一项</span>
            <span className="counter">{photos.length}/9</span>
          </label>

          <div className="photo-grid">
            {photos.map((photo, index) => (
              <div className="photo-tile" key={photo.id}>
                <BlobImage blob={photo.thumb} alt={`第 ${index + 1} 张照片`} />
                <span className="index">{index + 1}</span>
                <button
                  className="remove"
                  aria-label={`删除第 ${index + 1} 张照片`}
                  onClick={() => setPhotos((prev) => prev.filter((p) => p.id !== photo.id))}
                >
                  ×
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <button
                className="photo-add"
                disabled={busy}
                onClick={() => albumRef.current?.click()}
                aria-label="从相册添加照片"
              >
                {busy ? (
                  <>
                    <span className="plus">·</span>
                    处理中
                  </>
                ) : (
                  <>
                    <span className="plus">＋</span>
                    加照片
                  </>
                )}
              </button>
            )}
          </div>

          <div className="picker-row">
            <button className="btn" onClick={() => cameraRef.current?.click()} disabled={busy}>
              拍照
            </button>
            <button className="btn" onClick={() => albumRef.current?.click()} disabled={busy}>
              从相册选择
            </button>
          </div>
          <div className="hint">单张不超过 10MB；入库时会自动压缩到最长边 1600px 的 JPEG。</div>
        </div>

        <div className="field">
          <label htmlFor="record-note">
            文字 <span className="opt">与照片至少填一项</span>
            <span className="counter">{note.length}/500</span>
          </label>
          <textarea
            id="record-note"
            className="textarea"
            placeholder="今天它有什么变化？新叶、浇水、换盆、光照……"
            value={note}
            maxLength={MAX_NOTE}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="record-height">
            株高 <span className="opt">选填</span>
          </label>
          <input
            id="record-height"
            className="input"
            type="number"
            inputMode="numeric"
            min={0}
            max={999}
            placeholder="厘米，如 63"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
          <div className="hint">只在拼图角标与时间线摘要里显示，暂不做生长曲线。</div>
        </div>
      </div>

      {isEdit && record && (
        <div style={{ marginTop: 4, marginBottom: 22, textAlign: 'center' }}>
          <button className="link-btn danger" onClick={() => onDelete(record)}>
            删除这条记录（{fmtDot(record.date)}）
          </button>
        </div>
      )}

      <div className="toolbar">
        <div className="row">
          <button className="btn ghost" style={{ flex: '0 0 auto' }} onClick={onCancel}>
            放弃
          </button>
          <button className="btn primary grow" disabled={saving || busy} onClick={() => void submit()}>
            {saving ? '保存中…' : isEdit ? '保存修改' : '保存记录'}
          </button>
        </div>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={albumRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </>
  );
}
