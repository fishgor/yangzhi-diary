import type { Photo } from './types';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;
const THUMB_EDGE = 320;
const THUMB_QUALITY = 0.8;

export class ImageError extends Error {}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new ImageError('图片转码失败'))), 'image/jpeg', quality);
  });
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* 回退到 <img> 解码 */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new ImageError('图片无法读取，可能已损坏'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawCover(ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number, w: number, h: number) {
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** 压缩用户选择的图片：最长边 ≤1600，JPEG 0.85；同时生成 320 方形缩略图 */
export async function compressPhoto(file: File): Promise<Photo> {
  if (file.size > MAX_FILE_BYTES) {
    throw new ImageError('图片过大（超过 10MB），请换一张或先裁剪');
  }
  const src = await decode(file);
  const sw = src.width;
  const sh = src.height;
  if (!sw || !sh) throw new ImageError('图片无法读取，可能已损坏');

  const scale = Math.min(1, MAX_EDGE / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageError('当前设备不支持图片处理');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, w, h);
  if (typeof (src as ImageBitmap).close === 'function') (src as ImageBitmap).close();
  const blob = await canvasToBlob(canvas, JPEG_QUALITY);

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = THUMB_EDGE;
  thumbCanvas.height = THUMB_EDGE;
  const tctx = thumbCanvas.getContext('2d');
  if (!tctx) throw new ImageError('当前设备不支持图片处理');
  tctx.fillStyle = '#eef2ea';
  tctx.fillRect(0, 0, THUMB_EDGE, THUMB_EDGE);
  drawCover(tctx, canvas, w, h, THUMB_EDGE, THUMB_EDGE);
  const thumb = await canvasToBlob(thumbCanvas, THUMB_QUALITY);

  return {
    id: `ph_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`,
    blob,
    thumb,
    w,
    h,
  };
}

/** Canvas 图片导出为 Blob（用于示例数据） */
export async function canvasPhoto(canvas: HTMLCanvasElement): Promise<Photo> {
  const blob = await canvasToBlob(canvas, JPEG_QUALITY);
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = THUMB_EDGE;
  thumbCanvas.height = THUMB_EDGE;
  const ctx = thumbCanvas.getContext('2d')!;
  ctx.fillStyle = '#eef2ea';
  ctx.fillRect(0, 0, THUMB_EDGE, THUMB_EDGE);
  drawCover(ctx, canvas, canvas.width, canvas.height, THUMB_EDGE, THUMB_EDGE);
  const thumb = await canvasToBlob(thumbCanvas, THUMB_QUALITY);
  return {
    id: `ph_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`,
    blob,
    thumb,
    w: canvas.width,
    h: canvas.height,
  };
}
