# ============================================================
# AUDIT EMOJIS - Methode 100% ASCII (codes hexadecimaux)
# ============================================================

Write-Host ""
Write-Host "=== RECHERCHE DE CARACTERES UTF-8 MAL ENCODES ===" -ForegroundColor Cyan
Write-Host ""

# Patterns en HEX (pas de caracteres speciaux)
# Signature d'UTF-8 lu comme Windows-1252 :
#   e-acute (UTF-8: C3 A9) lu en CP1252 = "??" -> on cherche les octets C3 A9
#   emoji sparkle (UTF-8: E2 9C A8) lu en CP1252 = 3 caracteres bizarres
# Mais ici, on va chercher directement les OCTETS corrompus dans les fichiers

# Octets UTF-8 valides :
#   e-acute   : C3 A9
#   a-grave   : C3 A0
#   c-cedille : C3 A7
#   emoji ?  : E2 9C A8

# Si un fichier contient DEJA les mauvais octets (double-encoded),
# on verra par exemple C3 83 C2 A9 (double encodage de C3 A9)

$srcFiles = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts","*.css" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" }

$suspiciousFiles = @()

foreach ($file in $srcFiles) {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    
    # Chercher la signature "double-encoded UTF-8"
    # C3 83 = "?" en UTF-8 double-encode = mauvais signe
    $doubleEncoded = 0
    for ($i = 0; $i -lt $bytes.Length - 2; $i++) {
        if ($bytes[$i] -eq 0xC3 -and $bytes[$i + 1] -eq 0x83) {
            $doubleEncoded++
        }
    }
    
    if ($doubleEncoded -gt 0) {
        $suspiciousFiles += [PSCustomObject]@{
            Fichier = $file.FullName.Replace($PWD.Path + '\', '')
            DoubleEncoded = $doubleEncoded
        }
    }
}

if ($suspiciousFiles.Count -eq 0) {
    Write-Host "OK - Aucun fichier avec double-encodage UTF-8 detecte dans src/" -ForegroundColor Green
} else {
    Write-Host "ATTENTION : $($suspiciousFiles.Count) fichiers avec double-encodage" -ForegroundColor Red
    $suspiciousFiles | Sort-Object DoubleEncoded -Descending | Format-Table -AutoSize
}

Write-Host ""
Write-Host "=== RECHERCHE : fichiers contenant les octets C3 83 (signature double-encoded) ===" -ForegroundColor Cyan
Write-Host ""

foreach ($file in $srcFiles) {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    for ($i = 0; $i -lt $bytes.Length - 2; $i++) {
        if ($bytes[$i] -eq 0xC3 -and $bytes[$i + 1] -eq 0x83) {
            # Trouver le contexte : les 20 octets autour
            $start = [Math]::Max(0, $i - 10)
            $len = [Math]::Min(30, $bytes.Length - $start)
            $context = $bytes[$start..($start + $len - 1)] | ForEach-Object { "{0:X2}" -f $_ }
            Write-Host "FICHIER : $($file.FullName.Replace($PWD.Path + '\', ''))" -ForegroundColor Yellow
            Write-Host "  Position $i : $($context -join ' ')" -ForegroundColor DarkGray
            break
        }
    }
}

Write-Host ""
Write-Host "=== RECHERCHE de 'Assistant Nouveau Locataire' (ASCII pur) ===" -ForegroundColor Cyan
Write-Host ""

$hits = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|\._backups" } |
    Select-String -Pattern "Assistant Nouveau Locataire" -ErrorAction SilentlyContinue

if ($hits) {
    foreach ($h in $hits) {
        Write-Host "FICHIER : $($h.Path.Replace($PWD.Path + '\', ''))" -ForegroundColor Yellow
        Write-Host "Ligne $($h.LineNumber) :" -ForegroundColor Cyan
        Write-Host "$($h.Line.Trim())" -ForegroundColor White
        Write-Host ""
    }
} else {
    Write-Host "Aucune occurrence trouvee" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== TERMINE ===" -ForegroundColor Green
