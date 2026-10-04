# ============================================================
# DEPLOIEMENT - Fix Dashboard SuperAdmin
# ============================================================

Write-Host ""
Write-Host "=== Commit + Deploy ===" -ForegroundColor Cyan
Write-Host ""

git add -A
git commit -m "fix(dashboard): SuperAdmin utilise agencyStats (RPC serveur)

BUG RESOLU :
- Dashboard SUPER_ADMIN affichait 0 paiements/factures/mouvements caisse
- Cause : fetchGlobalStats utilise anon key + RLS bloque pour super-admin
- Fix : fusion avec agencyStats (RPC serveur, bypass RLS)

RESULTAT ATTENDU :
- Paiements : 0 -> 31680
- Factures : 0 -> 1591
- Mouvements caisse : 0 -> 35952"

Write-Host ""
Write-Host "=== Historique ===" -ForegroundColor Cyan
git log --oneline -3
Write-Host ""

Write-Host "=== Deploiement Vercel ===" -ForegroundColor Cyan
vercel --prod
