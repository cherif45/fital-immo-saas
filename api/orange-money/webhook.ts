import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // Orange Money callback authentication must be implemented against the exact
  // Senegal merchant API contract before this endpoint can mark any rent as paid.
  return res.status(503).json({
    error: 'Confirmation Orange Money désactivée : vérification officielle du callback non configurée.',
  });
}
