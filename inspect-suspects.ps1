# ============================================================
# INSPECTION DES 5 useEffect SUSPECTS (listener sans cleanup)
# ============================================================

$suspects = @(
    @{ Fichier = "src\components\AgencySettingsView.tsx"; Ligne = 25 },
    @{ Fichier = "src\components\AutomatedRemindersView.tsx"; Ligne = 181 },
    @{ Fichier = "src\components\SettingsView.tsx"; Ligne = 27 },
    @{ Fichier = "src\App.tsx"; Ligne = 286 },
    @{ Fichier = "src\App.tsx"; Ligne = 357 }
)

foreach ($s in $suspects) {
    Write-Host ""
    Write-Host ("==================================================") -ForegroundColor Cyan
    Write-Host ("  {0}:{1}" -f $s.Fichier, $s.Ligne) -ForegroundColor Cyan
    Write-Host ("==================================================") -ForegroundColor Cyan
    
    if (-not (Test-Path $s.Fichier)) {
        Write-Host "Fichier absent" -ForegroundColor Red
        continue
    }
    
    $lines = Get-Content $s.Fichier
    $start = [Math]::Max(0, $s.Ligne - 3)
    $end = [Math]::Min($lines.Count - 1, $s.Ligne + 30)
    
    for ($i = $start; $i -le $end; $i++) {
        $marker = if ($i -eq ($s.Ligne - 1)) { ">>>" } else { "   " }
        $color = if ($marker -eq ">>>") { "Yellow" } else { "White" }
        Write-Host ("{0} {1,4}: {2}" -f $marker, ($i + 1), $lines[$i]) -ForegroundColor $color
    }
}
