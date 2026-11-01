import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
getAgencySettings,
savePaymentTransaction,
checkDuplicatePayment,
PaymentAlreadyExistsError,
requireAgencyUser,
} from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

if (req.method === 'OPTIONS') return res.status(200).end();
if (req.method !== 'POST') {
return res.status(405).json({ error: 'Method not allowed' });
}

try {
const {
amount,
currency,
clientReference,
successUrl,
errorUrl,
agencyId,
locataireId,
locataireNom,
locataireTelephone,
periode,
} = req.body || {};

if (!amount || !agencyId || !locataireId || !periode) {
return res.status(400).json({ error: 'Paramètres manquants.' });
}

await requireAgencyUser(req, agencyId, locataireId);

const normalizedAmount = Math.round(Number(amount));

if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
return res.status(400).json({ error: 'Montant invalide.' });
}

if (!successUrl || !errorUrl) {
return res.status(400).json({
error: 'Les URL de succès et d’annulation sont obligatoires.',
});
}

const isDuplicate = await checkDuplicatePayment(
agencyId,
locataireId,
periode,
);

if (isDuplicate) {
return res.status(409).json({
error: 'Un paiement est déjà en cours ou enregistré pour cette période.',
});
}

const settings = await getAgencySettings(agencyId);

if (!settings.wave_api_key) {
return res.status(400).json({
error: 'Wave n’est pas configuré pour cette agence.',
});
}

const waveResponse = await fetch(
'https://api.wave.com/v1/checkout/sessions',
{
method: 'POST',
headers: {
Authorization: `Bearer ${settings.wave_api_key}`,
'Content-Type': 'application/json',
},
body: JSON.stringify({
amount: String(normalizedAmount),
currency: currency || 'XOF',
client_reference: clientReference || undefined,
success_url: successUrl,
error_url: errorUrl,
}),
},
);

const waveData = await waveResponse.json();

if (!waveResponse.ok) {
console.error('Réponse API Wave:', waveData);
return res.status(waveResponse.status).json({
error: waveData.message || 'Erreur Wave lors de la création de la session.',
});
}

if (!waveData.id || !waveData.wave_launch_url) {
console.error('Réponse Wave incomplète:', waveData);
return res.status(502).json({
error: 'Wave n’a pas retourné les informations de paiement attendues.',
});
}

const tx = await savePaymentTransaction({
agency_id: agencyId,
locataire_id: locataireId,
periode,
montant: normalizedAmount,
provider: 'WAVE',
provider_transaction_id: waveData.id,
status: 'pending',
checkout_url: waveData.wave_launch_url,
metadata: {
client_reference: clientReference || null,
locataire_nom: locataireNom || null,
locataire_telephone: locataireTelephone || null,
},
});

return res.status(200).json({
success: true,
checkoutUrl: waveData.wave_launch_url,
transactionId: tx.id,
waveId: waveData.id,
});
} catch (err: any) {
console.error('Erreur Wave create-session:', err);

const statusCode =
err.statusCode ||
(err instanceof PaymentAlreadyExistsError ? 409 : 500);

return res.status(statusCode).json({
error: err.message || 'Erreur serveur.',
});
}
}

