# ============================================================
# CORRECTION - NewTenantWizardModal.tsx (corruptions simples)
# ============================================================

$file = "src\components\NewTenantWizardModal.tsx"

# Backup (au cas ou)
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $file "$file.before-fix-$timestamp.bak" -Force
Write-Host "Backup cree : $file.before-fix-$timestamp.bak" -ForegroundColor Green

# Lire en UTF-8
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Table de remplacement (pattern corrompu -> correct)
# Ordre important : les patterns multi-octets AVANT les mono
$replacements = @(
    # Accents avec majuscules (ordre : plus longs en premier)
    @{ Old = "????"; New = "?" }
    @{ Old = "????"; New = "?" }
    @{ Old = "??? "; New = "?" }
    @{ Old = "????"; New = "?" }
    @{ Old = "????"; New = "?" }
    @{ Old = "????"; New = "?" }
    @{ Old = "????"; New = "?" }
    @{ Old = "????"; New = "?" }
    @{ Old = "????"; New = "?" }
    @{ Old = "?????"; New = "?" }
    @{ Old = "?????"; New = "?" }
    @{ Old = "????"; New = "?" }
    @{ Old = "????"; New = "?" }
    
    # Simple encodage (1 seul passage UTF-8 -> Windows-1252)
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "? "; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "??"; New = "?" }
    @{ Old = "???"; New = "'" }
    @{ Old = "???"; New = '"' }
    @{ Old = "??"; New = '"' }
    @{ Old = "???"; New = "-" }
    @{ Old = "??""; New = "-" }
    @{ Old = "???"; New = "?" }
)

$totalReplacements = 0
foreach ($r in $replacements) {
    $count = ([regex]::Matches($content, [regex]::Escape($r.Old))).Count
    if ($count -gt 0) {
        $content = $content.Replace($r.Old, $r.New)
        Write-Host "  OK : '$($r.Old)' -> '$($r.New)' ($count occurrences)" -ForegroundColor Green
        $totalReplacements += $count
    }
}

# Ecrire en UTF-8 sans BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($file, $content, $utf8NoBom)

Write-Host ""
Write-Host "Total : $totalReplacements remplacements" -ForegroundColor Cyan
Write-Host "Fichier sauvegarde en UTF-8 sans BOM" -ForegroundColor Green
