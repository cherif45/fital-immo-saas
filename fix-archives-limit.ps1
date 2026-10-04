# ============================================================
# FIX - Limiter fetchArchivesFromDb
# ============================================================

$filePath = "src\lib\supabase\service.ts"

# Backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $filePath "$filePath.before-archives-limit-$timestamp.bak" -Force
Write-Host ("Backup cree") -ForegroundColor Green
Write-Host ""

# Lire le contenu
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Ancien code
$oldCode = "    const { data, error } = await query.order('archived_at', { ascending: false });"

# Nouveau code avec limit
$newCode = "    const { data, error } = await query.order('archived_at', { ascending: false }).limit(500);"

if ($content.Contains($oldCode)) {
    $content = $content.Replace($oldCode, $newCode)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)
    Write-Host "OK - Limite .limit(500) ajoutee" -ForegroundColor Green
} else {
    Write-Host "Pattern non trouve. Recherche alternative..." -ForegroundColor Yellow
    # Chercher la ligne exacte
    $lines = $content -split "`r?`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "await query\.order\('archived_at'") {
            Write-Host ("Ligne {0} : {1}" -f ($i + 1), $lines[$i]) -ForegroundColor Yellow
            $lines[$i] = $lines[$i].Replace(");", ").limit(500);")
            Write-Host ("Corrige   : {0}" -f $lines[$i]) -ForegroundColor Green
            $newContent = $lines -join "`r`n"
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($filePath, $newContent, $utf8NoBom)
            break
        }
    }
}

Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
$final = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$finalLines = $final -split "`r?`n"
for ($i = 1177; $i -lt 1185 -and $i -lt $finalLines.Count; $i++) {
    Write-Host ("{0,4}: {1}" -f ($i + 1), $finalLines[$i]) -ForegroundColor White
}
