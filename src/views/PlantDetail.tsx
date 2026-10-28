import BlobImage from '../components/BlobImage';
import type { DiaryRecord, Plant } from '../types';
import { daysSince, fmtCN, fmtDot, groupByMonth } from '../util';

interface Props {
  plant: Plant;
  records: DiaryRecord[];
  onAddRecord: () => void;
  onOpenRecord: (recordId: string) => void;
  onCollage: () => void;
}

export default function PlantDetail({ plant, records, onAddRecord, onOpenRecord, onCollage }: Props) {
  const groups = groupByMonth(records);
  const photoRecords = records.filter((r) => r.photos.length > 0);
  const latest = records[0];
  const days = plant.acquiredAt ? daysSince(plant.acquiredAt) : null;
  const meta = [plant.species, plant.place, plant.acquiredAt ? `入手 ${fmtDot(plant.acquiredAt)}` : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <section className="hero">
        <h1>{plant.name}</h1>
        <div className="meta">{meta || '还没有填写品种与位置，可以点右上角「编辑」补上'}</div>
        <div className="stats">
          <div className="stat">
            <b>{records.length}</b>
            <span>条记录</span>
          </div>
          <div className="stat">
            <b>{photoRecords.length}</b>
            <span>次带图</span>
          </div>
          <div className="stat">
            <b>{latest ? fmtCN(latest.date) : '—'}</b>
            <span>{days != null ? `已陪伴 ${days} 天` : '最近记录'}</span>
          </div>
        </div>
      </section>

      <div className="hero-actions">
        <button className="btn primary grow" onClick={onAddRecord}>
          添加记录
        </button>
        <button className="btn line grow" disabled={photoRecords.length < 2} onClick={onCollage}>
          {photoRecords.length < 2 ? '照片不足 2 次' : '对比生长'}
        </button>
      </div>

      {records.length === 0 ? (
        <div className="empty">
          <h3>这一株还没有记录</h3>
          <p>拍下今天的状态，写上两句，它就成为时间线上的第一天。之后每次记录都能和今天对比。</p>
          <button className="btn line" onClick={onAddRecord}>
            添加第一条记录
          </button>
        </div>
      ) : (
        <div className="timeline">
          {groups.map((group) => (
            <div key={group.month}>
              <div className="month-label">{group.month}</div>
              {group.items.map((record) => {
                const cover = record.photos[0]?.thumb;
                const extra = record.photos.length - 1;
                return (
                  <button key={record.id} className="tl-item" onClick={() => onOpenRecord(record.id)}>
                    <span className="tl-thumb">
                      {cover ? (
                        <BlobImage blob={cover} alt={`${fmtDot(record.date)} 的照片`} />
                      ) : (
                        <span className="nophoto">无照片</span>
                      )}
                      {extra > 0 && <span className="more">+{extra}</span>}
                    </span>
                    <span className="tl-body">
                      <span className="tl-date">
                        {fmtCN(record.date)}
                        {record.heightCm != null && <span className="tl-height">{record.heightCm}cm</span>}
                      </span>
                      <span className={`tl-note${record.note ? '' : ' muted'}`}>
                        {record.note || '只记录了照片'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
