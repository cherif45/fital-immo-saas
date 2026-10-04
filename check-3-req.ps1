# ============================================================
# VERIFICATION DES 3 REQUETES CRITIQUES dans service.ts
# Lignes 1178, 1211, 1220
# ============================================================

$filePath = "src\lib\supabase\service.ts"

if (-not (Test-Path $filePath)) {
    Write-Host "Fichier absent" -ForegroundColor Red
    exit
}

$lines = Get-Content $filePath
Write-Host ("Total lignes : {0}" -f $lines.Count) -ForegroundColor Cyan
Write-Host ""

foreach ($target in @(1178, 1211, 1220)) {
    if ($target -gt $lines.Count) {
        Write-Host ("Ligne {0} au-dela du fichier" -f $target) -ForegroundColor Yellow
        continue
    }
    
    Write-Host ("==================================================") -ForegroundColor Cyan
    Write-Host ("  Contexte ligne {0}" -f $target) -ForegroundColor Cyan
    Write-Host ("==================================================") -ForegroundColor Cyan
    
    $start = [Math]::Max(0, $target - 8)
    $end = [Math]::Min($lines.Count - 1, $target + 8)
    
    for ($i = $start; $i -le $end; $i++) {
        $marker = if ($i -eq ($target - 1)) { ">>>" } else { "   " }
        $color = if ($marker -eq ">>>") { "Yellow" } else { "White" }
        Write-Host ("{0} {1,4}: {2}" -f $marker, ($i + 1), $lines[$i]) -ForegroundColor $color
    }
    Write-Host ""
}
