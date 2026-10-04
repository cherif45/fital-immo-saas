# ============================================================
# LECTURE COMPLETE DE server.ts
# ============================================================

Write-Host ""
Write-Host "=== server.ts (fichier complet) ===" -ForegroundColor Cyan
Write-Host ""

$lines = Get-Content "server.ts"
Write-Host ("Total : {0} lignes" -f $lines.Count) -ForegroundColor Yellow
Write-Host ""

for ($i = 0; $i -lt $lines.Count; $i++) {
    Write-Host ("{0,4}: {1}" -f ($i + 1), $lines[$i])
}
