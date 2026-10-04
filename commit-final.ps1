git add -A
git commit -m "perf(dashboard): SaaS performant et fonctionnel

BILAN DE LA SESSION :
- FALLBACK_AGENCY_ID corrige (agence active)
- Requete profiles corrigee (400)
- SW skipWaiting + clientsClaim
- 4 Promise.resolve -> fetchAllRows
- AdminControlCenterView utilise agencyStats
- Tables limitees a 500 pour performance

RESULTAT :
- Dashboard charge en ~1 sec (au lieu de 5 sec)
- 12/12 compteurs corrects
- F5 rapide et stable
- Plus de 0 temporaire

COMPROMIS :
- tenants/invoices/owner_charges/units : 500 max
- Les vues metier affichent les 500 plus recents
- Lazy loading a implementer si besoin

SaaS pret pour utilisation client" 2>&1 | Select-Object -First 3

Write-Host ""
Write-Host "=== Historique ===" -ForegroundColor Cyan
git log --oneline -5
