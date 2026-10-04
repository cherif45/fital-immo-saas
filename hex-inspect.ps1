# ============================================================
# AFFICHAGE HEXADECIMAL DES LIGNES CORROMPUES
# Methode : lire les octets bruts, les afficher en hex
# ============================================================

function Show-LineHex {
    param(
        [string]$FilePath,
        [int]$LineNumber
    )
    
    Write-Host ("--- {0} ligne {1} ---" -f $FilePath, $LineNumber) -ForegroundColor Yellow
    
    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    
    # Trouver la ligne (compter les \n)
    $currentLine = 1
    $startPos = 0
    for ($i = 0; $i -lt $bytes.Length; $i++) {
        if ($bytes[$i] -eq 0x0A) {
            if ($currentLine -eq $LineNumber) {
                # Afficher les octets de startPos a i
                $lineBytes = $bytes[$startPos..$i]
                $hex = ($lineBytes | ForEach-Object { "{0:X2}" -f $_ }) -join " "
                Write-Host "  HEX : $hex" -ForegroundColor White
                Write-Host ""
                break
            }
            $currentLine++
            $startPos = $i + 1
        }
    }
}

# Fichiers/lignes a inspecter
Write-Host ""
Write-Host "=== INSPECTION HEXADECIMALE ===" -ForegroundColor Cyan
Write-Host ""

Show-LineHex -FilePath "src\components\NewTenantWizardModal.tsx" -LineNumber 309
Show-LineHex -FilePath "src\components\NewTenantWizardModal.tsx" -LineNumber 312
Show-LineHex -FilePath "src\App.tsx" -LineNumber 1734
Show-LineHex -FilePath "src\types.ts" -LineNumber 30

Write-Host ""
Write-Host "=== FIN ===" -ForegroundColor Green
