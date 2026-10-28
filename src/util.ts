import type { DiaryRecord, Plant } from './types';

export function todayISO(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fmtDot(date: string): string {
  return date.replace(/-/g, '.');
}

export function fmtCN(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

export function fmtMonth(date: string): string {
  return date.slice(0, 7);
}

export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

/** 时间线顺序：日期倒序，同日按创建时间倒序 */
export function sortRecordsDesc(list: DiaryRecord[]): DiaryRecord[] {
  return [...list].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
}

export function recordsOfPlant(records: DiaryRecord[], plantId: string): DiaryRecord[] {
  return sortRecordsDesc(records.filter((r) => r.plantId === plantId));
}

export function latestRecord(records: DiaryRecord[], plantId: string): DiaryRecord | undefined {
  return recordsOfPlant(records, plantId)[0];
}

/** 列表排序：无记录的植株置顶，其余按最近记录日期倒序 */
export function sortPlants(plants: Plant[], records: DiaryRecord[]): Plant[] {
  return [...plants].sort((a, b) => {
    const ra = latestRecord(records, a.id);
    const rb = latestRecord(records, b.id);
    if (!ra && !rb) return b.createdAt - a.createdAt;
    if (!ra) return -1;
    if (!rb) return 1;
    if (ra.date !== rb.date) return ra.date < rb.date ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
}

export function groupByMonth(list: DiaryRecord[]): { month: string; items: DiaryRecord[] }[] {
  const groups: { month: string; items: DiaryRecord[] }[] = [];
  for (const record of list) {
    const month = fmtMonth(record.date);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(record);
    else groups.push({ month, items: [record] });
  }
  return groups;
}

export function daysSince(date: string): number {
  const start = new Date(`${date}T00:00:00`).getTime();
  const now = new Date(`${todayISO()}T00:00:00`).getTime();
  return Math.max(0, Math.round((now - start) / 86400000));
}
