# ============================================================
# BUILD + TEST SECURITE
# ============================================================

Write-Host ""
Write-Host "=== BUILD ===" -ForegroundColor Cyan
Write-Host ""

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD ECHOUE - Colle-moi les erreurs" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "=== BUILD OK ===" -ForegroundColor Green
Write-Host ""

Write-Host "=== LANCEMENT PREVIEW ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verifier dans le navigateur :" -ForegroundColor Yellow
Write-Host "  1. L'app charge normalement" -ForegroundColor White
Write-Host "  2. Ouvrir la console (F12) - pas d'erreur CORS" -ForegroundColor White
Write-Host "  3. Tester les Relances IA (bouton dans la Topbar)" -ForegroundColor White
Write-Host "  4. Tester les insights Gemini" -ForegroundColor White
Write-Host ""

npm run preview -- --open
