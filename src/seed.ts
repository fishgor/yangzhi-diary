import { canvasPhoto } from './image';
import type { DiaryRecord, Photo, Plant } from './types';
import { newId, todayISO } from './util';

function mulberry(seed: number) {
  let a = seed % 2147483647;
  if (a <= 0) a += 2147483646;
  return () => {
    a = (a * 16807) % 2147483647;
    return (a - 1) / 2147483646;
  };
}

/** 生成一张植物示意图，作为示例数据与「无相机权限」时的占位素材 */
export function makeIllustration(seed: number, size = 900): HTMLCanvasElement {
  const w = size;
  const h = size;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const rand = mulberry(seed * 977 + 13);
  const hue = 96 + Math.floor(rand() * 52);

  const bg = ctx.createLinearGradient(0, 0, w * 0.4, h);
  bg.addColorStop(0, `hsl(${hue},22%,94%)`);
  bg.addColorStop(1, `hsl(${hue},16%,79%)`);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const lx = w * (0.55 + rand() * 0.25);
  const light = ctx.createLinearGradient(lx, 0, lx + w * 0.22, h);
  light.addColorStop(0, 'rgba(255,255,255,.42)');
  light.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = light;
  ctx.fillRect(lx, 0, w * 0.28, h);

  const cx = w * 0.5;
  const baseY = h * 0.9;
  const potW = w * (0.24 + rand() * 0.06);
  const potH = h * 0.19;
  ctx.fillStyle = '#bf8468';
  ctx.beginPath();
  ctx.moveTo(cx - potW / 2, baseY - potH);
  ctx.lineTo(cx + potW / 2, baseY - potH);
  ctx.lineTo(cx + potW * 0.42, baseY);
  ctx.lineTo(cx - potW * 0.42, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.fillRect(cx - potW / 2, baseY - potH, potW, potH * 0.18);

  const soilY = baseY - potH;
  ctx.fillStyle = `hsl(${hue},14%,32%)`;
  ctx.beginPath();
  ctx.ellipse(cx, soilY, potW / 2, potH * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  const leafCount = 5 + Math.floor(rand() * 5);
  for (let i = 0; i < leafCount; i += 1) {
    const angle = -Math.PI / 2 + (rand() - 0.5) * 2.1;
    const len = h * (0.2 + rand() * 0.24);
    const sx = cx + (rand() - 0.5) * potW * 0.4;
    const sy = soilY - rand() * h * 0.05;
    const ex = sx + Math.cos(angle) * len;
    const ey = sy + Math.sin(angle) * len;

    ctx.strokeStyle = `hsl(${hue + 6},26%,34%)`;
    ctx.lineWidth = Math.max(1.4, w * 0.005);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + Math.cos(angle) * len * 0.5 + 8, sy + Math.sin(angle) * len * 0.5 - 10, ex, ey);
    ctx.stroke();

    const lw = len * (0.42 + rand() * 0.16);
    const lh = len * (0.24 + rand() * 0.12);
    const leaf = ctx.createLinearGradient(ex - lw, ey - lh, ex + lw, ey + lh);
    leaf.addColorStop(0, `hsl(${hue},38%,${36 + rand() * 10}%)`);
    leaf.addColorStop(1, `hsl(${hue + 14},42%,${24 + rand() * 8}%)`);
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(angle + Math.PI / 2 + (rand() - 0.5) * 0.8);
    ctx.fillStyle = leaf;
    ctx.beginPath();
    ctx.ellipse(0, -lh * 0.2, lw, lh, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.2, w * 0.5, h * 0.5, w * 0.78);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(20,32,24,.16)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  return canvas;
}

function daysAgo(days: number): string {
  const d = new Date(`${todayISO()}T00:00:00`);
  d.setDate(d.getDate() - days);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

interface SeedRecord {
  offset: number;
  note: string;
  height: number;
  seed: number;
}

interface SeedPlant {
  name: string;
  species?: string;
  place?: string;
  acquiredDaysAgo?: number;
  photoSeed: number;
  records: SeedRecord[];
}

const SEED_PLANTS: SeedPlant[] = [
  {
    name: '龟背竹',
    species: 'Monstera deliciosa',
    place: '客厅',
    acquiredDaysAgo: 128,
    photoSeed: 7,
    records: [
      { offset: 124, note: '刚到家，三片叶，根还没满盆。先放在北窗散光处缓苗。', height: 22, seed: 3 },
      { offset: 96, note: '第一片新叶开始展，叶缘还没开背。土干得挺快，五天浇一次。', height: 30, seed: 11 },
      { offset: 68, note: '换了大一号的盆，加了水苔柱。老叶开始发亮。', height: 38, seed: 21 },
      { offset: 41, note: '新叶开背了，两个孔。移到东窗，早晨有直射光。', height: 47, seed: 29 },
      { offset: 17, note: '第二片新叶，叶片明显比上一片大。', height: 55, seed: 37 },
      { offset: 2, note: '气根长出来抓住了苔柱，整株立起来了。', height: 63, seed: 45 },
    ],
  },
  {
    name: '琴叶榕',
    species: 'Ficus lyrata',
    place: '南阳台',
    acquiredDaysAgo: 96,
    photoSeed: 19,
    records: [
      { offset: 92, note: '入手时只有 60cm，底部有两片叶子发黄，剪掉了。', height: 60, seed: 5 },
      { offset: 62, note: '顶端冒了一个新芽，把花盆每周转 90 度，避免长歪。', height: 64, seed: 17 },
      { offset: 31, note: '新叶展开，比旧叶大一圈。叶面用湿布擦了一次。', height: 71, seed: 33 },
      { offset: 8, note: '秋天光照变短，移到阳台最里侧，避开冷风。', height: 75, seed: 49 },
    ],
  },
  {
    name: '多肉拼盘',
    place: '书房',
    acquiredDaysAgo: 70,
    photoSeed: 31,
    records: [
      { offset: 66, note: '五棵拼一盆，颗粒土。刚上盆不浇水，放散光处一周。', height: 8, seed: 9 },
      { offset: 37, note: '第一次浸盆，叶片饱满了一些，中心的粉还完整。', height: 10, seed: 23 },
      { offset: 9, note: '晒了几天太阳，虹之玉开始泛红，移到窗边。', height: 12, seed: 41 },
    ],
  },
];

export async function buildSeedData(): Promise<{ plants: Plant[]; records: DiaryRecord[] }> {
  const plants: Plant[] = [];
  const records: DiaryRecord[] = [];

  for (const item of SEED_PLANTS) {
    const plant: Plant = {
      id: newId('p'),
      name: item.name,
      species: item.species,
      place: item.place,
      acquiredAt: item.acquiredDaysAgo != null ? daysAgo(item.acquiredDaysAgo) : undefined,
      createdAt: Date.now() - (item.acquiredDaysAgo ?? 0) * 86400000,
    };
    plants.push(plant);

    for (let i = 0; i < item.records.length; i += 1) {
      const entry = item.records[i];
      const photo: Photo = await canvasPhoto(makeIllustration(entry.seed + item.photoSeed, 900));
      records.push({
        id: newId('r'),
        plantId: plant.id,
        date: daysAgo(entry.offset),
        note: entry.note,
        heightCm: entry.height,
        photos: [photo],
        createdAt: plant.createdAt + entry.offset * 86400000 + i * 60000,
      });
    }
  }

  return { plants, records };
}
