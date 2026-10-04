# ============================================================
# CORRECTION - Fichiers avec corruption d'encodage
# Methode : codes Unicode (aucun caractere accentue dans le script)
# ============================================================

function Replace-InFile {
    param(
        [string]$FilePath,
        [hashtable]$Replacements
    )
    
    # Lire en UTF-8
    $content = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8)
    
    $totalCount = 0
    foreach ($key in $Replacements.Keys) {
        $count = ([regex]::Matches($content, [regex]::Escape($key))).Count
        if ($count -gt 0) {
            $content = $content.Replace($key, $Replacements[$key])
            $totalCount += $count
            Write-Host ("  OK : {0} remplacements" -f $count) -ForegroundColor Green
        }
    }
    
    # Ecrire en UTF-8 sans BOM
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($FilePath, $content, $utf8NoBom)
    
    return $totalCount
}

# ============================================================
# TABLE DE REMPLACEMENT (codes Unicode, pas de caracteres speciaux)
# ============================================================
# u00e9 = e-acute, u00e8 = e-grave, u00e0 = a-grave, u00e7 = c-cedille
# u00e9 majuscule = u00c9 etc.

$fixMap = @{
    # Pattern "double" (2 niveaux) - priorite haute
    ([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00A9) = [char]0x00E9    # ???? -> ?
    ([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00A8) = [char]0x00E8    # ???? -> ?
    ([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00A0) = [char]0x00E0    # ???  -> ?
    ([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00A7) = [char]0x00E7    # ???? -> ?
    ([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00AE) = [char]0x00EE    # ???? -> ?
    ([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00B4) = [char]0x00F4    # ???? -> ?
    ([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00B9) = [char]0x00F9    # ???? -> ?
    ([char]0x00C3 + [char]0x0083 + [char]0x00C2 + [char]0x00A2) = [char]0x00E2    # ???? -> ?
    ([char]0x00C3 + [char]0x0083 + [char]0x00E2 + [char]0x20AC + [char]0x00A2) = [char]0x00C9  # ????? + quelque chose -> ? (best effort)
    
    # Pattern "simple" (1 niveau) - deja vu dans le code
    ([char]0x00C3 + [char]0x00A9) = [char]0x00E9    # ?? -> ?
    ([char]0x00C3 + [char]0x00A8) = [char]0x00E8    # ?? -> ?
    ([char]0x00C3 + [char]0x00A0) = [char]0x00E0    # ?  -> ?
    ([char]0x00C3 + [char]0x00A7) = [char]0x00E7    # ?? -> ?
    ([char]0x00C3 + [char]0x00AE) = [char]0x00EE    # ?? -> ?
    ([char]0x00C3 + [char]0x00B4) = [char]0x00F4    # ?? -> ?
    ([char]0x00C3 + [char]0x00B9) = [char]0x00F9    # ?? -> ?
    ([char]0x00C3 + [char]0x00BB) = [char]0x00FB    # ?? -> ?
    ([char]0x00C3 + [char]0x00A2) = [char]0x00E2    # ?? -> ?
    ([char]0x00C3 + [char]0x00AA) = [char]0x00EA    # ?? -> ?
    ([char]0x00C3 + [char]0x00AB) = [char]0x00EB    # ?? -> ?
    ([char]0x00C3 + [char]0x00AF) = [char]0x00EF    # ?? -> ?
    ([char]0x00C3 + [char]0x00BC) = [char]0x00FC    # ?? -> ?
    ([char]0x00C3 + [char]0x0089) = [char]0x00C9    # ?? -> ?
    ([char]0x00C3 + [char]0x0088) = [char]0x00C8    # ?? -> ?
    ([char]0x00C3 + [char]0x0080) = [char]0x00C0    # ?? -> ?
    ([char]0x00C3 + [char]0x008A) = [char]0x00CA    # ?? -> ?
    ([char]0x00C3 + [char]0x0087) = [char]0x00C7    # ?? -> ?
    
    # Symboles courants
    ([char]0x00C2 + [char]0x00B7) = [char]0x00B7    # ?? -> ?
    ([char]0x00C2 + [char]0x00B0) = [char]0x00B0    # ?? -> ?
    ([char]0x00C2 + [char]0x00BB) = [char]0x00BB    # ?? -> ?
    ([char]0x00C2 + [char]0x00AB) = [char]0x00AB    # ?? -> ?
    ([char]0x00C3 + [char]0x00A2 + [char]0x20AC + [char]0x2122) = [char]0x2019  # ??? -> '
    ([char]0x00C3 + [char]0x00A2 + [char]0x20AC + [char]0x0153) = [char]0x201C  # ??? -> "
    ([char]0x00C3 + [char]0x00A2 + [char]0x20AC + [char]0x009D) = [char]0x201D  # ?? -> "
    ([char]0x00C3 + [char]0x00A2 + [char]0x20AC + [char]0x201C) = [char]0x2013  # ??" -> ?
    ([char]0x00C3 + [char]0x00A2 + [char]0x20AC + [char]0x201D) = [char]0x2014  # ??" -> ?
    ([char]0x00C3 + [char]0x00A2 + [char]0x201A + [char]0x00AC) = [char]0x20AC  # ??? -> ?
}

# ============================================================
# FICHIERS A CORRIGER
# ============================================================
$filesToFix = @(
    "src\components\NewTenantWizardModal.tsx",
    "src\components\CashRegisterView.tsx",
    "src\components\InvoicesView.tsx",
    "src\types.ts"
)

# Pour App.tsx, on fera un traitement special apres (trop corrompu)
# Pour l'instant on ne touche PAS App.tsx

Write-Host ""
Write-Host "=== CORRECTION DES FICHIERS ===" -ForegroundColor Cyan
Write-Host ""

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$totalGlobal = 0

foreach ($file in $filesToFix) {
    if (-not (Test-Path $file)) {
        Write-Host ("IGNORE (absent) : {0}" -f $file) -ForegroundColor DarkGray
        continue
    }
    
    # Backup
    Copy-Item $file "$file.before-fix-$timestamp.bak" -Force
    
    Write-Host ("--- {0} ---" -f $file) -ForegroundColor Yellow
    $count = Replace-InFile -FilePath $file -Replacements $fixMap
    Write-Host ("  Total : {0} remplacements" -f $count) -ForegroundColor Cyan
    Write-Host ""
    $totalGlobal += $count
}

Write-Host ""
Write-Host "=== RESUME ===" -ForegroundColor Cyan
Write-Host ("Total global : {0} remplacements" -f $totalGlobal) -ForegroundColor Green
Write-Host "Backups crees avec suffixe .before-fix-<timestamp>.bak" -ForegroundColor Yellow
Write-Host ""
Write-Host "NOTE : App.tsx (le plus corrompu) sera traite separement." -ForegroundColor Yellow
Write-Host ""
