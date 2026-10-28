import { useEffect, useState } from 'react';

interface Props {
  blob: Blob;
  alt: string;
  className?: string;
}

/** 把 Blob 渲染为 <img>，并在卸载时释放 objectURL */
export default function BlobImage({ blob, alt, className }: Props) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);

  if (!url) return null;
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}
