# ============================================================
# AUDIT ENCODAGE — Détection des fichiers corrompus (UTF-8 mal interprété)
# ============================================================

$corruptionPatterns = @(
    [char]0xC3 + [char]0xA9,   # é mal encodé
    [char]0xC3 + [char]0xA8,   # è mal encodé
    [char]0xC3 + [char]0xA0,   # à mal encodé
    [char]0xC3 + [char]0xA2,   # â mal encodé
    [char]0xC3 + [char]0xA7,   # ç mal encodé
    [char]0xC3 + [char]0xAE,   # î mal encodé
    [char]0xC3 + [char]0xB4,   # ô mal encodé
    [char]0xC3 + [char]0xB9,   # ù mal encodé
    [char]0xC3 + [char]0xBB,   # û mal encodé
    [char]0xE2 + [char]0x82 + [char]0xAC,  # € mal encodé
    [char]0xE2 + [char]0x80 + [char]0x99,  # ' mal encodé
    [char]0xE2 + [char]0x80 + [char]0x9C,  # " mal encodé
    [char]0xE2 + [char]0x80 + [char]0x9D,  # " mal encodé
    [char]0xE2 + [char]0x80 + [char]0x94,  # — mal encodé
    [char]0xE2 + [char]0x80 + [char]0x93,  # – mal encodé
    [char]0xC2 + [char]0xB0    # ° mal encodé
)

$corruptedFiles = @()
$totalMatchCount = 0

Write-Host ""
Write-Host "Scan de src/ ..." -ForegroundColor Yellow

$srcFiles = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts","*.css" -ErrorAction SilentlyContinue

foreach ($file in $srcFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }

    $matchCount = 0
    foreach ($pattern in $corruptionPatterns) {
        $matchCount += ([regex]::Matches($content, [regex]::Escape($pattern))).Count
    }

    if ($matchCount -gt 0) {
        $relativePath = $file.FullName.Replace($PWD.Path + '\', '')
        $corruptedFiles += [PSCustomObject]@{
            Fichier = $relativePath
            Occurrences = $matchCount
        }
        $totalMatchCount += $matchCount
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  FICHIERS CORROMPUS (src/)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan

if ($corruptedFiles.Count -eq 0) {
    Write-Host "OK — Aucun fichier corrompu dans src/" -ForegroundColor Green
} else {
    $corruptedFiles | Sort-Object Occurrences -Descending | Format-Table -AutoSize
    Write-Host "ATTENTION : $($corruptedFiles.Count) fichiers corrompus, $totalMatchCount occurrences totales" -ForegroundColor Red
}

# Vérifier index.html et public/
Write-Host ""
Write-Host "Scan de index.html et public/ ..." -ForegroundColor Yellow

$otherFiles = @()
if (Test-Path "index.html") { $otherFiles += "index.html" }

Get-ChildItem -Path "public" -Recurse -Include "*.html","*.json","*.js" -ErrorAction SilentlyContinue |
    ForEach-Object { $otherFiles += $_.FullName }

$otherCorrupted = 0
foreach ($f in $otherFiles) {
    if (Test-Path $f) {
        $content = Get-Content $f -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        $matchCount = 0
        foreach ($pattern in $corruptionPatterns) {
            $matchCount += ([regex]::Matches($content, [regex]::Escape($pattern))).Count
        }
        if ($matchCount -gt 0) {
            Write-Host "  ATTENTION : $f — $matchCount occurrences" -ForegroundColor Yellow
            $otherCorrupted++
        }
    }
}
if ($otherCorrupted -eq 0) {
    Write-Host "OK — Aucun fichier corrompu hors src/" -ForegroundColor Green
}

# Statistiques
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  STATISTIQUES GLOBALES" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan

$totalSrcFiles = $srcFiles.Count
$totalCorrupted = $corruptedFiles.Count

Write-Host "  Total fichiers src/  : $totalSrcFiles"
Write-Host "  Fichiers corrompus   : $totalCorrupted"
if ($totalSrcFiles -gt 0) {
    $taux = [math]::Round(($totalCorrupted / $totalSrcFiles) * 100, 1)
    Write-Host "  Taux de corruption   : $taux%"
}
Write-Host ""
