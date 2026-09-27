# FITAL-IMMO — Architecture Technique

## 🏗️ VUE D'ENSEMBLE

```
┌─────────────────────────────────────────────────────────────┐
│                     UTILISATEURS                            │
│    (Admin, Gestionnaire, Caissier, Propriétaire, Locataire) │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  VERCEL (Hébergement)                       │
│                                                             │
│  ┌───────────────────────┐    ┌─────────────────────────┐  │
│  │  Frontend React/Vite  │    │   API Routes (Serverless)│  │
│  │  - Pages              │    │   - /api/wave/*          │  │
│  │  - Modals             │    │   - /api/orange-money/*  │  │
│  │  - Hooks              │    │   - /api/paydunya/*      │  │
│  └──────────┬────────────┘    └──────────┬──────────────┘  │
└─────────────┼────────────────────────────┼─────────────────┘
              │                            │
              ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                SUPABASE (Backend as a Service)              │
│                                                             │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │  PostgreSQL   │  │  Auth        │  │  Storage        │  │
│  │  - 30+ tables │  │  - JWT       │  │  - Logos        │  │
│  │  - RLS        │  │  - Sessions  │  │  - Docs         │  │
│  └───────────────┘  └──────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────┘
              │                            │
              ▼                            ▼
┌─────────────────────────┐  ┌──────────────────────────────┐
│  Wave Business API      │  │  PayDunya / Orange Money API │
│  - Checkout             │  │  - Checkout                  │
│  - Webhooks             │  │  - Webhooks                  │
└─────────────────────────┘  └──────────────────────────────┘
```

---

## 📦 STACK TECHNIQUE

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Frontend** | React | 18.x |
| **Build** | Vite | 6.x |
| **Langage** | TypeScript | 5.x |
| **UI** | Tailwind CSS | 3.x |
| **Icônes** | Lucide React | Latest |
| **Base de données** | Supabase (PostgreSQL) | 15+ |
| **Auth** | Supabase Auth | JWT |
| **Hébergement** | Vercel | Serverless |
| **PWA** | Manifest + Service Worker | - |

---

## 📁 STRUCTURE DES DOSSIERS

```
fital-immo/
├── api/                          ← API Routes Vercel (serverless)
│   ├── _lib/
│   │   └── supabaseAdmin.ts      ← Client Supabase avec service_role
│   ├── cron/                     ← Tâches planifiées
│   ├── wave/
│   │   ├── create-session.ts
│   │   └── webhook.ts
│   ├── orange-money/
│   │   ├── create-session.ts
│   │   └── webhook.ts
│   └── paydunya/
│       ├── create-session.ts
│       └── webhook.ts
│
├── public/                       ← Fichiers statiques
│   ├── icons/                    ← Icônes PWA (PNG)
│   ├── docs/                     ← Guides HTML
│   ├── favicon.svg
│   └── manifest.json
│
├── src/
│   ├── components/               ← Composants React
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── DashboardView.tsx
│   │   ├── PaymentsView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── SuperAdminDashboard.tsx
│   │   └── ... (50+ composants)
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         ← Client Supabase (anon key)
│   │   │   └── service.ts        ← CRUD + mappers
│   │   ├── payments/
│   │   │   ├── index.ts
│   │   │   ├── paymentRouter.ts  ← Routeur intelligent
│   │   │   ├── waveService.ts
│   │   │   ├── orangeMoneyService.ts
│   │   │   └── paydunyaService.ts
│   │   ├── calculations/
│   │   │   └── financial.ts      ← TOM, TVA, TLV, formatage
│   │   ├── comms/
│   │   │   └── commsHelper.ts    ← WhatsApp, SMS
│   │   └── utils.ts
│   │
│   ├── data/
│   │   └── mockData.ts           ← Données par défaut
│   │
│   ├── types.ts                  ← Types TypeScript
│   ├── App.tsx                   ← Composant racine
│   └── main.tsx                  ← Point d'entrée
│
├── docs-dev/                     ← Documentation développeur
├── docs-guides/                  ← Guides utilisateur
├── supabase/                     ← Migrations SQL
│   └── migrations/
│
├── .env.local                    ← Variables locales
├── package.json
├── tsconfig.json
├── vercel.json                   ← Config Vercel
└── vite.config.ts
```

---

## 🔐 AUTHENTIFICATION & RÔLES

### Rôles disponibles

| Rôle | Code | Accès |
|------|------|-------|
| Super Admin SaaS | `SUPER_ADMIN_SAAS` | Toutes les agences |
| Super Admin Agence | `SUPER_ADMIN` | Tout dans SON agence |
| Admin | `ADMIN` | Tout dans SON agence |
| Gestionnaire | `GESTIONNAIRE` | Biens, locataires, contrats, recouvrement |
| Caissier | `CAISSIER` | Encaissements, caisse, quittances |
| Propriétaire | `PROPRIETAIRE` | Ses biens, ses reversements (lecture seule) |
| Locataire | `LOCATAIRE` | Ses paiements, signalement pannes |
| Agent | `AGENT` | États des lieux, relances terrain |

### Fonctions helper (PostgreSQL)

```sql
-- Retourne l'agency_id de l'utilisateur connecté
current_user_agency_id() → UUID

-- L'utilisateur est-il SUPER_ADMIN_SAAS ?
current_user_is_saas_admin() → BOOLEAN
```

### Row Level Security (RLS)

**Principe** : Chaque table a des politiques RLS qui filtrent automatiquement par `agency_id`.

```sql
-- Exemple sur tenants
CREATE POLICY "tenants_select_own" ON tenants FOR SELECT
  USING (
    current_user_is_saas_admin() = TRUE
    OR (current_user_agency_id() IS NOT NULL AND agency_id = current_user_agency_id())
  );
```

**→ Un Admin FITAL ne voit QUE les locataires de FITAL. Un SaaS Admin voit TOUT.**

---

## 💾 BASE DE DONNÉES

### Tables principales (30+)

| Table | Rôle |
|-------|------|
| `agencies` | Les agences (multi-tenant) |
| `agency_settings` | Paramètres + clés API par agence |
| `profiles` | Utilisateurs |
| `owners` | Propriétaires |
| `buildings` | Immeubles |
| `units` | Espaces louables |
| `properties` | Biens anciens |
| `tenants` | Locataires |
| `contracts` | Contrats de bail |
| `payments` | Paiements + quittances |
| `payment_transactions` | Sessions de paiement (anti-doublon) |
| `cash_movements` | Mouvements de caisse |
| `cash_closings` | Clôtures de caisse |
| `maintenance_tickets` | Travaux |
| `property_inspections` | États des lieux |
| `disbursements` | Reversements propriétaires |
| `bulletins_versements` | Bulletins |
| `invoices` | Factures |
| `owner_deductions` | Déductions |
| `owner_charges` | Charges propriétaire |
| `penalties` | Pénalités |
| `reminders` | Relances |
| `audit_logs` | Journal d'audit |
| `activity_logs` | Journal d'activité |
| `archives` | Archives |
| `notifications` | Notifications |
| `payment_methods_config` | Moyens de paiement |
| `documents` | Documents |
| `rent_due_dates` | Échéances |
| `cash_vouchers` | Bons de caisse |

### Anti-doublon

**Index unique sur `payments`** :
```sql
CREATE UNIQUE INDEX idx_payments_unique_loyer
ON payments (agency_id, locataire_id, periode)
WHERE statut = 'Payé' AND deleted_at IS NULL;
```

**Contrainte sur `payment_transactions`** :
```sql
CONSTRAINT unique_active_payment UNIQUE (agency_id, locataire_id, periode, provider)
```

---

## 💳 SYSTÈME DE PAIEMENT

### Flux général

```
Utilisateur clique "Payer"
    │
    ▼
Détection des providers actifs (getActiveProviders)
    │
    ├── Aucun configuré → Mode MANUEL (lien Wave statique + USSD OM)
    │
    └── Au moins 1 configuré → Mode API
            │
            ▼
    createCheckout(provider, request, settings)
            │
            ▼
    Appel API Route Vercel (/api/wave/create-session)
            │
            ▼
    API Route appelle Wave API avec les clés de l'agence
            │
            ▼
    Retourne { checkoutUrl, transactionId }
            │
            ▼
    Redirection vers la page Wave
            │
            ▼
    Utilisateur paye
            │
            ▼
    Wave envoie un WEBHOOK à /api/wave/webhook
            │
            ▼
    Webhook crée le paiement + la quittance en DB
            │
            ▼
    Statut passe à "Payé" automatiquement
```

### Providers supportés

| Provider | Mode | Frais | Délai KYC |
|----------|------|-------|-----------|
| **Wave Business** | API | 1% | 1-3 jours |
| **Orange Money** | API | 2-3% | 3-7 jours |
| **PayDunya** | Agrégateur | 2,5-3,5% | 24-72h |

### Où sont stockées les clés API

Dans `agency_settings` (par agence) :
- `wave_api_key`, `wave_webhook_secret`
- `orange_money_api_key`, `orange_money_merchant_id`
- `paydunya_master_key`, `paydunya_private_key`, `paydunya_public_key`, `paydunya_token`

**⚠️ Sécurité** : Ces clés sont utilisées UNIQUEMENT côté serveur (API Routes). Jamais exposées au client.

---

## 📱 PWA (Progressive Web App)

### Fichiers clés

- `public/manifest.json` : métadonnées de l'app
- `public/icons/*.png` : icônes (192, 512, 180, 32)
- `public/sw.js` : Service Worker (cache offline)

### Installation

| Plateforme | Procédure |
|-----------|-----------|
| Android (Chrome) | Bandeau automatique "Ajouter à l'écran d'accueil" |
| iPhone (Safari) | Partager → Sur l'écran d'accueil (manuel) |
| PC (Chrome) | Icône "Installer" dans la barre d'adresse |

---

## 🚀 DÉPLOIEMENT

### Vercel

- **Commande** : `vercel --prod`
- **URL prod** : https://fital-immo-gestion-locative-loyers-wine.vercel.app
- **Framework** : Vite
- **Output** : `dist/`
- **API Routes** : `api/` (serverless functions)

### Variables d'environnement (Vercel)

| Variable | Usage |
|----------|-------|
| `VITE_SUPABASE_URL` | Client React |
| `VITE_SUPABASE_ANON_KEY` | Client React |
| `SUPABASE_URL` | API Routes (serveur) |
| `SUPABASE_SERVICE_ROLE_KEY` | API Routes (serveur) |

---

*Document à maintenir à jour à chaque évolution majeure.*