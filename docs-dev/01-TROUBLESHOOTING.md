# FITAL-IMMO — Guide de Résolution (Troubleshooting)

**Version** : 1.0 | **Date** : Septembre 2026  
**Public** : Développeur du projet

> Ce document liste TOUS les problèmes rencontrés pendant le développement et leurs solutions.  
> **Règle** : Avant de chercher ailleurs, consulte ce fichier. 90% des bugs sont déjà documentés ici.

---

## 🔴 ERREURS DE BUILD (Vite + TypeScript)

### ❌ Erreur : `Unexpected "}"` ou `Expected "}" but found "..."`

**Cause** : Accolade fermante en trop ou en moins. Typique après avoir remplacé une fonction.

**Solution** :
1. Va à la ligne indiquée par l'erreur (`App.tsx:1957:0`)
2. Remonte de 20-30 lignes
3. Cherche une `}` orpheline
4. Vérifie que chaque fonction ouverte a bien SA accolade fermante
5. Utilise **Ctrl+Shift+P → Format Document** dans VSCode pour réindenter

**Astuce** : Place ton curseur sur une `{` d'ouverture → VSCode surligne la `}` correspondante. Si elle surligne trop loin ou rien = déséquilibre.

---

### ❌ Erreur : `Duplicate identifier 'XXX'`

**Cause** : Une variable/propriété est déclarée 2 fois.

**Exemple vécu** : `agencyNinea` déclaré 2 fois dans `createAgencyWithAdmin` params.

**Solution** :
1. Cherche le nom de la variable (`Ctrl+F`)
2. Supprime la déclaration en trop
3. Chaque champ ne doit apparaître qu'UNE SEULE FOIS

---

### ❌ Erreur : `Cannot find module '@vercel/node'`

**Cause** : Dépendance manquante.

**Solution** :
```bash
npm install -D @vercel/node
```

---

### ❌ Erreur : `Property 'XXX' does not exist on type 'YYY'`

**Cause** : Tu utilises un champ qui n'est pas déclaré dans l'interface TypeScript.

**Exemple vécu** : `settings.waveApiKey` n'existe pas dans `AgencySettings`.

**Solution** :
1. Ouvre `src/types.ts`
2. Cherche l'interface concernée
3. Ajoute le champ manquant :
```typescript
export interface AgencySettings {
  // ...
  waveApiKey?: string;      // ← ajouter ce champ
  waveWebhookSecret?: string;
}
```

---

## 🔴 ERREURS API ROUTES VERCEL

### ❌ Erreur : `404 Not Found` sur `/api/wave/create-session`

**Cause 1** : La `vercel.json` capture TOUTES les URLs et les redirige vers `index.html`.

**Solution** :
1. Ouvre `vercel.json`
2. Cherche la section `rewrites`
3. Ajoute `api/` dans la liste d'exclusion :
```json
"rewrites": [
  {
    "source": "/((?!api/|assets/|favicon.ico|manifest.json|robots.txt|sitemap.xml|images/|icons/).*)",
    "destination": "/index.html"
  }
]
```
4. Redéploie : `vercel --prod`

**Cause 2** : Le dossier `api/` n'est pas à la racine du projet.

**Vérification** : Le dossier `api/` doit être au même niveau que `src/`, `public/`, `package.json`.

---

### ❌ Erreur : `500 FUNCTION_INVOCATION_FAILED` sur `/api/wave/create-session`

**Cause 1** : `Cannot find module '/var/task/api/_lib/supabaseAdmin'` — Les imports relatifs n'ont pas d'extension `.js`.

**Solution** :
1. Dans TOUS les fichiers `api/**/*.ts`, ajoute `.js` à la fin des imports relatifs :
```typescript
// ❌ AVANT
import { getAgencySettings } from '../_lib/supabaseAdmin';

// ✅ APRÈS
import { getAgencySettings } from '../_lib/supabaseAdmin.js';
```
2. Ne touche PAS aux imports de packages npm :
```typescript
// ✅ Ceci reste SANS .js
import type { VercelRequest, VercelResponse } from '@vercel/node';
```
3. Redéploie

**Cause 2** : Variables d'environnement manquantes sur Vercel.

**Vérification** :
1. Va sur https://vercel.com/dashboard → ton projet
2. Settings → Environment Variables
3. Vérifie que ces 4 variables existent :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

**Cause 3** : `SUPABASE_SERVICE_ROLE_KEY` contient des espaces ou est mal copiée.

**Solution** :
1. Va sur https://supabase.com/dashboard → Settings → API
2. Clique "Reveal" sur `service_role`
3. Copie la clé PROPREMENT
4. Sur Vercel : supprime la variable → recrée-la → colle la clé sans espaces
5. Redéploie

---

### ❌ Erreur : `{"error":"Method not allowed"}` quand tu testes GET

**Ce n'est PAS une erreur** ✅

C'est la réponse NORMALE. L'API Route refuse les requêtes GET (elle attend POST).

**Test correct** :
```powershell
curl.exe -X POST https://ton-app.vercel.app/api/wave/create-session
```

Tu devras recevoir `{"error":"Paramètres manquants."}` ou similaire.

---

## 🔴 ERREURS BASE DE DONNÉES (Supabase)

### ❌ Erreur : `new row violates row-level security policy`

**Cause** : La politique RLS bloque ton INSERT/UPDATE.

**Exemple vécu** : Création d'agence par SaaS Admin sans politique `profiles_update_saas`.

**Solution** :
1. Identifie la table concernée (dans le message d'erreur)
2. Vérifie les politiques existantes :
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'nom_de_la_table';
```
3. Ajoute la politique manquante :
```sql
-- Exemple : SaaS Admin peut tout modifier sur profiles
CREATE POLICY "profiles_update_saas" ON profiles FOR UPDATE
  USING (current_user_is_saas_admin())
  WITH CHECK (current_user_is_saas_admin());
```

---

### ❌ Erreur : `function current_user_is_saas_admin() does not exist`

**Cause** : La fonction helper n'a pas été créée.

**Solution** :
1. Va sur Supabase → SQL Editor
2. Colle et exécute :
```sql
CREATE OR REPLACE FUNCTION current_user_is_saas_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'SUPER_ADMIN_SAAS'
  );
$$;
```

---

### ❌ Erreur : `duplicate key value violates unique constraint "idx_payments_unique_loyer"`

**Ce n'est PAS un bug** ✅

C'est l'anti-doublon qui fonctionne. La base refuse de créer 2 paiements Payés pour le même locataire + période.

**Comportement attendu** : Le code `handleAddPayment` affiche une alerte "⛔ DOUBLON DÉTECTÉ" avant même que la DB ne rejette.

**Si tu veux autoriser un doublon légitime** (rare) :
1. Archive le paiement existant d'abord
2. Ou utilise une période différente

---

## 🔴 PROBLÈMES MULTI-AGENCES

### ❌ Problème : Les données de FITAL IMMO apparaissent dans une autre agence

**Cause** : Le cache localStorage contient les données de l'ancienne agence.

**Solution** :
1. Dans l'app, ouvre la console F12
2. Tape : `localStorage.clear()`
3. Recharge la page (F5)
4. Reconnecte-toi avec le compte de l'autre agence

**Prévention** : Le `handleSignOut` doit vider le localStorage. Vérifie qu'il contient bien :
```typescript
const handleSignOut = async () => {
  await signOutSession();
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('fital_immo_') || k.includes('supabase'))
      .forEach((k) => localStorage.removeItem(k));
  } catch (e) {}
  setCurrentUser(null);
  setIsProfileModalOpen(false);
  window.location.reload();
};
```

---

### ❌ Problème : Le Super-Admin SaaS voit les données de TOUTES les agences

**Ce n'est PAS un bug** ✅

C'est le comportement voulu. Le SaaS Admin a accès global (mais en LECTURE seule sur les données métier).

**Vérification** : Les politiques RLS doivent contenir :
```sql
USING (agency_id = current_user_agency_id() OR current_user_is_saas_admin())
```

---

## 🔴 PROBLÈMES PWA

### ❌ Problème : Chrome affiche "No supplied icon is at least 144 pixels"

**Cause** : Les PNG sont de faux PNG (mauvaises dimensions).

**Vérification** :
1. Ouvre le fichier `public/icons/android-chrome-192x192.png`
2. Sur VSCode, survole avec la souris → la taille réelle s'affiche
3. Si elle affiche `16x16` → le fichier est cassé

**Solution** :
1. Va sur https://realfavicongenerator.net/
2. Upload ton `favicon.svg`
3. Télécharge le pack
4. Copie les VRAIS PNG dans `public/icons/`
5. Redéploie

---

### ❌ Problème : `manifest.json` retourne 404

**Cause** : Le fichier n'est pas au bon endroit.

**Emplacement correct** : `public/manifest.json`

**Vérification** :
1. Ouvre l'URL : `https://ton-app.vercel.app/manifest.json`
2. Si 404 → le fichier n'est pas déployé
3. Vérifie qu'il est bien dans `public/manifest.json` (pas dans `public/icons/`)
4. Redéploie

---

## 🔴 PROBLÈMES GIT

### ❌ Erreur : `Le jeton « && » n'est pas un séparateur d'instruction valide`

**Cause** : PowerShell n'accepte pas `&&` (contrairement à Linux/Mac).

**Solution** : Utilise `;` à la place :
```powershell
git add .; git commit -m "message"
```

**Ou sépare les commandes** :
```powershell
git add .
git commit -m "message"
```

---

### ⚠️ Warning : `LF will be replaced by CRLF`

**Ce n'est PAS une erreur** ✅

C'est un avertissement de conversion de fin de ligne (Linux → Windows). Aucun impact.

**Pour le supprimer** (optionnel) :
```powershell
git config core.autocrlf true
```

---

## 🔴 PROBLÈMES DIVERS

### ❌ Problème : L'app reste bloquée sur "Chargement sécurisé..."

**Cause** : L'authentification échoue ou le profil ne se charge pas.

**Solution** :
1. Ouvre F12 → Console
2. Cherche les erreurs en rouge
3. Vérifie que `currentUser.agencyId` est bien défini :
```javascript
JSON.parse(localStorage.getItem('fital_immo_current_user') || '{}')
```
4. Si `agencyId` est null → le profil n'est pas trouvé en DB
5. Vérifie en SQL :
```sql
SELECT id, email, agency_id FROM profiles WHERE email = 'ton-email@test.com';
```

---

### ❌ Problème : Les icônes FITAL apparaissent comme des carrés gris sur l'écran d'accueil

**Cause** : Chrome garde en cache les anciennes icônes.

**Solution** :
1. Sur PC : `chrome://apps/` → supprime l'app → réinstalle
2. Sur Android : désinstalle l'app de l'écran d'accueil → réinstalle
3. Sur iPhone : supprime l'icône → refais "Sur l'écran d'accueil"

---

### ❌ Problème : Le paiement Mobile Money ne se valide pas (statut reste "en attente")

**Cause 1** : Le webhook n'est pas configuré chez Wave/OM.

**Vérification** :
1. Chez Wave Business : l'URL de webhook doit être :
   ```
   https://fital-immo-gestion-locative-loyers-wine.vercel.app/api/wave/webhook
   ```
2. Chez OM : même principe avec `/api/orange-money/webhook`

**Cause 2** : Le webhook n'est pas déployé.

**Test** :
```powershell
curl.exe -X POST https://ton-app.vercel.app/api/wave/webhook -H "Content-Type: application/json" -d "{}"
```
→ Doit retourner `{"error":"..."}` (pas 404)

---

## 📋 CHECKLIST DE DÉBOGAGE

Quand un problème survient, suis cet ordre :

1. **F12 → Console** : Y a-t-il des erreurs rouges ?
2. **F12 → Network** : La requête a-t-elle un code 200/401/403/500 ?
3. **Vercel Logs** : `vercel logs --follow` (ou dashboard Vercel → Functions)
4. **Supabase Logs** : Dashboard → Logs → API / Postgres
5. **Recherche dans ce document** avec `Ctrl+F`

---

## 🆘 QUAND TOUT ÉCHOUE

Si tu ne trouves pas la solution ici :

1. **Fais un backup** : Centre de Contrôle → Sauvegarde JSON
2. **Reviens au dernier commit qui marchait** :
```powershell
git log --oneline    # Voir l'historique
git checkout <hash>  # Revenir à un commit précis
```
3. **Décris le problème** avec :
   - L'action qui déclenche le bug
   - Le message d'erreur exact
   - Les logs Vercel/Supabase

---

*Document vivant — à mettre à jour à chaque nouveau bug résolu.*