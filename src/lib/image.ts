export interface CompressedImageResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

/**
 * ضغط وتغيير أبعاد الصورة في المتصفح باستخدام HTML Canvas
 * الحد الأقصى للبعد الأكبر 1600px وبجودة JPEG 0.80
 */
export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.8,
): Promise<CompressedImageResult> {
  const originalSize = file.size;

  if (file.type === 'image/svg+xml') {
    return { file, originalSize, compressedSize: file.size, width: 0, height: 0 };
  }

  const image = await loadImage(file);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
  const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      file,
      originalSize,
      compressedSize: file.size,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });

  if (!blob) {
    return {
      file,
      originalSize,
      compressedSize: file.size,
      width: targetWidth,
      height: targetHeight,
    };
  }

  if (scale === 1 && blob.size >= originalSize) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      width: targetWidth,
      height: targetHeight,
    };
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  const compressedFile = new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  return {
    file: compressedFile,
    originalSize,
    compressedSize: compressedFile.size,
    width: targetWidth,
    height: targetHeight,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر قراءة الصورة المختارة'));
    };
    img.src = objectUrl;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('تعذر تحويل الصورة'));
    reader.readAsDataURL(file);
  });
}
