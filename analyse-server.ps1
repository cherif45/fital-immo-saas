# ============================================================
# ANALYSE server.ts - Voir la structure complete
# ============================================================

$filePath = "server.ts"
$lines = Get-Content $filePath

Write-Host ""
Write-Host "=== server.ts - Analyse complete ===" -ForegroundColor Cyan
Write-Host "  Total : $($lines.Count) lignes" -ForegroundColor White
Write-Host ""

# Chercher les points critiques
Write-Host "=== Points critiques ===" -ForegroundColor Yellow
Write-Host ""

foreach ($pattern in @("app.listen", "export default", "export {", "startServer", "createViteServer", "/api/", "cron/reminders")) {
    $found = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match [regex]::Escape($pattern)) {
            $found += [PSCustomObject]@{
                Ligne = $i + 1
                Content = $lines[$i].Trim().Substring(0, [Math]::Min(100, $lines[$i].Trim().Length))
            }
        }
    }
    if ($found.Count -gt 0) {
        Write-Host ("  {0} ({1} occurrences) :" -f $pattern, $found.Count) -ForegroundColor Green
        $found | ForEach-Object {
            Write-Host ("    L{0} : {1}" -f $_.Ligne, $_.Content) -ForegroundColor DarkGray
        }
    } else {
        Write-Host ("  {0} : ABSENT" -f $pattern) -ForegroundColor DarkGray
    }
    Write-Host ""
}

# Afficher les 30 dernieres lignes (fonction startServer)
Write-Host "=== 30 dernieres lignes ===" -ForegroundColor Yellow
$start = [Math]::Max(0, $lines.Count - 30)
for ($i = $start; $i -lt $lines.Count; $i++) {
    Write-Host ("  {0,3}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
}
