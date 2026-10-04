# ============================================================
# FIX - Corriger les 2 erreurs de migration
# ============================================================

$filePath = "src\App.tsx"

# Backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $filePath "$filePath.before-syntax-fix-$timestamp.bak" -Force
Write-Host "Backup cree" -ForegroundColor Green
Write-Host ""

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# FIX 1 : Ajouter </ViewLoader> avant le ; sur la ligne de LazyThemePreview
$content = $content -replace '(<LazyThemePreview onBack=\{\(\) => setShowThemePreview\(false\)\} />)(;)', '$1</ViewLoader>$2'
Write-Host "FIX 1 : LazyThemePreview corrige" -ForegroundColor Green

# FIX 2 : Retirer les </ViewLoader> orphelins apres <Sidebar />
# Pattern : on cherche les </ViewLoader> qui suivent immediatement un composant SANS ViewLoader correspondant
# Approche ciblee : retirer </ViewLoader> sur la meme ligne que des composants qui ne sont pas Lazy
$content = $content -replace '(<Sidebar\s[^>]*?) /></ViewLoader>', '$1 />'
Write-Host "FIX 2 : Sidebar nettoye" -ForegroundColor Green

# Ecrire
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
$final = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $final -split "`r?`n"

Write-Host ""
Write-Host "Lignes 1355-1365 :" -ForegroundColor Yellow
for ($i = 1354; $i -lt [Math]::Min(1365, $lines.Count); $i++) {
    Write-Host ("  {0,4}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
}

Write-Host ""
Write-Host "Lignes 1378-1390 :" -ForegroundColor Yellow
for ($i = 1377; $i -lt [Math]::Min(1390, $lines.Count); $i++) {
    Write-Host ("  {0,4}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
}
