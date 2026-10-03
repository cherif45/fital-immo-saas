// ============================================================
// SERVICE — Signatures utilisateur (traçabilité documents)
// ============================================================
import { supabase } from './client';
import { DocumentSignature } from '../../types';

export type DocumentType = 
  | 'payment' 
  | 'invoice' 
  | 'contract' 
  | 'mandate' 
  | 'receipt' 
  | 'bulletin' 
  | 'slip' 
  | 'other';

interface SaveSignatureParams {
  agencyId: string;
  documentType: DocumentType;
  documentId: string;
  userId: string;
  userNom?: string;
  userFonction?: string;
  signatureUrl?: string;
}

/**
 * Enregistre une signature utilisateur sur un document
 */
export async function saveDocumentSignature(
  params: SaveSignatureParams
): Promise<{ success: boolean; data?: DocumentSignature; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase non configuré' };

  try {
    const record = {
      agency_id: params.agencyId,
      document_type: params.documentType,
      document_id: params.documentId,
      user_id: params.userId,
      user_nom: params.userNom,
      user_fonction: params.userFonction,
      signature_url: params.signatureUrl,
    };

    const { data, error } = await supabase
      .from('document_signatures')
      .insert([record])
      .select()
      .single();

    if (error) {
      console.warn('saveDocumentSignature:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: mapSignatureFromDb(data) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Récupère toutes les signatures d'un document
 */
export async function getDocumentSignatures(
  documentType: DocumentType,
  documentId: string
): Promise<DocumentSignature[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('document_signatures')
      .select('*')
      .eq('document_type', documentType)
      .eq('document_id', documentId)
      .order('signed_at', { ascending: true });

    if (error || !data) return [];
    return data.map(mapSignatureFromDb);
  } catch {
    return [];
  }
}

/**
 * Récupère les infos d'un utilisateur (pour affichage signature)
 */
export async function getUserSignatureInfo(
  userId: string
): Promise<{ nom: string; prenom: string; fonction?: string; signatureUrl?: string } | null> {
  if (!supabase || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('nom, prenom, fonction, signature_url')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      nom: data.nom || '',
      prenom: data.prenom || '',
      fonction: data.fonction,
      signatureUrl: data.signature_url,
    };
  } catch {
    return null;
  }
}

/**
 * Met à jour la signature d'un utilisateur
 */
export async function updateUserSignature(
  userId: string,
  signatureUrl: string,
  fonction?: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Non configuré' };

  try {
    const patch: any = { signature_url: signatureUrl };
    if (fonction !== undefined) patch.fonction = fonction;

    const { error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// MAPPER
// ============================================================
function mapSignatureFromDb(r: any): DocumentSignature {
  return {
    id: r.id,
    agencyId: r.agency_id,
    documentType: r.document_type,
    documentId: r.document_id,
    userId: r.user_id,
    userNom: r.user_nom,
    userFonction: r.user_fonction,
    signatureUrl: r.signature_url,
    signedAt: r.signed_at,
    createdAt: r.created_at,
  };
}