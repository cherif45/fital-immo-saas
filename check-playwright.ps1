# ============================================================
# VERIFICATION PLAYWRIGHT
# ============================================================

Write-Host ""
Write-Host "=== Verification Playwright ===" -ForegroundColor Cyan
Write-Host ""

# Verifier playwright.config.ts
if (Test-Path "playwright.config.ts") {
    Write-Host "OK - playwright.config.ts existe" -ForegroundColor Green
} else {
    Write-Host "MANQUE - playwright.config.ts" -ForegroundColor Red
}

# Verifier dossier tests
if (Test-Path "tests\e2e") {
    Write-Host "OK - tests\e2e existe" -ForegroundColor Green
    Get-ChildItem "tests\e2e" | ForEach-Object {
        Write-Host ("     {0}" -f $_.Name) -ForegroundColor DarkGray
    }
} else {
    Write-Host "Creation dossier tests\e2e..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "tests\e2e" -Force | Out-Null
}

# Verifier package.json
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
$hasPlaywright = $pkg.devDependencies.'@playwright/test' -ne $null
if ($hasPlaywright) {
    Write-Host ("OK - @playwright/test {0}" -f $pkg.devDependencies.'@playwright/test') -ForegroundColor Green
} else {
    Write-Host "MANQUE - @playwright/test" -ForegroundColor Red
}
