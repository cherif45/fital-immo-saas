# ============================================================
# PHASE 5 - AUDIT SCALABILITE
# ============================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  PHASE 5 - SCALABILITE" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 1. Requetes SANS pagination (limit/range)
# ============================================================
Write-Host "=== 1. REQUETES SANS PAGINATION ===" -ForegroundColor Yellow
Write-Host ""

$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" }

$unpaginated = @()

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $lines = $content -split "`r?`n"

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        # Chercher .from('...').select(...) sans .limit() ou .range() dans les 5 lignes
        if ($line -match "\.from\(['\`"]([a-z_]+)['\`"]\)" -and $line -match "\.select\(") {
            $context = ""
            for ($j = $i; $j -lt [Math]::Min($i + 5, $lines.Count); $j++) {
                $context += $lines[$j]
            }
            $hasLimit = $context -match "\.limit\(|\.range\(|fetchAllRows"
            
            if (-not $hasLimit) {
                $unpaginated += [PSCustomObject]@{
                    Fichier = $file.Name
                    Ligne = $i + 1
                    Table = $matches[1]
                }
            }
        }
    }
}

Write-Host ("Requetes sans pagination : {0}" -f $unpaginated.Count) -ForegroundColor $(if ($unpaginated.Count -gt 10) { "Red" } else { "Yellow" })
Write-Host ""

# Grouper par table
$byTable = $unpaginated | Group-Object Table | Sort-Object Count -Descending
Write-Host "Par table :" -ForegroundColor Cyan
$byTable | Select-Object -First 15 | ForEach-Object {
    Write-Host ("  {0,3} requetes -> {1}" -f $_.Count, $_.Name) -ForegroundColor White
}

# ============================================================
# 2. Requetes N+1 (boucle + fetch)
# ============================================================
Write-Host ""
Write-Host "=== 2. REQUETES N+1 (forEach/map + fetch) ===" -ForegroundColor Yellow
Write-Host ""

$nPlusOne = @()

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $lines = $content -split "`r?`n"

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        # Chercher forEach/map/for suivi de fetch dans les 10 lignes suivantes
        if ($line -match "\.forEach\s*\(|\.map\s*\(|for\s*\(") {
            $context = ""
            for ($j = $i; $j -lt [Math]::Min($i + 10, $lines.Count); $j++) {
                $context += $lines[$j] + " "
            }
            if ($context -match "await\s+fetch|await\s+supabase|await\s+.*FromDb") {
                $nPlusOne += [PSCustomObject]@{
                    Fichier = $file.Name
                    Ligne = $i + 1
                }
            }
        }
    }
}

Write-Host ("Suspects N+1 : {0}" -f $nPlusOne.Count) -ForegroundColor $(if ($nPlusOne.Count -gt 5) { "Yellow" } else { "Green" })
if ($nPlusOne.Count -gt 0) {
    $nPlusOne | Select-Object -First 10 | Format-Table -AutoSize
}

# ============================================================
# 3. Bundle size
# ============================================================
Write-Host ""
Write-Host "=== 3. TAILLE DU BUNDLE JS ===" -ForegroundColor Yellow
Write-Host ""

if (Test-Path "dist\assets") {
    $jsFiles = Get-ChildItem "dist\assets\*.js" -ErrorAction SilentlyContinue
    $totalJS = ($jsFiles | Measure-Object -Property Length -Sum).Sum
    Write-Host ("Bundle JS total : {0} MB" -f [math]::Round($totalJS / 1MB, 2)) -ForegroundColor $(if ($totalJS -gt 2MB) { "Red" } elseif ($totalJS -gt 1MB) { "Yellow" } else { "Green" })
    
    if ($jsFiles) {
        Write-Host ""
        Write-Host "Detail :" -ForegroundColor Cyan
        $jsFiles | Sort-Object Length -Descending | Select-Object -First 5 | ForEach-Object {
            Write-Host ("  {0} - {1} KB" -f $_.Name, [math]::Round($_.Length / 1KB, 1)) -ForegroundColor White
        }
    }
} else {
    Write-Host "Lancer 'npm run build' d'abord" -ForegroundColor DarkGray
}

# ============================================================
# 4. Taille des composants (top 15)
# ============================================================
Write-Host ""
Write-Host "=== 4. TOP 15 COMPOSANTS LES PLUS GROS ===" -ForegroundColor Yellow
Write-Host ""

$components = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    Sort-Object Length -Descending |
    Select-Object -First 15

$components | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 1)
    $name = $_.Name
    $color = if ($_.Length -gt 50KB) { "Red" } elseif ($_.Length -gt 30KB) { "Yellow" } else { "White" }
    Write-Host ("  {0,6} KB  {1}" -f $size, $name) -ForegroundColor $color
}

# ============================================================
# 5. Recherche de select('*')
# ============================================================
Write-Host ""
Write-Host "=== 5. REQUETES select('*') (payload lourd) ===" -ForegroundColor Yellow
Write-Host ""

$selectAll = 0
$tablesWithSelectAll = @()

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $matches = [regex]::Matches($content, "\.from\(['\`"]([a-z_]+)['\`"]\)\s*\.select\(['\`"]\*['\`"]\)")
    foreach ($m in $matches) {
        $selectAll++
        $tablesWithSelectAll += $m.Groups[1].Value
    }
}

Write-Host ("Total select('*') : {0}" -f $selectAll) -ForegroundColor $(if ($selectAll -gt 30) { "Yellow" } else { "Green" })
Write-Host ""
Write-Host "Par table :" -ForegroundColor Cyan
$tablesWithSelectAll | Group-Object | Sort-Object Count -Descending | Select-Object -First 15 | ForEach-Object {
    Write-Host ("  {0,3} select(*) -> {1}" -f $_.Count, $_.Name) -ForegroundColor White
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  FIN DIAGNOSTIC - Colle-moi tout le resultat" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
