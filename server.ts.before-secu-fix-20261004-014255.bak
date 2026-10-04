import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent telemetry
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// API Health
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Resilient Gemini Generator with automatic model fallback for 503 / high demand spikes
async function generateContentWithFallback(ai: GoogleGenAI, config: any) {
  // Use approved models: gemini-3.8-flash (primary), gemini-3.1-flash-lite (fast backup)
  const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const mergedConfig = {
        ...config,
        model,
        config: {
          ...config.config,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      };

      const response = await withTimeout(
        ai.models.generateContent(mergedConfig),
        7000,
        `Timeout on ${model}`
      );

      if (response && response.text) {
        return { response, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini API] Temporary error on ${model} (status: ${err?.status || err?.code}):`, err?.message || err);
      lastError = err;
      // Continue to try the next model on 503 (high demand) or other transient API errors
    }
  }

  throw lastError || new Error("All Gemini models temporarily unavailable");
}

// Smart AI Relance Generator
app.post("/api/gemini/relance", async (req, res) => {
  const {
    locataireNom,
    bienNom,
    montantDu,
    joursRetard,
    niveau,
    canal,
    dateEcheance,
    proprietaireNom,
    penalites,
  } = req.body;

  // Fallback template if Gemini key is not configured or during temporary API spikes (503)
  const fallbackTemplate = () => {
    const formattedAmount = Number(montantDu || 0).toLocaleString('fr-FR') + ' FCFA';
    const formattedPenalites = Number(penalites || 0).toLocaleString('fr-FR') + ' FCFA';

    if (canal === 'WhatsApp') {
      if (niveau?.includes('1') || joursRetard <= 5) {
        return `Bonjour M./Mme *${locataireNom}*,\n\nNous espérons que vous allez bien. Sauf erreur de notre part, nous n'avons pas encore reçu votre règlement de loyer de *${formattedAmount}* pour le bien *${bienNom}* (échéance du ${dateEcheance || '5 du mois'}).\n\nMerci de procéder au versement ou de nous envoyer la preuve de paiement dès que possible. 🏢\n\nCordialement,\n*Service Gestion Locative FITAL-IMMO*`;
      } else if (niveau?.includes('2') || joursRetard <= 15) {
        return `⚠️ *RAPPEL DE LOYER IMPAYÉ*\n\nBonjour M./Mme *${locataireNom}*,\n\nVotre loyer de *${formattedAmount}* pour *${bienNom}* accuse un retard de *${joursRetard} jours*.\n\nNous vous prions de régulariser votre situation sous 48h afin d'éviter l'application des pénalités de retard prévues au bail.\n\nPour tout virement / Wave / Orange Money, merci de notifier la référence du bien.\n\nService Recouvrement FITAL-IMMO`;
      } else {
        return `🚨 *MISE EN DEMEURE AVANT PROCÉDURE*\n\nÀ l'attention de M./Mme *${locataireNom}*,\n\nMalgré nos précédentes relances, votre loyer reste impayé pour un total de *${formattedAmount}* (+ pénalités de *${formattedPenalites}*), soit *${joursRetard} jours de retard* pour le logement *${bienNom}*.\n\nSans règlement intégral sous 72 heures, votre dossier sera transmis à notre service contentieux / huissier pour résiliation de bail et recouvrement forcé.\n\nDirection Juridique FITAL-IMMO`;
      }
    } else if (canal === 'SMS') {
      if (joursRetard <= 5) {
        return `FITAL-IMMO: Bonjour ${locataireNom}, rappel amical pour le loyer de ${bienNom} (${formattedAmount}). Merci de régulariser dès que possible.`;
      } else {
        return `FITAL-IMMO URGENT: M./Mme ${locataireNom}, loyer impaye ${formattedAmount} (${joursRetard}j de retard). Merci de solder sous 48h pour eviter penalites.`;
      }
    } else {
      // Email / Lettre
      return `Objet : ${joursRetard > 15 ? 'MISE EN DEMEURE - ' : ''}Rappel de paiement du loyer - ${bienNom}\n\nMadame, Monsieur ${locataireNom},\n\nNous nous permettons de vous contacter concernant le paiement de votre loyer pour le bien situé à ${bienNom}.\n\nÀ ce jour, nous constatons un arriéré de paiement d'un montant total de ${formattedAmount}${penalites ? ` augmenté des pénalités contractuelles de ${formattedPenalites}` : ''}, accusant un retard de ${joursRetard} jours.\n\nNous vous invitons à bien vouloir régulariser votre situation dans les plus brefs délais par virement, Wave, Orange Money ou chèque.\n\nSi votre règlement a été effectué entre-temps, veuillez ne pas tenir compte de ce courrier.\n\nRestant à votre entière disposition,\n\nBien cordialement,\nLa Gérance Immobilière FITAL-IMMO`;
    }
  };

  try {
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({ message: fallbackTemplate(), generatedBy: 'template' });
    }

    const prompt = `Génère un message de relance de loyer très professionnel, personnalisé et percutant en français.
Détails de la situation :
- Locataire : ${locataireNom}
- Bien loué : ${bienNom}
- Propriétaire représenté : ${proprietaireNom || 'Gérance Immobilière FITAL-IMMO'}
- Montant dû : ${Number(montantDu).toLocaleString('fr-FR')} FCFA
- Pénalités de retard : ${penalites ? Number(penalites).toLocaleString('fr-FR') + ' FCFA' : 'Aucune pour le moment'}
- Nombre de jours de retard : ${joursRetard} jours
- Date d'échéance normale : ${dateEcheance || '5 du mois courant'}
- Niveau de sévérité demandé : ${niveau || 'Adapté au retard'}
- Canal de communication ciblé : ${canal} (WhatsApp avec mise en forme markdown/emojis, SMS court 150 caractères, Email formel avec Objet et Corps, ou Lettre recommandée de mise en demeure juridique avec mentions légales).

Règles :
- Ne génère QUE le texte du message prêt à être envoyé (sans préambule méta).
- Pour WhatsApp : utilise le gras *mot*, les sauts de ligne clairs, les emojis appropriés (🏢, ⚠️, 📅, 💳).
- Pour SMS : reste concis, percutant et sous 160 caractères.
- Pour Email : inclus l'Objet clair en première ligne puis le corps formel.
- Pour Lettre / Mise en demeure : structure formelle avec délais précis (ex: 8 jours francs) et avertissement juridique.`;

    const { response, modelUsed } = await generateContentWithFallback(ai, {
      contents: prompt,
    });

    const generatedText = response.text || fallbackTemplate();
    return res.json({ message: generatedText, generatedBy: modelUsed });
  } catch (error: any) {
    console.warn("Gemini relance notice (reverting to guaranteed template):", error?.message || error);
    // Return the guaranteed fallback template with 200 OK so the user experience never fails
    return res.json({
      message: fallbackTemplate(),
      generatedBy: 'fallback-template',
      notice: 'Modèle de relance appliqué (service IA en pic de charge temporaire).'
    });
  }
});

// AI Financial & Recovery Insights
app.post("/api/gemini/insights", async (req, res) => {
  const { unpaidCount, totalUnpaid, totalCollected, occupancyRate } = req.body;

  const fallbackInsights = () => {
    const defaultAnalysis = `Taux d'occupation de ${occupancyRate || 95}% avec un encaissement actif de ${(totalCollected || 0).toLocaleString('fr-FR')} FCFA. ${unpaidCount || 0} dossiers accusent un retard nécessitant un suivi proactif par relance WhatsApp pour accélérer les règlements avant le 15 du mois.`;
    const defaultActions = [
      "Envoyer une relance groupée par WhatsApp avec lien de paiement Wave aux locataires ayant moins de 10 jours de retard.",
      "Convoquer ou émettre une mise en demeure formelle pour les dossiers à plus de 20 jours d'arriérés.",
      "Consolider les règlements encaissés pour la clôture de caisse et l'édition des quittances certifiées."
    ];
    return { analysis: defaultAnalysis, actionPlan: defaultActions, generatedBy: 'heuristic-engine' };
  };

  try {
    const ai = getGeminiClient();

    if (!ai) {
      return res.json(fallbackInsights());
    }

    const prompt = `Tu es un expert en gestion immobilière et optimisation du recouvrement locatif.
Analyse les métriques actuelles du parc immobilier :
- Total Loyers Encaissés : ${(totalCollected || 0).toLocaleString('fr-FR')} FCFA
- Total Impayés & Arriérés : ${(totalUnpaid || 0).toLocaleString('fr-FR')} FCFA
- Nombre de locataires en retard : ${unpaidCount || 0}
- Taux d'occupation : ${occupancyRate || 95}%

Fournis une analyse synthétique en français (2-3 phrases) et 3 actions prioritaires concrètes pour maximiser le recouvrement ce mois-ci. Réponds au format JSON avec les clés "analysis" (string) et "actionPlan" (array de 3 strings).`;

    const { response, modelUsed } = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    try {
      const data = JSON.parse(response.text || '{}');
      if (data && data.analysis && Array.isArray(data.actionPlan)) {
        return res.json({ ...data, generatedBy: modelUsed });
      }
      return res.json(fallbackInsights());
    } catch {
      return res.json(fallbackInsights());
    }
  } catch (error: any) {
    console.warn("Gemini insights notice (using heuristic fallback):", error?.message || error);
    return res.json(fallbackInsights());
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
