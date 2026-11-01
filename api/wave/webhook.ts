import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import {
getAgencySettings,
updatePaymentTransaction,
createPaymentFromWebhook,
supabaseAdmin,
} from '../_lib/supabaseAdmin.js';

// Important : conserver le corps HTTP brut pour vérifier la signature Wave.
export const config = {
api: {
bodyParser: false,
},
};

async function readRawBody(req: VercelRequest): Promise<Buffer> {
const chunks: Buffer[] = [];

for await (const chunk of req) {
chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
}

return Buffer.concat(chunks);
}

function verifyWaveSignature(
rawBody: Buffer,
signatureHeader: string,
secret: string,
): boolean {
const parts = signatureHeader.split(',').map((part) => part.trim());
const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
const signatures = parts
.filter((part) => part.startsWith('v1='))
.map((part) => part.slice(3));

if (!timestamp || signatures.length === 0 || !/^\d+$/.test(timestamp)) {
return false;
}

const timestampSeconds = Number(timestamp);
const nowSeconds = Math.floor(Date.now() / 1000);

// Wave recommande : maximum 5 minutes dans le passé et 30 secondes dans le futur.
if (
!Number.isSafeInteger(timestampSeconds) ||
timestampSeconds < nowSeconds - 300 ||
timestampSeconds > nowSeconds + 30
) {
return false;
}

const expected = crypto
.createHmac('sha256', secret)
.update(timestamp + rawBody.toString('utf8'))
.digest();

return signatures.some((signature) => {
if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

const received = Buffer.from(signature, 'hex');

return (
received.length === expected.length &&
crypto.timingSafeEqual(expected, received)
);
});
}

export default async function handler(
req: VercelRequest,
res: VercelResponse,
) {
if (req.method !== 'POST') {
return res.status(405).json({ error: 'Method not allowed' });
}

try {
const rawBody = await readRawBody(req);
const signatureHeader = req.headers['wave-signature'];
const signature = Array.isArray(signatureHeader)
? signatureHeader[0]
: signatureHeader;

if (!signature) {
return res.status(401).json({ error: 'Signature Wave manquante.' });
}

let event: any;

try {
event = JSON.parse(rawBody.toString('utf8'));
} catch {
return res.status(400).json({ error: 'Corps JSON invalide.' });
}

const waveSessionId = event.data?.id;

if (!waveSessionId) {
return res.status(400).json({ error: 'Identifiant de session Wave manquant.' });
}

// La session Wave enregistrée permet de retrouver l'agence.
const { data: existingTx, error: transactionError } = await supabaseAdmin
.from('payment_transactions')
.select('id, agency_id, locataire_id, periode, montant, provider')
.eq('provider_transaction_id', waveSessionId)
.eq('provider', 'WAVE')
.maybeSingle();

if (transactionError) {
throw new Error(`Recherche transaction Wave : ${transactionError.message}`);
}

if (!existingTx) {
return res.status(404).json({ error: 'Transaction Wave inconnue.' });
}

const settings = await getAgencySettings(existingTx.agency_id);
const webhookSecret = settings.wave_webhook_secret;

if (!webhookSecret) {
return res.status(503).json({
error: 'Secret de signature Wave non configuré pour cette agence.',
});
}

if (!verifyWaveSignature(rawBody, signature, webhookSecret)) {
return res.status(401).json({ error: 'Signature Wave invalide ou expirée.' });
}

const amount = Number(event.data?.amount);
const expectedAmount = Number(existingTx.montant);

if (
!Number.isFinite(amount) ||
amount <= 0 ||
Math.round(amount) !== Math.round(expectedAmount)
) {
return res.status(400).json({
error: 'Le montant du webhook ne correspond pas à la transaction.',
});
}

const isSuccess =
event.type === 'checkout.session.completed' &&
(
event.data?.payment_status === 'succeeded' ||
event.data?.checkout_status === 'complete'
);

// Ne pas modifier la transaction pour les événements non confirmés.
if (!isSuccess) {
return res.status(200).json({ received: true, processed: false });
}

if (!existingTx.locataire_id || !existingTx.periode) {
return res.status(400).json({
error: 'Informations locataire ou période manquantes dans la transaction.',
});
}

await createPaymentFromWebhook(
existingTx.agency_id,
existingTx.locataire_id,
expectedAmount,
existingTx.periode,
'WAVE',
waveSessionId,
);

await updatePaymentTransaction(existingTx.id, {
status: 'success',
});

return res.status(200).json({ received: true, processed: true });
} catch (err: any) {
console.error('Erreur Wave webhook:', err);
return res.status(500).json({ error: 'Erreur interne lors du traitement du webhook Wave.' });
}
}

