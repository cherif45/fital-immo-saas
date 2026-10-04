# ============================================================
# NETTOYAGE - Fermer tous les processus Node
# ============================================================

Write-Host ""
Write-Host "=== Fermeture de tous les processus Node ===" -ForegroundColor Cyan
Write-Host ""

# Lister les processus Node
$nodes = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodes) {
    Write-Host ("{0} processus Node en cours" -f $nodes.Count) -ForegroundColor Yellow
    foreach ($n in $nodes) {
        Write-Host ("  PID {0} - {1}" -f $n.Id, $n.ProcessName) -ForegroundColor DarkGray
    }
    
    # Tuer tous les processus Node
    $nodes | Stop-Process -Force
    Write-Host ""
    Write-Host "Tous les processus Node arretes" -ForegroundColor Green
} else {
    Write-Host "Aucun processus Node en cours" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Verification des ports ===" -ForegroundColor Cyan
Write-Host ""

$ports = @(3000, 4173, 5173)
foreach ($port in $ports) {
    $test = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -InformationLevel Quiet
    $status = if ($test) { "OCCUPE" } else { "LIBRE" }
    $color = if ($test) { "Red" } else { "Green" }
    Write-Host ("  Port {0} : {1}" -f $port, $status) -ForegroundColor $color
}

Write-Host ""
Write-Host "=== Pret pour le prochain test ===" -ForegroundColor Green
Write-Host ""
Write-Host "PROCHAINE ETAPE : lancer 'npm run dev'" -ForegroundColor Yellow
