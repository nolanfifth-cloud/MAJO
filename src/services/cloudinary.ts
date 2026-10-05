const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = Boolean(cloudName && uploadPreset);
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

export async function uploadPhotoToCloudinary(file: File): Promise<string> {
  if (!isCloudinaryConfigured) throw new Error('Cloudinary belum dikonfigurasi.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Format foto harus JPEG, PNG, atau WebP.');
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error('Ukuran foto maksimal 10 MB.');
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'majo/inspection-reports');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Upload foto ke Cloudinary gagal.');
  const result = (await response.json()) as { secure_url: string };
  if (!result.secure_url?.startsWith('https://')) throw new Error('Cloudinary mengembalikan URL foto yang tidak valid.');
  return result.secure_url;
}
