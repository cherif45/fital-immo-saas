# ============================================================
# RECHERCHE de la fonction agencyFilter
# ============================================================

Write-Host ""
Write-Host "=== Fonction agencyFilter (le coeur de l'isolation) ===" -ForegroundColor Cyan
Write-Host ""

$filePath = "src\lib\supabase\service.ts"
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $content -split "`r?`n"

# Trouver la definition
$found = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "function\s+agencyFilter|const\s+agencyFilter") {
        Write-Host ("Trouve ligne {0}" -f ($i + 1)) -ForegroundColor Green
        Write-Host ""
        $start = [Math]::Max(0, $i - 2)
        $end = [Math]::Min($lines.Count - 1, $i + 30)
        for ($j = $start; $j -le $end; $j++) {
            $marker = if ($j -eq $i) { ">>>" } else { "   " }
            $color = if ($marker -eq ">>>") { "Yellow" } else { "White" }
            Write-Host ("{0} {1,4}: {2}" -f $marker, ($j + 1), $lines[$j]) -ForegroundColor $color
        }
        $found = $true
        break
    }
}

if (-not $found) {
    Write-Host "agencyFilter NON trouvee dans service.ts" -ForegroundColor Red
    Write-Host "Recherche dans tout src/..." -ForegroundColor Yellow
    Get-ChildItem "src" -Recurse -Include "*.ts","*.tsx" | ForEach-Object {
        $m = Select-String -Path $_.FullName -Pattern "agencyFilter" -ErrorAction SilentlyContinue
        if ($m) {
            Write-Host ("  {0} - {1} refs" -f $_.Name, $m.Count) -ForegroundColor White
        }
    }
}

# ============================================================
# Recherche de fetchAllRows
# ============================================================
Write-Host ""
Write-Host "=== Fonction fetchAllRows (pagination) ===" -ForegroundColor Cyan
Write-Host ""

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "function\s+fetchAllRows|const\s+fetchAllRows") {
        Write-Host ("Trouve ligne {0}" -f ($i + 1)) -ForegroundColor Green
        Write-Host ""
        $start = [Math]::Max(0, $i - 2)
        $end = [Math]::Min($lines.Count - 1, $i + 35)
        for ($j = $start; $j -le $end; $j++) {
            $marker = if ($j -eq $i) { ">>>" } else { "   " }
            $color = if ($marker -eq ">>>") { "Yellow" } else { "White" }
            Write-Host ("{0} {1,4}: {2}" -f $marker, ($j + 1), $lines[$j]) -ForegroundColor $color
        }
        break
    }
}
