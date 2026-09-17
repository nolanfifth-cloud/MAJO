const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export const isCloudinaryConfigured = Boolean(cloudName && uploadPreset);

export async function uploadPhotoToCloudinary(file: File): Promise<string> {
  if (!isCloudinaryConfigured) throw new Error('Cloudinary belum dikonfigurasi.');
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
  return result.secure_url;
}
