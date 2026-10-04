# ============================================================
# DETAIL DES REQUETES SUSPECTES dans service.ts
# ============================================================

Write-Host ""
Write-Host "=== Extraction des fonctions CRUD dans service.ts ===" -ForegroundColor Cyan
Write-Host ""

$filePath = "src\lib\supabase\service.ts"
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $content -split "`r?`n"

# Lignes suspectes (issues du scan precedent)
$suspectLines = @(713, 716, 717, 718, 719, 969, 979, 1002, 1011, 1034, 1043, 1065, 1074, 1100, 1110, 1150, 1169, 1202, 1244, 1274, 1306, 1339, 1384, 1435, 1457, 1500)

# Pour chaque ligne, afficher un contexte de 20 lignes avant/apres
foreach ($lineNum in $suspectLines | Select-Object -First 8) {
    $start = [Math]::Max(0, $lineNum - 1)
    $end = [Math]::Min($lines.Count - 1, $lineNum + 25)
    
    Write-Host ""
    Write-Host ("========== Ligne {0} ==========" -f $lineNum) -ForegroundColor Yellow
    
    for ($i = $start; $i -le $end; $i++) {
        $marker = if ($i -eq ($lineNum - 1)) { ">>>" } else { "   " }
        $color = if ($marker -eq ">>>") { "Red" } else { "White" }
        Write-Host ("{0} {1,4}: {2}" -f $marker, ($i + 1), $lines[$i]) -ForegroundColor $color
    }
}
