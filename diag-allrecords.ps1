# ============================================================
# Voir les useMemo en detail
# ============================================================

$filePath = "src\components\ArchiveView.tsx"
$lines = Get-Content $filePath

Write-Host ""
Write-Host "=== useMemo ligne 91 (allRecords) ===" -ForegroundColor Cyan
for ($i = 88; $i -lt [Math]::Min(190, $lines.Count); $i++) {
    Write-Host ("  {0,3}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
}
