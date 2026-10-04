# ============================================================
# FIX 2 - Import lazy local pour MobileMoneyPaymentModal
# ============================================================

$filePath = "src\components\TenantsView.tsx"
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# 1. Ajouter lazy import apres les autres imports
$oldImports = "import { formatCurrency, formatNumber, formatDate, exportToCSV } from '../lib/utils';"
$newImports = "import { formatCurrency, formatNumber, formatDate, exportToCSV } from '../lib/utils';`r`nimport { lazy, Suspense } from 'react';`r`n`r`n// Lazy import pour reduire le bundle de cette vue`r`nconst MobileMoneyPaymentModal = lazy(() => import('./MobileMoneyPaymentModal').then(m => ({ default: m.MobileMoneyPaymentModal })));"

if ($content.Contains($oldImports)) {
    $content = $content.Replace($oldImports, $newImports)
    Write-Host "OK - Import lazy ajoute" -ForegroundColor Green
} else {
    Write-Host "ATTENTION - Import base non trouve" -ForegroundColor Yellow
}

# 2. Wrapper l'usage dans <Suspense>
# Trouver la ligne 1117 (approximatif) et verifier la structure
$lines = $content -split "`r?`n"
$found = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "<MobileMoneyPaymentModal" -and $lines[$i] -notmatch "Suspense") {
        Write-Host ("Trouve ligne {0} : {1}" -f ($i + 1), $lines[$i].Trim()) -ForegroundColor Cyan
        $found = $true
        
        # Verifier si c'est auto-ferme ou avec fermeture explicite
        $hasClosingTag = $false
        $closingLine = -1
        for ($j = $i; $j -lt [Math]::Min($i + 20, $lines.Count); $j++) {
            if ($lines[$j] -match "</MobileMoneyPaymentModal>") {
                $hasClosingTag = $true
                $closingLine = $j
                break
            }
            if ($lines[$j] -match "/>" -and $j -gt $i) {
                $closingLine = $j
                break
            }
        }
        
        if ($hasClosingTag) {
            Write-Host "  Structure : ouverture + fermeture explicite" -ForegroundColor DarkGray
            Write-Host "  -> Laisser comme ca, il faut juste wrapper avec Suspense manuellement" -ForegroundColor Yellow
        } else {
            Write-Host "  Structure : auto-ferme" -ForegroundColor DarkGray
            Write-Host "  -> On peut wrapper facilement" -ForegroundColor Green
        }
    }
}

if (-not $found) {
    Write-Host "MobileMoneyPaymentModal non trouve dans le JSX" -ForegroundColor Yellow
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

Write-Host ""
Write-Host "Fichier sauvegarde" -ForegroundColor Green
