# ============================================================
# FIX - Corriger la ligne 161 (searchInput)
# ============================================================

$filePath = "tests\e2e\integrite.spec.ts"

if (-not (Test-Path $filePath)) {
    Write-Host "Fichier non cree - il faut relancer le script complet" -ForegroundColor Red
    Write-Host ""
    Write-Host "Utilise cette commande pour creer le fichier directement :" -ForegroundColor Yellow
    Write-Host "  (Voir bloc ci-dessous)" -ForegroundColor Yellow
    exit
}

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Remplacer la ligne problematique
$oldLine = 'const searchInput = page.locator(''input[type="text"]'').first();'
$newLine = 'const searchInput = page.locator(''input[type="text"]'').first();'

if ($content.Contains($oldLine)) {
    Write-Host "Ligne deja OK" -ForegroundColor Green
} else {
    Write-Host "Correction de la ligne..." -ForegroundColor Yellow
    
    # Chercher la ligne avec searchInput
    $lines = $content -split "`r?`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "searchInput.*page\.locator") {
            Write-Host ("  Avant : {0}" -f $lines[$i]) -ForegroundColor White
            $lines[$i] = '  const searchInput = page.locator(''input[type="text"]'').first();'
            Write-Host ("  Apres : {0}" -f $lines[$i]) -ForegroundColor Green
        }
    }
    
    $newContent = $lines -join "`r`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($filePath, $newContent, $utf8NoBom)
    
    Write-Host ""
    Write-Host "Fichier corrige" -ForegroundColor Green
}
