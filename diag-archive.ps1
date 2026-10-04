# ============================================================
# DIAGNOSTIC - ArchiveView.tsx
# Voir tous les useMemo, filter, sort, map
# ============================================================

$filePath = "src\components\ArchiveView.tsx"
$lines = Get-Content $filePath

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  ANALYSE ArchiveView.tsx" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ("  Taille : {0} KB / {1} lignes" -f [math]::Round((Get-Item $filePath).Length / 1KB, 1), $lines.Count) -ForegroundColor White
Write-Host ""

# 1. Import React
$importLine = $lines | Select-String "from 'react'" | Select-Object -First 1
Write-Host "Import React :" -ForegroundColor Yellow
Write-Host ("  {0}" -f $importLine.Line.Trim()) -ForegroundColor White
Write-Host ""

# 2. Tous les useMemo
Write-Host "=== useMemo utilises ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "useMemo\(") {
        Write-Host ("  Ligne {0} : {1}" -f ($i + 1), $lines[$i].Trim()) -ForegroundColor Green
        
        # Afficher la fermeture
        $openCount = 1
        for ($j = $i + 1; $j -lt [Math]::Min($i + 50, $lines.Count); $j++) {
            $openCount += ([regex]::Matches($lines[$j], '\(')).Count
            $openCount -= ([regex]::Matches($lines[$j], '\)')).Count
            
            if ($openCount -le 0) {
                Write-Host ("       -> ferme L{0}" -f ($j + 1)) -ForegroundColor DarkGray
                # Afficher la ligne de deps
                Write-Host ("       {0}" -f $lines[$j].Trim()) -ForegroundColor DarkGray
                break
            }
        }
        Write-Host ""
    }
}

# 3. Filtres
Write-Host "=== Filtres / .filter() ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "\.filter\(" -and $lines[$i] -notmatch "//") {
        Write-Host ("  Ligne {0} : {1}" -f ($i + 1), $lines[$i].Trim().Substring(0, [Math]::Min(120, $lines[$i].Trim().Length))) -ForegroundColor White
    }
}

# 4. Tris / .sort()
Write-Host ""
Write-Host "=== Tris / .sort() ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "\.sort\(" -and $lines[$i] -notmatch "//") {
        Write-Host ("  Ligne {0} : {1}" -f ($i + 1), $lines[$i].Trim().Substring(0, [Math]::Min(120, $lines[$i].Trim().Length))) -ForegroundColor White
    }
}

# 5. Boucles de rendu / .map()
Write-Host ""
Write-Host "=== Boucles de rendu / .map() ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "\.map\(" -and $lines[$i] -notmatch "//") {
        Write-Host ("  Ligne {0} : {1}" -f ($i + 1), $lines[$i].Trim().Substring(0, [Math]::Min(120, $lines[$i].Trim().Length))) -ForegroundColor White
    }
}

# 6. Chargement de donnees
Write-Host ""
Write-Host "=== Chargement de donnees (useEffect, fetch, load) ===" -ForegroundColor Yellow
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "useEffect\(" -or $lines[$i] -match "fetchArchives" -or $lines[$i] -match "await.*[Ff]rom\(") {
        Write-Host ("  Ligne {0} : {1}" -f ($i + 1), $lines[$i].Trim().Substring(0, [Math]::Min(120, $lines[$i].Trim().Length))) -ForegroundColor White
    }
}

# 7. Props recues
Write-Host ""
Write-Host "=== Props recues (interface) ===" -ForegroundColor Yellow
$inInterface = $false
for ($i = 0; $i -lt [Math]::Min(100, $lines.Count); $i++) {
    if ($lines[$i] -match "interface ArchiveViewProps") {
        $inInterface = $true
    }
    if ($inInterface) {
        Write-Host ("  L{0} : {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
        if ($lines[$i] -match "^\}") {
            break
        }
    }
}
