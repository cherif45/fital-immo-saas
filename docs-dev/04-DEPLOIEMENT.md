# FITAL-IMMO — Déploiement Vercel

## 🚀 DÉPLOIEMENT RAPIDE

```bash
# 1. Build local (vérifier que ça compile)
npm run build

# 2. Déployer en production
vercel --prod
```

**Résultat** : Vercel affiche l'URL de production.

---

## ⚙️ CONFIGURATION VERCEL

### Fichier `vercel.json`

```json
{
  "framework": "vite",
  "buildCommand": "vite build",
  "outputDirectory": "dist",
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 9 * * *" }
  ],
  "rewrites": [
    {
      "source": "/((?!api/|assets/|favicon.ico|manifest.json|robots.txt|sitemap.xml|images/|icons/).*)",
      "destination": "/index.html"
    }
  ]
}
```

**⚠️ Point critique** : La règle `rewrites` doit exclure `api/` pour que les API Routes fonctionnent.

### Variables d'environnement

Sur https://vercel.com/dashboard → ton projet → Settings → Environment Variables :

| Nom | Valeur | Scope |
|-----|--------|-------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Production + Preview |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_xxx` | Production + Preview |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Production + Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` | Production + Preview |

**⚠️ Important** : Après ajout/modification de variables, il faut **redéployer** (`vercel --prod`).

---

## 📋 CHECKLIST AVANT DÉPLOIEMENT

- [ ] `npm run build` passe sans erreur
- [ ] Les variables d'env sont à jour sur Vercel
- [ ] `vercel.json` exclut bien `api/`
- [ ] Les imports `api/**/*.ts` ont `.js`
- [ ] Les clés API ne sont PAS dans le code

---

## 🔄 ROLLBACK

Si le déploiement casse la prod :

**Option A — Via Vercel Dashboard**
1. Deployments → sélectionne un ancien déploiement → Promote to Production

**Option B — Via Git**
```bash
git log --oneline
git checkout <hash-du-commit-qui-marchait>
vercel --prod```

---

## 🌐 DOMAINE PERSONNALISÉ (optionnel)

1. Vercel → Settings → Domains
2. Ajoute `fital-immo.com`
3. Configure les DNS chez ton registrar :
   - `A` → `76.76.21.21`
   - `CNAME` → `cname.vercel-dns.com`
4. Attends 24-48h pour la propagation

---

*Document à maintenir à jour.*