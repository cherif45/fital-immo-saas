# ============================================================
# FIX - Ligne 51 de server.ts (string template cassee)
# ============================================================

$filePath = "server.ts"

# Backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $filePath "$filePath.before-cors-line-fix-$timestamp.bak" -Force
Write-Host ("Backup : {0}.before-cors-line-fix-{1}.bak" -f $filePath, $timestamp) -ForegroundColor Green
Write-Host ""

# Lire
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $content -split "`r?`n"

# Trouver et corriger la ligne 51
$oldLine = '      console.warn([CORS] Origine refusee : );'
$newLine = '      console.warn("[CORS] Origine refusee : " + origin);'

$fixed = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Trim() -eq 'console.warn([CORS] Origine refusee : );') {
        Write-Host ("Ligne {0} AVANT : {1}" -f ($i + 1), $lines[$i]) -ForegroundColor Yellow
        $lines[$i] = $newLine
        Write-Host ("Ligne {0} APRES : {1}" -f ($i + 1), $lines[$i]) -ForegroundColor Green
        $fixed = $true
        break
    }
}

if (-not $fixed) {
    Write-Host "Recherche alternative..." -ForegroundColor Yellow
    # Chercher toute ligne avec console.warn + [CORS]
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "console\.warn.*\[CORS\]") {
            Write-Host ("Trouve ligne {0} : {1}" -f ($i + 1), $lines[$i]) -ForegroundColor Yellow
            $lines[$i] = $newLine
            Write-Host ("Corrige en     : {1}" -f ($i + 1), $lines[$i]) -ForegroundColor Green
            $fixed = $true
            break
        }
    }
}

if (-not $fixed) {
    Write-Host "ERREUR : Ligne non trouvee - fix manuel necessaire" -ForegroundColor Red
    exit 1
}

# Reconstruire le contenu
$newContent = $lines -join "`r`n"

# Ecrire en UTF-8 sans BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $newContent, $utf8NoBom)

Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
Write-Host ""

$finalContent = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$finalLines = $finalContent -split "`r?`n"
Write-Host ("Ligne 51 : {0}" -f $finalLines[50]) -ForegroundColor White

Write-Host ""
Write-Host "=== Autres erreurs potentielles a chercher ===" -ForegroundColor Cyan
Write-Host ""

# Chercher d'autres erreurs de template literal cassees
# Pattern : console.log/warn/error avec un backtick manquant
$suspectLines = @()
for ($i = 0; $i -lt $finalLines.Count; $i++) {
    $line = $finalLines[$i]
    # Ligne avec ${ sans backtick correspondant
    if ($line -match '\$\{[^}]*\}' -and $line -notmatch '`') {
        $suspectLines += "L{0}: {1}" -f ($i + 1), $line.Trim()
    }
}

if ($suspectLines.Count -gt 0) {
    Write-Host ("{0} lignes suspectes (template literal sans backtick) :" -f $suspectLines.Count) -ForegroundColor Yellow
    $suspectLines | ForEach-Object { Write-Host ("  {0}" -f $_) -ForegroundColor Yellow }
} else {
    Write-Host "OK : aucune autre erreur de template literal detectee" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== FIN FIX ===" -ForegroundColor Green
