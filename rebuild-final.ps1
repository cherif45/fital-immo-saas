# ============================================================
# BUILD APRES FIX SYNTAXE
# ============================================================

Write-Host ""
Write-Host "=== BUILD ===" -ForegroundColor Cyan
Write-Host ""

npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD ECHOUE" -ForegroundColor Red
    Write-Host "Verifier les erreurs ci-dessus" -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "=== BUILD OK ===" -ForegroundColor Green
Write-Host ""

# Verifier que le SW est bien genere
if (Test-Path "dist\sw.js") {
    $sw = Get-Item "dist\sw.js"
    Write-Host ("OK - sw.js ({0} bytes)" -f $sw.Length) -ForegroundColor Green
} else {
    Write-Host "ATTENTION - sw.js manquant" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== PREVIEW ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tests a faire dans le navigateur :" -ForegroundColor Yellow
Write-Host "  1. L'app charge normalement" -ForegroundColor White
Write-Host "  2. F12 > Console : aucune erreur CORS" -ForegroundColor White
Write-Host "  3. Le bouton Apparence (ThemeStudio) fonctionne" -ForegroundColor White
Write-Host "  4. Le mode offline fonctionne (Network > Offline)" -ForegroundColor White
Write-Host ""

npm run preview -- --open
