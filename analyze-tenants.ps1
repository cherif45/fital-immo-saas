# ============================================================
# ANALYSE - filteredTenants dans TenantsView.tsx
# ============================================================

$filePath = "src\components\TenantsView.tsx"
$lines = Get-Content $filePath

Write-Host ""
Write-Host "=== RECHERCHE de filteredTenants ===" -ForegroundColor Cyan
Write-Host ""

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "filteredTenants\s*=" -or $lines[$i] -match "const filteredTenants") {
        Write-Host ("Trouve ligne {0}" -f ($i + 1)) -ForegroundColor Green
        Write-Host ""
        
        # Contexte : 10 lignes avant, 10 apres
        $start = [Math]::Max(0, $i - 10)
        $end = [Math]::Min($lines.Count - 1, $i + 15)
        
        for ($j = $start; $j -le $end; $j++) {
            $marker = if ($j -eq $i) { ">>>" } else { "   " }
            $color = if ($marker -eq ">>>") { "Yellow" } else { "White" }
            Write-Host ("{0} {1,4}: {2}" -f $marker, ($j + 1), $lines[$j]) -ForegroundColor $color
        }
        Write-Host ""
        break
    }
}

# Rechercher aussi les imports en haut
Write-Host "=== IMPORTS (premieres 40 lignes) ===" -ForegroundColor Cyan
for ($i = 0; $i -lt [Math]::Min(40, $lines.Count); $i++) {
    Write-Host ("  {0,3}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
}
