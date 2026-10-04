# ============================================================
# VERIFICATION - locaux_map utilisee quelque part ?
# ============================================================

Write-Host ""
Write-Host "=== Recherche de 'locaux_map' dans TOUT le projet ===" -ForegroundColor Cyan
Write-Host ""

# 1. Dans le code TypeScript/React
Write-Host "--- Code TS/TSX ---" -ForegroundColor Yellow
$codeRefs = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    Select-String -Pattern "locaux_map" -ErrorAction SilentlyContinue

if ($codeRefs) {
    $codeRefs | ForEach-Object {
        Write-Host ("  {0}:{1}" -f $_.Path.Replace($PWD.Path + '\', ''), $_.LineNumber) -ForegroundColor Red
        Write-Host ("    {0}" -f $_.Line.Trim()) -ForegroundColor DarkGray
    }
} else {
    Write-Host "  Aucune reference dans le code TS/TSX" -ForegroundColor Green
}

# 2. Dans les fichiers SQL
Write-Host ""
Write-Host "--- Fichiers SQL ---" -ForegroundColor Yellow
$sqlRefs = Get-ChildItem -Path "." -Recurse -Include "*.sql" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|\.git|\._backups" } |
    Select-String -Pattern "locaux_map" -ErrorAction SilentlyContinue

if ($sqlRefs) {
    $sqlRefs | ForEach-Object {
        Write-Host ("  {0}:{1}" -f $_.Path.Replace($PWD.Path + '\', ''), $_.LineNumber) -ForegroundColor Red
    }
} else {
    Write-Host "  Aucune reference dans les fichiers SQL" -ForegroundColor Green
}

# 3. Dans les autres fichiers (json, md, etc.)
Write-Host ""
Write-Host "--- Autres fichiers ---" -ForegroundColor Yellow
$otherRefs = Get-ChildItem -Path "." -Recurse -Include "*.json","*.md","*.txt" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups|package-lock" } |
    Select-String -Pattern "locaux_map" -ErrorAction SilentlyContinue

if ($otherRefs) {
    $otherRefs | ForEach-Object {
        Write-Host ("  {0}:{1}" -f $_.Path.Replace($PWD.Path + '\', ''), $_.LineNumber) -ForegroundColor Yellow
    }
} else {
    Write-Host "  Aucune reference dans les autres fichiers" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== VERDICT ===" -ForegroundColor Cyan
$totalRefs = @($codeRefs).Count + @($sqlRefs).Count + @($otherRefs).Count
if ($totalRefs -eq 0) {
    Write-Host "SUPPRESSION SANS RISQUE" -ForegroundColor Green
    Write-Host "Aucune reference a locaux_map dans le projet." -ForegroundColor Green
} else {
    Write-Host ("ATTENTION : {0} references trouvees" -f $totalRefs) -ForegroundColor Red
    Write-Host "Verifier avant de supprimer." -ForegroundColor Red
}
