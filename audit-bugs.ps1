# ============================================================
# PHASE 4 - AUDIT BUGS FONCTIONNELS
# Cartographie des useEffect
# ============================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  PHASE 4 - BUGS FONCTIONNELS" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 1. Compter les useEffect
# ============================================================
Write-Host "=== 1. NOMBRE DE useEffect PAR FICHIER ===" -ForegroundColor Yellow
Write-Host ""

$files = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" }

$totalUseEffects = 0
$filesWithEffects = @()

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $count = ([regex]::Matches($content, "useEffect\s*\(")).Count
    if ($count -gt 0) {
        $filesWithEffects += [PSCustomObject]@{
            Fichier = $file.FullName.Replace($PWD.Path + '\', '')
            NbUseEffect = $count
        }
        $totalUseEffects += $count
    }
}

Write-Host ("Total useEffect : {0}" -f $totalUseEffects) -ForegroundColor Cyan
Write-Host ("Fichiers concernes : {0}" -f $filesWithEffects.Count) -ForegroundColor Cyan
Write-Host ""
Write-Host "Top 15 des fichiers :" -ForegroundColor Yellow
$filesWithEffects | Sort-Object NbUseEffect -Descending | Select-Object -First 15 | Format-Table -AutoSize

# ============================================================
# 2. Chercher useEffect SANS cleanup function
# ============================================================
Write-Host ""
Write-Host "=== 2. useEffect SANS CLEANUP (memory leak potentiel) ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Recherche des useEffect avec addEventListener/setInterval/setTimeout SANS return" -ForegroundColor DarkGray
Write-Host ""

$leakSuspects = @()

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $lines = $content -split "`r?`n"

    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "useEffect\s*\(") {
            # Chercher la fin du useEffect (approx : 30 lignes)
            $blockEnd = [Math]::Min($i + 40, $lines.Count - 1)
            $block = ""
            for ($j = $i; $j -le $blockEnd; $j++) {
                $block += $lines[$j] + "`n"
            }
            
            $hasListener = $block -match "addEventListener|setInterval|setTimeout|subscribe|WebSocket|setSubscription"
            $hasCleanup = $block -match "return\s*\(\s*\)\s*=>|return\s+function|clearInterval|clearTimeout|removeEventListener|unsubscribe|\.unsubscribe"
            
            if ($hasListener -and -not $hasCleanup) {
                $leakSuspects += [PSCustomObject]@{
                    Fichier = $file.Name
                    Ligne = $i + 1
                    Type = "Listener sans cleanup"
                }
            }
        }
    }
}

if ($leakSuspects.Count -eq 0) {
    Write-Host "  OK - Aucun useEffect avec listener sans cleanup detecte" -ForegroundColor Green
} else {
    Write-Host ("  ATTENTION : {0} useEffect avec listener sans cleanup" -f $leakSuspects.Count) -ForegroundColor Yellow
    $leakSuspects | Select-Object -First 20 | Format-Table -AutoSize
}

# ============================================================
# 3. Chercher useEffect avec fetch SANS AbortController
# ============================================================
Write-Host ""
Write-Host "=== 3. useEffect avec FETCH (race condition potentielle) ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "Recherche des useEffect qui font des fetch sans cleanup" -ForegroundColor DarkGray
Write-Host ""

$fetchSuspects = @()

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $lines = $content -split "`r?`n"

    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "useEffect\s*\(") {
            $blockEnd = [Math]::Min($i + 50, $lines.Count - 1)
            $block = ""
            for ($j = $i; $j -le $blockEnd; $j++) {
                $block += $lines[$j] + "`n"
            }
            
            $hasFetch = $block -match "\bfetch\s*\(|await\s+supabase|\.from\("
            $hasCleanup = $block -match "AbortController|cancelled|isMounted|ignore\s*=\s*true"
            
            if ($hasFetch -and -not $hasCleanup) {
                $fetchSuspects += [PSCustomObject]@{
                    Fichier = $file.Name
                    Ligne = $i + 1
                    Type = "Fetch sans AbortController"
                }
            }
        }
    }
}

if ($fetchSuspects.Count -eq 0) {
    Write-Host "  OK - Aucun useEffect avec fetch sans cleanup" -ForegroundColor Green
} else {
    Write-Host ("  INFO : {0} useEffect avec fetch sans AbortController" -f $fetchSuspects.Count) -ForegroundColor Cyan
    Write-Host "  (Peut etre OK si le fetch est rapide et idempotent)" -ForegroundColor DarkGray
    $fetchSuspects | Select-Object -First 10 | Format-Table -AutoSize
}

# ============================================================
# 4. Chercher useEffect avec deps instables (objets/arrays)
# ============================================================
Write-Host ""
Write-Host "=== 4. useEffect avec deps vides MAIS dependances internes ===" -ForegroundColor Yellow
Write-Host ""

$depsSuspects = @()

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    # Chercher useEffect(fn, []) - array vide
    $matches = [regex]::Matches($content, "useEffect\s*\([^,]+,\s*\[\s*\]\s*\)")
    if ($matches.Count -gt 0) {
        $depsSuspects += [PSCustomObject]@{
            Fichier = $file.Name
            Count = $matches.Count
        }
    }
}

if ($depsSuspects.Count -eq 0) {
    Write-Host "  Aucun useEffect avec deps vides" -ForegroundColor DarkGray
} else {
    Write-Host ("  {0} fichiers avec useEffect(fn, [])" -f $depsSuspects.Count) -ForegroundColor Cyan
    Write-Host "  (A verifier : les variables utilisees dans fn sont-elles vraiment stables ?)" -ForegroundColor DarkGray
    $depsSuspects | Sort-Object Count -Descending | Select-Object -First 10 | Format-Table -AutoSize
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  FIN DIAGNOSTIC - Colle-moi tout le resultat" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
