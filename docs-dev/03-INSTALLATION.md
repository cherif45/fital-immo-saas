# FITAL-IMMO — Installation Locale

## 📋 PRÉREQUIS

- **Node.js** : v18+ ([nodejs.org](https://nodejs.org))
- **Git** : ([git-scm.com](https://git-scm.com))
- **Compte Supabase** : ([supabase.com](https://supabase.com))
- **Compte Vercel** : ([vercel.com](https://vercel.com))

---

## 🚀 INSTALLATION EN 5 ÉTAPES

### Étape 1 — Cloner le projet

```bash
git clone <repo-url>
cd fital-immo
```

### Étape 2 — Installer les dépendances

```bash
npm install
```

### Étape 3 — Configurer les variables d'environnement

Crée un fichier `.env.local` à la racine :

```bash
VITE_SUPABASE_URL=https://wgnwzfkjagkhtnourukz.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_URL=https://wgnwzfkjagkhtnourukz.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx
```

**Où trouver ces clés ?**
1. Va sur https://supabase.com/dashboard
2. Sélectionne ton projet
3. Settings → API
4. Copie `anon` et `service_role`

### Étape 4 — Lancer l'app en local

```bash
npm run dev
```

Ouvre http://localhost:5173

### Étape 5 — Se connecter

Utilise un compte existant ou crée-en un via Supabase Auth.

---

## 🗄️ SETUP SUPABASE

### Créer le projet

1. https://supabase.com/dashboard → New Project
2. Nom : `fital-immo`
3. Région : West EU (Ireland)
4. Password : note-le

### Appliquer les migrations

Les migrations SQL sont dans `supabase/migrations/`. Exécute-les dans l'ordre dans le SQL Editor.

### Vérifier les fonctions helper

```sql
-- Doit retourner NULL (pas d'erreur)
SELECT current_user_agency_id();
SELECT current_user_is_saas_admin();
```

### Créer le premier admin

```sql
-- 1. Créer l'agence
INSERT INTO agencies (name, slug, email, status)
VALUES ('FITAL IMMO', 'fital-immo', 'contact@fital-immo.com', 'active');

-- 2. Créer le profil admin (remplace l'UUID par celui du user Supabase Auth)
INSERT INTO profiles (id, agency_id, email, nom, prenom, role, statut)
VALUES (
  '<auth-user-uuid>',
  (SELECT id FROM agencies WHERE slug = 'fital-immo'),
  'mouhamed@gmail.com',
  'ADMIN',
  'Mouhamed',
  'SUPER_ADMIN',
  'actif'
);
```

---

## 🧪 TESTS LOCAUX

### Tester les API Routes

```bash
# Wave
curl.exe -X POST http://localhost:5173/api/wave/create-session

# PayDunya
curl.exe -X POST http://localhost:5173/api/paydunya/create-session
```

### Tester le build

```bash
npm run build
npm run preview
```

---

## 🐛 PROBLÈMES FRÉQUENTS

Voir `01-TROUBLESHOOTING.md`.

---

*Document à maintenir à jour.*