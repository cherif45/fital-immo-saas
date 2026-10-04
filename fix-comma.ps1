# ============================================================
# FIX - Double virgule dans l'import lucide-react
# ============================================================

$filePath = "src\App.tsx"

# Backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $filePath "$filePath.before-comma-fix-$timestamp.bak" -Force
Write-Host ("Backup : {0}.before-comma-fix-{1}.bak" -f $filePath, $timestamp) -ForegroundColor Green
Write-Host ""

# Lire
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Afficher les lignes 1-15 avant correction
Write-Host "=== AVANT (lignes 1-15) ===" -ForegroundColor Yellow
$lines = $content -split "`r?`n"
for ($i = 0; $i -lt [Math]::Min(15, $lines.Count); $i++) {
    $marker = if ($lines[$i] -match ",,") { ">>>" } else { "   " }
    Write-Host ("{0} {1}: {2}" -f $marker, ($i + 1), $lines[$i]) -ForegroundColor $(if ($marker -eq ">>>") { "Red" } else { "White" })
}
Write-Host ""

# Fix : remplacer ",," par ","
$originalCount = ([regex]::Matches($content, ",,")).Count
$content = $content.Replace(",,", ",")
Write-Host ("Corrections : {0} doubles virgules remplacees" -f $originalCount) -ForegroundColor Cyan

# Fix specifique pour "Menu as MenuIcon,," si le pattern general n'a pas tout couvert
$content = $content.Replace("Menu as MenuIcon,,", "Menu as MenuIcon,")

# Ecrire en UTF-8 sans BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

Write-Host ""
Write-Host "=== APRES (lignes 1-15) ===" -ForegroundColor Green
$newLines = $content -split "`r?`n"
for ($i = 0; $i -lt [Math]::Min(15, $newLines.Count); $i++) {
    Write-Host ("   {0}: {1}" -f ($i + 1), $newLines[$i]) -ForegroundColor White
}

Write-Host ""
Write-Host "=== VERIFICATION FINALE ===" -ForegroundColor Cyan
$finalContent = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$doubleCommas = ([regex]::Matches($finalContent, ",,")).Count
if ($doubleCommas -eq 0) {
    Write-Host "OK - Aucune double virgule restante" -ForegroundColor Green
} else {
    Write-Host ("ATTENTION - {0} doubles virgules restantes" -f $doubleCommas) -ForegroundColor Red
}
