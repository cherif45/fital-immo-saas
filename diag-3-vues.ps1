# ============================================================
# DIAGNOSTIC - Filtres dans les 3 vues restantes
# ============================================================

$files = @(
    @{ File = "src\components\PaymentsView.tsx"; Filter = "filteredPayments" },
    @{ File = "src\components\PenaltiesView.tsx"; Filter = "filteredPenalties" },
    @{ File = "src\components\ActivityLogView.tsx"; Filter = "sortedActivities" }
)

foreach ($f in $files) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host ("  {0}" -f $f.File) -ForegroundColor Cyan
    Write-Host ("  Filtre : {0}" -f $f.Filter) -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
    
    if (-not (Test-Path $f.File)) {
        Write-Host "Fichier absent" -ForegroundColor Red
        continue
    }
    
    $lines = Get-Content $f.File
    
    # 1. Import React
    $importLine = $lines | Select-String "from 'react'" | Select-Object -First 1
    if ($importLine) {
        $hasUseMemo = $importLine.Line -match "useMemo"
        Write-Host ("Import : {0}" -f $importLine.Line.Trim()) -ForegroundColor White
        Write-Host ("  useMemo : {0}" -f $(if ($hasUseMemo) { "OUI" } else { "NON" })) -ForegroundColor $(if ($hasUseMemo) { "Green" } else { "Yellow" })
    } else {
        Write-Host "Import React non trouve" -ForegroundColor Red
    }
    
    # 2. Definition du filtre
    Write-Host ""
    Write-Host ("Definition de '{0}' :" -f $f.Filter) -ForegroundColor Yellow
    $found = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match ("const\s+{0}\s*=" -f [regex]::Escape($f.Filter))) {
            Write-Host ("  Ligne {0}" -f ($i + 1)) -ForegroundColor Green
            Write-Host ""
            
            $start = [Math]::Max(0, $i - 2)
            $end = [Math]::Min($lines.Count - 1, $i + 25)
            
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
        Write-Host "  Non trouve" -ForegroundColor Red
    }
}
