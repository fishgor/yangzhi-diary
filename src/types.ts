export interface Photo {
  id: string;
  /** 压缩后的 JPEG 原图（最长边 ≤1600） */
  blob: Blob;
  /** 列表/时间线用缩略图（约 320px 方形裁切） */
  thumb: Blob;
  w: number;
  h: number;
}

export interface Plant {
  id: string;
  name: string;
  species?: string;
  place?: string;
  acquiredAt?: string;
  createdAt: number;
}

export interface DiaryRecord {
  id: string;
  plantId: string;
  /** YYYY-MM-DD */
  date: string;
  note: string;
  heightCm?: number;
  photos: Photo[];
  createdAt: number;
}

export interface CollageOptions {
  showHeader: boolean;
  showDate: boolean;
  showHeight: boolean;
}
