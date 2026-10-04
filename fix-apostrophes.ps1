# ============================================================
# FIX - Remplacer les '' par ' dans server.ts
# ============================================================

$filePath = "server.ts"

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Compter les doubles apostrophes
$doubleCount = ([regex]::Matches($content, "''")).Count
Write-Host ("Doubles apostrophes trouvees : {0}" -f $doubleCount) -ForegroundColor Yellow
Write-Host ""

# Remplacer TOUTES les doubles apostrophes par simple
$content = $content.Replace("''", "'")

# Ecrire
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

Write-Host "OK - Doubles apostrophes corrigees" -ForegroundColor Green
Write-Host ""

# Verification
$final = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$remaining = ([regex]::Matches($final, "''")).Count

if ($remaining -eq 0) {
    Write-Host "OK - Aucune double apostrophe restante" -ForegroundColor Green
} else {
    Write-Host ("ATTENTION - {0} doubles apostrophes restantes" -f $remaining) -ForegroundColor Red
}

Write-Host ""
Write-Host "=== 40 dernieres lignes ===" -ForegroundColor Yellow
$finalLines = $final -split "`r?`n"
$start = [Math]::Max(0, $finalLines.Count - 40)
for ($i = $start; $i -lt $finalLines.Count; $i++) {
    Write-Host ("  {0,3}: {1}" -f ($i + 1), $finalLines[$i]) -ForegroundColor White
}
