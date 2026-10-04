# ============================================================
# INSTALLATION DES DEPENDANCES DE SECURITE
# ============================================================

Write-Host ""
Write-Host "=== Installation des dependances de securite ===" -ForegroundColor Cyan
Write-Host ""

npm install express-rate-limit helmet cors
npm install -D @types/cors

Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Cyan
Write-Host ""

$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$deps = $packageJson.dependencies

$checks = @("express-rate-limit", "helmet", "cors")
foreach ($c in $checks) {
    if ($deps.PSObject.Properties.Name -contains $c) {
        Write-Host ("  OK  {0} ({1})" -f $c, $deps.$c) -ForegroundColor Green
    } else {
        Write-Host ("  MANQUE  {0}" -f $c) -ForegroundColor Red
    }
}
