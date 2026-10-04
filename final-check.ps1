# ============================================================
# REBUILD APRES CORRECTION ENCODAGE
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
Write-Host "=== VERIFICATIONS POST-BUILD ===" -ForegroundColor Cyan
Write-Host ""

# Chercher l'emoji dans le bundle
$bundleFiles = Get-ChildItem "dist\assets\*.js" -ErrorAction SilentlyContinue
$emojiFound = $false

foreach ($bundle in $bundleFiles) {
    $content = [System.IO.File]::ReadAllText($bundle.FullName, [System.Text.Encoding]::UTF8)
    if ($content -match [char]0x2728) {  # ?
        Write-Host ("OK : emoji ? present dans {0}" -f $bundle.Name) -ForegroundColor Green
        $emojiFound = $true
    }
    if ($content -match "Assistant Nouveau Locataire \(7") {
        Write-Host ("OK : texte 'Assistant Nouveau Locataire (7' present dans {0}" -f $bundle.Name) -ForegroundColor Green
    }
}

if (-not $emojiFound) {
    Write-Host "ATTENTION : emoji ? NON trouve dans le bundle" -ForegroundColor Yellow
}

# Chercher des corruptions residuelles
$corruptionFound = $false
foreach ($bundle in $bundleFiles) {
    $content = [System.IO.File]::ReadAllText($bundle.FullName, [System.Text.Encoding]::UTF8)
    $corruptCount = ([regex]::Matches($content, [char]0x00C3 + [char]0x0083)).Count  # signature double-encoded
    if ($corruptCount -gt 0) {
        Write-Host ("ATTENTION : {0} corruptions residuelles dans {1}" -f $corruptCount, $bundle.Name) -ForegroundColor Yellow
        $corruptionFound = $true
    }
}

if (-not $corruptionFound) {
    Write-Host "OK : aucune corruption residuelle detectee" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== CLEANUP DES BACKUPS TEMPORAIRES ===" -ForegroundColor Cyan
Write-Host ""

# Lister les backups crees pendant la session
$backups = Get-ChildItem -Path "src" -Recurse -Filter "*.bak" -ErrorAction SilentlyContinue
Write-Host ("{0} fichiers .bak trouves" -f $backups.Count) -ForegroundColor Yellow

if ($backups.Count -gt 0) {
    Write-Host "Liste :" -ForegroundColor White
    $backups | Select-Object -First 20 | ForEach-Object {
        Write-Host ("  - {0}" -f $_.FullName.Replace($PWD.Path + '\', '')) -ForegroundColor DarkGray
    }
    Write-Host ""
    Write-Host "IMPORTANT : ces backups ne sont PAS dans le bundle final." -ForegroundColor Cyan
    Write-Host "On les garde pour l'instant (au cas ou)." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== LANCEMENT PREVIEW ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verifie dans le navigateur :" -ForegroundColor Yellow
Write-Host "  1. Le bouton 'Assistant Nouveau Locataire' affiche : ? ... (7 Etapes)" -ForegroundColor White
Write-Host "  2. Tous les accents sont corrects partout" -ForegroundColor White
Write-Host "  3. Le changement de theme fonctionne" -ForegroundColor White
Write-Host ""

npm run preview -- --open
