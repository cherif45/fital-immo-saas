// ============================================================
// SUPABASE STORAGE — Upload des assets agence
// ============================================================
import { supabase } from './client';

export type AgencyAssetType = 
  | 'logo' 
  | 'cachet' 
  | 'signature' 
  | 'entete' 
  | 'pied_page';

const BUCKET_NAME = 'agency-assets';

/**
 * Upload un asset d'agence vers Supabase Storage
 * Retourne l'URL publique du fichier
 */
export async function uploadAgencyAsset(
  agencyId: string,
  type: AgencyAssetType,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: 'Supabase non configuré' };

  try {
    const ext = file.name.split('.').pop() || 'png';
    const timestamp = Date.now();
    const path = `${agencyId}/${type}-${timestamp}.${ext}`;

    // Upload
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('uploadAgencyAsset:', uploadError);
      return { url: null, error: uploadError.message };
    }

    // Récupérer l'URL publique
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path);

    return { url: urlData.publicUrl, error: null };
  } catch (e: any) {
    console.error('uploadAgencyAsset exception:', e);
    return { url: null, error: e.message || 'Erreur inconnue' };
  }
}

/**
 * Supprime un asset d'agence
 */
export async function deleteAgencyAsset(
  url: string
): Promise<{ success: boolean; error: string | null }> {
  if (!supabase) return { success: false, error: 'Supabase non configuré' };

  try {
    // Extraire le path depuis l'URL publique
    const match = url.match(/agency-assets\/(.+)$/);
    if (!match) return { success: false, error: 'URL invalide' };

    const path = match[1];
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Compresse une image avant upload (côté client)
 * Retourne un Blob compressé
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.85
): Promise<File> {
  return new Promise((resolve) => {
    // Si ce n'est pas une image, retour direct
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Redimensionner si trop large
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}