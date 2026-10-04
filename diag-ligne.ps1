# ============================================================
# DIAGNOSTIC DETAILLE - App.tsx ligne 1734 (le bouton casse)
# ============================================================

Write-Host ""
Write-Host "=== BACKUP GLOBAL ===" -ForegroundColor Cyan

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "._backups\avant-correction-encodage-$timestamp"

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Copier les 4 fichiers corrompus
$filesToBackup = @(
    "src\App.tsx",
    "src\components\CashRegisterView.tsx",
    "src\components\InvoicesView.tsx",
    "src\types.ts"
)

foreach ($f in $filesToBackup) {
    $dest = Join-Path $backupDir $f.Replace('\', '_')
    Copy-Item $f $dest -Force
    Write-Host "  Backup : $dest" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== LIGNE 1734 DE App.tsx (contexte 5 lignes) ===" -ForegroundColor Cyan
Write-Host ""

$lines = Get-Content "src\App.tsx"
$start = [Math]::Max(0, 1733 - 5)
$end = [Math]::Min($lines.Count - 1, 1733 + 5)
for ($i = $start; $i -le $end; $i++) {
    $marker = if ($i -eq 1733) { ">>>" } else { "   " }
    Write-Host "$marker $($i + 1): $($lines[$i])"
}

Write-Host ""
Write-Host "=== LIGNE 309 DE NewTenantWizardModal.tsx (version correcte) ===" -ForegroundColor Cyan
Write-Host ""

$lines2 = Get-Content "src\components\NewTenantWizardModal.tsx"
$start2 = [Math]::Max(0, 308 - 5)
$end2 = [Math]::Min($lines2.Count - 1, 308 + 5)
for ($i = $start2; $i -le $end2; $i++) {
    $marker = if ($i -eq 308) { ">>>" } else { "   " }
    Write-Host "$marker $($i + 1): $($lines2[$i])"
}

Write-Host ""
Write-Host "=== TERMINE ===" -ForegroundColor Green
