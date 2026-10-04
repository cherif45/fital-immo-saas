# ============================================================
# FIX 3 - Wrapper MobileMoneyPaymentModal dans Suspense
# ============================================================

$filePath = "src\components\TenantsView.tsx"
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $content -split "`r?`n"

# Trouver l'usage de <MobileMoneyPaymentModal
$startLine = -1
$endLine = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "<MobileMoneyPaymentModal") {
        $startLine = $i
        # Trouver la fermeture />
        for ($j = $i; $j -lt [Math]::Min($i + 20, $lines.Count); $j++) {
            if ($lines[$j] -match "/>\s*$") {
                $endLine = $j
                break
            }
        }
        break
    }
}

if ($startLine -lt 0) {
    Write-Host "MobileMoneyPaymentModal non trouve" -ForegroundColor Red
    exit
}

Write-Host ("Bloc trouve : lignes {0} a {1}" -f ($startLine + 1), ($endLine + 1)) -ForegroundColor Cyan
Write-Host ""
Write-Host "=== AVANT ===" -ForegroundColor Yellow
for ($i = [Math]::Max(0, $startLine - 2); $i -le [Math]::Min($lines.Count - 1, $endLine + 2); $i++) {
    Write-Host ("  {0,4}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
}

# Wrapper : ajouter <Suspense fallback={null}> avant et </Suspense> apres
# On l'insere sur la meme ligne du composant pour ne pas casser l'indentation
$lines[$startLine] = $lines[$startLine] -replace "<MobileMoneyPaymentModal", "<Suspense fallback={null}><MobileMoneyPaymentModal"
$lines[$endLine] = $lines[$endLine] -replace "/>\s*$", "/></Suspense>"

Write-Host ""
Write-Host "=== APRES ===" -ForegroundColor Green
for ($i = [Math]::Max(0, $startLine - 2); $i -le [Math]::Min($lines.Count - 1, $endLine + 2); $i++) {
    Write-Host ("  {0,4}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
}

# Ecrire
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, ($lines -join "`r`n"), $utf8NoBom)

Write-Host ""
Write-Host "Fichier sauvegarde" -ForegroundColor Green
