import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  return res.status(503).json({
    error: 'Orange Money est désactivé : le connecteur marchand officiel pour le Sénégal doit être validé avant toute transaction réelle.',
  });
}
