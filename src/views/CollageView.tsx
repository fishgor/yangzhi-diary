import { useEffect, useRef, useState } from 'react';
import BlobImage from '../components/BlobImage';
import { renderCollage } from '../collage';
import type { CollageOptions, DiaryRecord, Plant } from '../types';
import { fmtDot } from '../util';

interface Props {
  plant: Plant;
  records: DiaryRecord[];
  onBack: () => void;
  toast: (message: string) => void;
}

interface Result {
  url: string;
  filename: string;
  width: number;
  height: number;
}

const MAX = 9;

export default function CollageView({ plant, records, onBack, toast }: Props) {
  const photoRecords = records.filter((r) => r.photos.length > 0);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [options, setOptions] = useState<CollageOptions>({ showHeader: true, showDate: true, showHeight: false });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  const urlRef = useRef('');
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const selectedRecords = photoRecords.filter((r) => selectedIds.includes(r.id));
  const selectedDates = new Set(selectedRecords.map((r) => r.date));

  const replaceResult = (next: Result | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next?.url ?? '';
    setResult(next);
  };

  const generate = async (nextOptions: CollageOptions = options, nextIds: string[] = selectedIds) => {
    const chosen = photoRecords
      .filter((r) => nextIds.includes(r.id))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    if (chosen.length < 2) {
      toast('至少需要 2 条有照片的记录');
      return;
    }
    setGenerating(true);
    setError('');
    replaceResult(null);
    try {
      const { canvas, filename, height } = await renderCollage(plant.name, chosen, nextOptions);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('导出失败'))), 'image/png');
      });
      if (!aliveRef.current) return;
      replaceResult({ url: URL.createObjectURL(blob), filename, width: canvas.width, height });
      toast('对比图已生成');
    } catch {
      if (!aliveRef.current) return;
      setError('生成失败，请减少照片数量后重试');
    } finally {
      if (aliveRef.current) setGenerating(false);
    }
  };

  const toggle = (record: DiaryRecord) => {
    if (selectedIds.includes(record.id)) {
      setSelectedIds((prev) => prev.filter((id) => id !== record.id));
      replaceResult(null);
      return;
    }
    if (selectedIds.length >= MAX) {
      toast('最多选 9 条记录');
      return;
    }
    if (selectedDates.has(record.date)) {
      toast(`同一天已选 1 条（${fmtDot(record.date)}），每天只能选一条`);
      return;
    }
    setSelectedIds((prev) => [...prev, record.id]);
    replaceResult(null);
  };

  const quickPick = () => {
    const picked: string[] = [];
    const seen = new Set<string>();
    for (const record of photoRecords) {
      if (seen.has(record.date)) continue;
      seen.add(record.date);
      picked.push(record.id);
      if (picked.length === 4) break;
    }
    if (picked.length < 2) {
      toast('有照片的记录不足 2 条');
      return;
    }
    setSelectedIds(picked);
    replaceResult(null);
    toast(`已选最近 ${picked.length} 次`);
  };

  const changeOption = (key: keyof CollageOptions, value: boolean) => {
    const next = { ...options, [key]: value };
    setOptions(next);
    if (selectedIds.length >= 2) void generate(next);
  };

  const download = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast('已开始下载 PNG');
  };

  if (photoRecords.length < 2) {
    return (
      <div className="empty">
        <div className="glyph">◫</div>
        <h3>还拼不出对比图</h3>
        <p>
          {photoRecords.length === 0
            ? '这一株还没有带照片的记录。添加至少 2 条带照片的记录后，就可以把它们拼成一张生长对比。'
            : '只有 1 条带照片的记录。再记录一次带照片的生长状态，就能和这一次对比了。'}
        </p>
        <button className="btn line" onClick={onBack}>
          返回时间线
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="notice">
        <span>
          <b>选 2–9 条带照片的记录</b>，同一天只能选一条，生成时按日期从早到晚排列。
        </span>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="select-list">
        {photoRecords.map((record) => {
          const isSelected = selectedIds.includes(record.id);
          const sameDayTaken = !isSelected && selectedDates.has(record.date);
          return (
            <button
              key={record.id}
              className={`select-item ${isSelected ? 'on' : ''} ${sameDayTaken ? 'off' : ''}`}
              onClick={() => toggle(record)}
              disabled={sameDayTaken}
            >
              <span className="thumb">
                <BlobImage blob={record.photos[0].thumb} alt={`${fmtDot(record.date)} 的照片`} />
              </span>
              <span className="info">
                <span className="date" style={{ display: 'block' }}>
                  {fmtDot(record.date)}
                  {record.heightCm != null && <span className="tl-height"> {record.heightCm}cm</span>}
                </span>
                <span className="sub">
                  {sameDayTaken
                    ? '同一天已选 1 条，只能选一条'
                    : record.note || `${record.photos.length} 张照片`}
                </span>
              </span>
              <span className="check">{isSelected ? '✓' : ''}</span>
            </button>
          );
        })}
      </div>

      <div className="toolbar">
        <div className="toggles">
          <label className="switch">
            <input
              type="checkbox"
              checked={options.showHeader}
              onChange={(e) => changeOption('showHeader', e.target.checked)}
            />
            <span className="track" />
            标题页眉
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={options.showDate}
              onChange={(e) => changeOption('showDate', e.target.checked)}
            />
            <span className="track" />
            日期标签
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={options.showHeight}
              disabled={!options.showDate}
              onChange={(e) => changeOption('showHeight', e.target.checked)}
            />
            <span className="track" />
            株高角标
          </label>
        </div>
        <div className="row">
          <span className="count">
            已选 <b>{selectedIds.length}</b>/9
          </span>
          <button className="btn small ghost" onClick={quickPick}>
            选最近 4 次
          </button>
          <button
            className="btn primary grow small"
            disabled={selectedIds.length < 2 || generating}
            onClick={() => void generate()}
          >
            {generating ? '生成中…' : result ? '重新生成' : '生成对比图'}
          </button>
        </div>
      </div>

      {result && (
        <div className="preview-card">
          <img src={result.url} alt={`${plant.name}的生长对比图`} />
          <div className="preview-meta">
            <span className="filename">{result.filename}</span>
            <span>
              {result.width} × {result.height}
            </span>
          </div>
          <div className="row-2" style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={download}>
              下载 PNG
            </button>
            <a className="btn line" href={result.url} target="_blank" rel="noreferrer">
              打开原图
            </a>
          </div>
          <div className="hint">
            网页版没有相册写入权限：手机上可长按上方图片选择「存储到照片」，或点「下载 PNG」保存到文件。
          </div>
        </div>
      )}
    </>
  );
}
