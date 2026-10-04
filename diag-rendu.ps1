# Voir le rendu de filtered (ligne 303)
$filePath = "src\components\ArchiveView.tsx"
$lines = Get-Content $filePath

Write-Host ""
Write-Host "=== Contexte du rendu (lignes 290-380) ===" -ForegroundColor Cyan
for ($i = 289; $i -lt [Math]::Min(380, $lines.Count); $i++) {
    Write-Host ("  {0,3}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
}
