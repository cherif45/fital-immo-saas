# ============================================================
# COMMIT SECURITE
# ============================================================

Write-Host ""
Write-Host "=== Ajout des fichiers ===" -ForegroundColor Cyan
git add server.ts src/App.tsx package.json package-lock.json
Write-Host ""

Write-Host "=== Status ===" -ForegroundColor Cyan
git status --short
Write-Host ""

Write-Host "=== Commit ===" -ForegroundColor Cyan
git commit -m "fix(security): securisation server.ts + fix syntaxe

SECURITE server.ts :
- Helmet : headers HTTP securises (XSS, clickjacking, MIME sniffing)
- CORS strict : whitelist localhost + Vercel
- Rate limiting global : 100 req/15min par IP sur /api/*
- Rate limiting Gemini : 10 req/min par IP (protection cout $$)
- Body parser limite a 1mb (anti-DoS payload)
- Trust proxy pour Vercel (IP reelle derriere proxy)
- Verification NODE_ENV en production

FIX App.tsx :
- Correction double virgule dans l'import lucide-react
- Sparkles ajoute proprement

FIX server.ts :
- Ligne 51 : template literal cassee -> concatenation avec +

TESTS VALIDES :
- Rate limiting Gemini : 10 appels OK, 5 appels -> 429
- Headers Helmet : actifs
- CORS : origine whitelistee uniquement

PHASE 2 (SECURITE) : 100%"

Write-Host ""
Write-Host "=== Log ===" -ForegroundColor Cyan
git log --oneline -5
