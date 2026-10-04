# ============================================================
# ROLLBACK COMPLET - Revenir avant TOUS mes fixes
# ============================================================

Write-Host ""
Write-Host "=== ROLLBACK COMPLET ===" -ForegroundColor Cyan
Write-Host ""

# Voir les 15 derniers commits
Write-Host "Derniers commits :" -ForegroundColor Yellow
git log --oneline -15

Write-Host ""
Write-Host "=== Recherche du commit AVANT mes fix ===" -ForegroundColor Cyan
Write-Host ""

# Trouver le commit "3ba5bbd chore: nettoyage final"
$targetCommit = "3ba5bbd"

Write-Host ("Commit cible : {0}" -f $targetCommit) -ForegroundColor Green
Write-Host ""

# Voir les d?tails
git log --oneline -1 $targetCommit

Write-Host ""
Write-Host "=== Ce commit est AVANT : ===" -ForegroundColor Yellow
Write-Host "  - fix FALLBACK_AGENCY_ID" -ForegroundColor DarkGray
Write-Host "  - fix requete profiles" -ForegroundColor DarkGray
Write-Host "  - fix SW skipWaiting" -ForegroundColor DarkGray
Write-Host "  - fix Promise.resolve" -ForegroundColor DarkGray
Write-Host "  - fix StatCard" -ForegroundColor DarkGray
Write-Host "  - fix AdminControlCenterView" -ForegroundColor DarkGray
Write-Host ""

Write-Host "?? ATTENTION : Ce rollback va annuler 8 commits" -ForegroundColor Red
Write-Host "?? Le code reviendra a l'etat initial" -ForegroundColor Red
Write-Host ""
$confirm = Read-Host "Tape 'ROLLBACK' pour confirmer"

if ($confirm -ne "ROLLBACK") {
    Write-Host "Annule" -ForegroundColor Yellow
    exit
}

# Reset hard
Write-Host ""
Write-Host "=== Reset hard sur le commit cible ===" -ForegroundColor Cyan
git reset --hard $targetCommit

Write-Host ""
Write-Host "=== Status ===" -ForegroundColor Cyan
git status --short

Write-Host ""
Write-Host "=== Historique ===" -ForegroundColor Cyan
git log --oneline -5

Write-Host ""
Write-Host "=== BUILD ===" -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "BUILD OK" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "=== DEPLOY ===" -ForegroundColor Cyan
    vercel --prod
}
