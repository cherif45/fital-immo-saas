# ============================================================
# RECHERCHE DES EMOJIS CASSÉS
# ============================================================
chcp 65001 | Out-Null

Write-Host ""
Write-Host "=== 1. RECHERCHE D'EMOJIS CASSES ===" -ForegroundColor Cyan
Write-Host ""

$brokenPatterns = @('Ã©', 'Ã¨', 'Ã ', 'Ã¢', 'Ã§', 'Ã®', 'Ã´', 'Ã¹', 'Ã»', 'ðŸ', 'â‚¬', 'â€™', 'â€œ')

$found = @()
Get-ChildItem -Path "src", "public", "tests" -Recurse -Include "*.tsx","*.ts","*.html","*.json","*.css" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    ForEach-Object {
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { return }
        $count = 0
        foreach ($p in $brokenPatterns) {
            $count += ([regex]::Matches($content, [regex]::Escape($p))).Count
        }
        if ($count -gt 0) {
            $found += [PSCustomObject]@{
                Fichier = $_.FullName.Replace($PWD.Path + '\', '')
                Occurrences = $count
            }
        }
    }

if ($found.Count -eq 0) {
    Write-Host "OK - Aucun caractere casse detecte" -ForegroundColor Green
} else {
    Write-Host "ATTENTION : $($found.Count) fichiers avec problemes" -ForegroundColor Red
    $found | Sort-Object Occurrences -Descending | Format-Table -AutoSize
}

Write-Host ""
Write-Host "=== 2. RECHERCHE DE 'Assistant Nouveau Locataire' ===" -ForegroundColor Cyan
Write-Host ""

$hits = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue |
    Select-String -Pattern "Assistant Nouveau Locataire" -ErrorAction SilentlyContinue

if ($hits) {
    foreach ($h in $hits) {
        Write-Host "FICHIER : $($h.Path.Replace($PWD.Path + '\', ''))" -ForegroundColor Yellow
        Write-Host "Ligne $($h.LineNumber) :" -ForegroundColor Cyan
        Write-Host "$($h.Line.Trim())" -ForegroundColor White
        Write-Host ""
    }
} else {
    Write-Host "Aucune occurrence trouvee" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 3. RECHERCHE DE 'tapes' (mot 'etapes' casse) ===" -ForegroundColor Cyan
Write-Host ""

$hits2 = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue |
    Select-String -Pattern "tapes\)" -ErrorAction SilentlyContinue

if ($hits2) {
    foreach ($h in $hits2 | Select-Object -First 5) {
        Write-Host "FICHIER : $($h.Path.Replace($PWD.Path + '\', ''))" -ForegroundColor Yellow
        Write-Host "Ligne $($h.LineNumber) :" -ForegroundColor Cyan
        Write-Host "$($h.Line.Trim())" -ForegroundColor White
        Write-Host ""
    }
} else {
    Write-Host "Aucune occurrence trouvee" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== TERMINE ===" -ForegroundColor Green
