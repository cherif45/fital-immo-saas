# ============================================================
# VERIFICATION - Etat de l'app
# ============================================================

$filePath = "tests\e2e\debug-etat.spec.ts"

$content = @()
$content += "import { test, expect } from '@playwright/test';"
$content += ""
$content += "test('Debug - Etat de la page', async ({ page }) => {"
$content += "  await page.goto('/');"
$content += "  await page.waitForLoadState('networkidle');"
$content += "  await page.waitForTimeout(5000);"
$content += ""
$content += "  const body = await page.locator('body').textContent();"
$content += "  console.log('');"
$content += "  console.log('=== ANALYSE DE LA PAGE ===');"
$content += "  console.log('Body length : ' + (body?.length || 0));"
$content += "  console.log('Body extrait (500 chars) :');"
$content += "  console.log((body || '').substring(0, 500));"
$content += "  console.log('');"
$content += ""
$content += "  // Compter les elements cliquables"
$content += "  const links = await page.locator('a').count();"
$content += "  const buttons = await page.locator('button').count();"
$content += "  const navs = await page.locator('nav').count();"
$content += "  const asides = await page.locator('aside').count();"
$content += ""
$content += "  console.log('Liens <a> : ' + links);"
$content += "  console.log('Boutons <button> : ' + buttons);"
$content += "  console.log('Nav <nav> : ' + navs);"
$content += "  console.log('Aside <aside> : ' + asides);"
$content += "  console.log('');"
$content += ""
$content += "  // Chercher LoginView ou Dashboard"
$content += "  const hasLogin = (body || '').includes('Connexion') || (body || '').includes('Email') || (body || '').includes('Mot de passe');"
$content += "  const hasDashboard = (body || '').includes('Dashboard') || (body || '').includes('Tableau');"
$content += ""
$content += "  console.log('LoginView detecte : ' + hasLogin);"
$content += "  console.log('Dashboard detecte : ' + hasDashboard);"
$content += "  console.log('');"
$content += ""
$content += "  // Screenshot"
$content += "  await page.screenshot({ path: 'tests/debug-page.png', fullPage: false });"
$content += "  console.log('Screenshot : tests/debug-page.png');"
$content += "});"

$filePath = Join-Path $PWD.Path $filePath
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, ($content -join "`r`n"), $utf8NoBom)

Write-Host "OK - Fichier debug cree" -ForegroundColor Green
Write-Host ""

# Lancer le debug
Write-Host "Lancement du debug..." -ForegroundColor Cyan
npx playwright test tests/e2e/debug-etat.spec.ts --reporter=list
