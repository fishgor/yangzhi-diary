import type { CollageOptions, DiaryRecord } from './types';
import { fmtDot } from './util';

const WIDTH = 1080;
const PAD = 44;
const GAP = 18;
const HEADER_H = 132;
const LABEL_H = 62;

export interface CollageResult {
  canvas: HTMLCanvasElement;
  filename: string;
  height: number;
}

function columnsFor(count: number): number {
  if (count === 2) return 2;
  if (count === 3) return 3;
  if (count === 4) return 2;
  return 3;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  src: ImageBitmap,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / src.width, h / src.height);
  const dw = src.width * scale;
  const dh = src.height * scale;
  ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

async function loadBitmap(blob: Blob): Promise<ImageBitmap> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      /* 回退 */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('图片读取失败'));
      el.src = url;
    });
    return await createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 生成拼图：records 需已按日期升序排列，且每条都有照片 */
export async function renderCollage(
  plantName: string,
  records: DiaryRecord[],
  options: CollageOptions,
): Promise<CollageResult> {
  const bitmaps = await Promise.all(records.map((r) => loadBitmap(r.photos[0].blob)));

  const count = records.length;
  const cols = columnsFor(count);
  const rows = Math.ceil(count / cols);
  const headerH = options.showHeader ? HEADER_H : 0;
  const labelH = options.showDate ? LABEL_H : 0;
  const cellW = Math.floor((WIDTH - PAD * 2 - GAP * (cols - 1)) / cols);
  const cellH = cellW + labelH;
  const height = PAD * 2 + headerH + rows * cellH + GAP * (rows - 1);

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('当前设备不支持绘图');

  ctx.fillStyle = '#f6f8f4';
  ctx.fillRect(0, 0, WIDTH, height);

  if (options.showHeader) {
    ctx.fillStyle = '#1c2a22';
    ctx.font = '600 46px "Songti SC","PingFang SC","Microsoft YaHei",Georgia,serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${plantName} · 生长对比`, PAD, PAD + 52);

    const first = records[0].date;
    const last = records[count - 1].date;
    ctx.fillStyle = '#65756b';
    ctx.font = '400 27px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(`${fmtDot(first)}  —  ${fmtDot(last)}    共 ${count} 次记录`, PAD, PAD + 98);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#9aa89f';
    ctx.font = '400 22px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText('养植日记', WIDTH - PAD, PAD + 52);
    ctx.textAlign = 'left';
  }

  const top = PAD + headerH;
  records.forEach((record, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = PAD + col * (cellW + GAP);
    const y = top + row * (cellH + GAP);
    const bitmap = bitmaps[index];

    ctx.save();
    roundRect(ctx, x, y, cellW, cellH, 16);
    ctx.clip();
    ctx.fillStyle = '#e6ece2';
    ctx.fillRect(x, y, cellW, cellH);
    drawCover(ctx, bitmap, x, y, cellW, cellW);

    if (options.showDate) {
      ctx.fillStyle = 'rgba(14,24,18,.62)';
      ctx.fillRect(x, y + cellW, cellW, labelH);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 28px ui-monospace,Menlo,Consolas,monospace';
      ctx.textBaseline = 'middle';
      ctx.fillText(fmtDot(record.date), x + 20, y + cellW + labelH / 2);

      if (options.showHeight && record.heightCm) {
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,.86)';
        ctx.font = '500 24px "PingFang SC",sans-serif';
        ctx.fillText(`${record.heightCm}cm`, x + cellW - 20, y + cellW + labelH / 2);
        ctx.textAlign = 'left';
      }
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
    bitmap.close();
  });

  const first = records[0].date.replace(/-/g, '');
  const last = records[count - 1].date.replace(/-/g, '');
  return {
    canvas,
    height,
    filename: `${plantName}_生长对比_${first}-${last}.png`,
  };
}
