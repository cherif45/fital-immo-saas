# ============================================================
# PHASE 3 - AUDIT ISOLATION MULTI-AGENCE
# Cartographie du filtrage par agencyId
# ============================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  PHASE 3 - ISOLATION MULTI-AGENCE" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 1. Recherche de toutes les requetes Supabase
# ============================================================
Write-Host "=== 1. REQUETES SUPABASE (agencyId filtering) ===" -ForegroundColor Yellow
Write-Host ""

$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" }

$agencyFiltered = @()
$agencyNotFiltered = @()

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $lines = $content -split "`r?`n"
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        # Chercher les appels .from('...')
        if ($line -match "\.from\(['\`"]([a-z_]+)['\`"]\)") {
            $table = $matches[1]
            # Chercher si la ligne contient agencyId ou si les 5 lignes suivantes le contiennent
            $context = ""
            for ($j = $i; $j -lt [Math]::Min($i + 6, $lines.Count); $j++) {
                $context += $lines[$j]
            }
            
            $hasAgencyFilter = $context -match "agency_?[Ii]d"
            
            $info = [PSCustomObject]@{
                Fichier = $file.Name
                Ligne = $i + 1
                Table = $table
                AgencyFilter = $hasAgencyFilter
            }
            
            if ($hasAgencyFilter) {
                $agencyFiltered += $info
            } else {
                $agencyNotFiltered += $info
            }
        }
    }
}

Write-Host ("Requetes AVEC agencyId : {0}" -f $agencyFiltered.Count) -ForegroundColor Green
Write-Host ("Requetes SANS agencyId : {0}" -f $agencyNotFiltered.Count) -ForegroundColor $(if ($agencyNotFiltered.Count -gt 0) { "Red" } else { "Green" })
Write-Host ""

if ($agencyNotFiltered.Count -gt 0) {
    Write-Host "--- Requetes SANS filtrage agencyId (a verifier) ---" -ForegroundColor Red
    Write-Host ""
    $agencyNotFiltered | Select-Object -First 30 | Format-Table -AutoSize
    Write-Host ""
    Write-Host ("Total : {0} requetes a auditer" -f $agencyNotFiltered.Count) -ForegroundColor Yellow
}

# ============================================================
# 2. Recherche de la gestion agencyId (state, context)
# ============================================================
Write-Host ""
Write-Host "=== 2. GESTION agencyId (state, hook, context) ===" -ForegroundColor Yellow
Write-Host ""

$agencyRefs = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    Select-String -Pattern "agencyId" -ErrorAction SilentlyContinue

Write-Host ("{0} references a agencyId dans src/" -f $agencyRefs.Count) -ForegroundColor Cyan
Write-Host ""

# Grouper par fichier
$byFile = $agencyRefs | Group-Object Path | Sort-Object Count -Descending
foreach ($group in $byFile | Select-Object -First 15) {
    $shortPath = $group.Name.Replace($PWD.Path + '\', '')
    Write-Host ("  {0,3} refs -> {1}" -f $group.Count, $shortPath) -ForegroundColor White
}

# ============================================================
# 3. Recherche des RPC (fonctions Postgres)
# ============================================================
Write-Host ""
Write-Host "=== 3. RPC SUPABASE (fonctions Postgres) ===" -ForegroundColor Yellow
Write-Host ""

$rpcRefs = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    Select-String -Pattern "\.rpc\(['\`"]([a-z_]+)" -ErrorAction SilentlyContinue

$rpcNames = @()
foreach ($r in $rpcRefs) {
    if ($r.Line -match "\.rpc\(['\`"]([a-z_]+)") {
        $rpcNames += $matches[1]
    }
}

$uniqueRpcs = $rpcNames | Select-Object -Unique | Sort-Object
Write-Host ("{0} RPC differentes :" -f $uniqueRpcs.Count) -ForegroundColor Cyan
$uniqueRpcs | ForEach-Object { Write-Host ("  - {0}" -f $_) -ForegroundColor White }

# ============================================================
# 4. Recherche du cache local (localStorage)
# ============================================================
Write-Host ""
Write-Host "=== 4. CACHE LOCAL (localStorage) ===" -ForegroundColor Yellow
Write-Host ""

$lsRefs = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    Select-String -Pattern "localStorage\.(setItem|getItem)" -ErrorAction SilentlyContinue

Write-Host ("{0} usages de localStorage" -f $lsRefs.Count) -ForegroundColor Cyan
Write-Host ""

# Extraire les noms de cles
$keys = @()
foreach ($r in $lsRefs) {
    if ($r.Line -match "localStorage\.(setItem|getItem)\(['\`"]([^'\`"]+)") {
        $keys += $matches[2]
    }
}

$uniqueKeys = $keys | Select-Object -Unique | Sort-Object
Write-Host "Cles localStorage utilisees :" -ForegroundColor White
$uniqueKeys | ForEach-Object { Write-Host ("  - {0}" -f $_) -ForegroundColor DarkGray }

# ============================================================
# 5. Recherche de purge a la deconnexion
# ============================================================
Write-Host ""
Write-Host "=== 5. PURGE A LA DECONNEXION (signOut) ===" -ForegroundColor Yellow
Write-Host ""

$signOutRefs = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    Select-String -Pattern "signOut|handleSignOut|clearStorage|logout" -ErrorAction SilentlyContinue

Write-Host ("{0} references a la deconnexion" -f $signOutRefs.Count) -ForegroundColor Cyan
Write-Host ""

$signOutRefs | Select-Object -First 10 | ForEach-Object {
    $shortPath = $_.Path.Replace($PWD.Path + '\', '')
    Write-Host ("  {0}:{1}" -f $shortPath, $_.LineNumber) -ForegroundColor White
    Write-Host ("    {0}" -f $_.Line.Trim().Substring(0, [Math]::Min(100, $_.Line.Trim().Length))) -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  FIN DIAGNOSTIC - Colle-moi tout le resultat" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
