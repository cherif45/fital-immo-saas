# ============================================================
# CORRECTION LIGNE 1734 DE App.tsx
# Remplacement par octets (methode infaillible)
# ============================================================

$filePath = "src\App.tsx"

# Backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $filePath "$filePath.before-line1734-fix-$timestamp.bak" -Force
Write-Host ("Backup : {0}.before-line1734-fix-{1}.bak" -f $filePath, $timestamp) -ForegroundColor Green
Write-Host ""

# Lire les bytes bruts
$bytes = [System.IO.File]::ReadAllBytes($filePath)
Write-Host ("Taille initiale : {0} octets" -f $bytes.Length) -ForegroundColor Cyan

# Sequence corrompue (recherchee) - extraite de l'inspection hex
# <span> + triple-encoded emoji + ... + (7 + corrupted + tapes)</span>
# On utilise des sous-sequences caracteristiques pour eviter les faux positifs

# Pattern corrompu EXACT (a remplacer)
$corruptedPattern = [byte[]]@(
    0x3C, 0x73, 0x70, 0x61, 0x6E, 0x3E,                    # <span>
    0xC3, 0x83, 0xC2, 0xA2, 0xC3, 0x82, 0xC5, 0x93, 0xC3, 0x82, 0xC2, 0xA8,  # emoji triple-encoded
    0x20,                                                   # espace
    0x41, 0x73, 0x73, 0x69, 0x73, 0x74, 0x61, 0x6E, 0x74,  # Assistant
    0x20,                                                   # espace
    0x4E, 0x6F, 0x75, 0x76, 0x65, 0x61, 0x75,              # Nouveau
    0x20,                                                   # espace
    0x4C, 0x6F, 0x63, 0x61, 0x74, 0x61, 0x69, 0x72, 0x65,  # Locataire
    0x20, 0x28, 0x37, 0x20,                                 # " (7 "
    0xC3, 0x83, 0xC6, 0x92, 0xC3, 0x82, 0xE2, 0x80, 0xB0,  # E-acute triple-encoded
    0x74, 0x61, 0x70, 0x65, 0x73, 0x29,                    # tapes)
    0x3C, 0x2F, 0x73, 0x70, 0x61, 0x6E, 0x3E               # </span>
)

# Pattern propre (remplacement)
$cleanPattern = [byte[]]@(
    0x3C, 0x73, 0x70, 0x61, 0x6E, 0x3E,                    # <span>
    0xE2, 0x9C, 0xA8,                                       # ? (UTF-8 valide)
    0x20,                                                   # espace
    0x41, 0x73, 0x73, 0x69, 0x73, 0x74, 0x61, 0x6E, 0x74,  # Assistant
    0x20,                                                   # espace
    0x4E, 0x6F, 0x75, 0x76, 0x65, 0x61, 0x75,              # Nouveau
    0x20,                                                   # espace
    0x4C, 0x6F, 0x63, 0x61, 0x74, 0x61, 0x69, 0x72, 0x65,  # Locataire
    0x20, 0x28, 0x37, 0x20,                                 # " (7 "
    0xC3, 0x89,                                             # ? (UTF-8 valide)
    0x74, 0x61, 0x70, 0x65, 0x73, 0x29,                    # tapes)
    0x3C, 0x2F, 0x73, 0x70, 0x61, 0x6E, 0x3E               # </span>
)

Write-Host ("Pattern corrompu  : {0} octets" -f $corruptedPattern.Length) -ForegroundColor Yellow
Write-Host ("Pattern propre    : {0} octets" -f $cleanPattern.Length) -ForegroundColor Yellow
Write-Host ""

# Rechercher le pattern corrompu dans les bytes
$foundIndex = -1
for ($i = 0; $i -le ($bytes.Length - $corruptedPattern.Length); $i++) {
    $match = $true
    for ($j = 0; $j -lt $corruptedPattern.Length; $j++) {
        if ($bytes[$i + $j] -ne $corruptedPattern[$j]) {
            $match = $false
            break
        }
    }
    if ($match) {
        $foundIndex = $i
        break
    }
}

if ($foundIndex -eq -1) {
    Write-Host "ATTENTION : Pattern corrompu non trouve a l'identique" -ForegroundColor Red
    Write-Host "On essaye une approche simplifiee..." -ForegroundColor Yellow
    Write-Host ""
    
    # Approche alternative : remplacer seulement les sequences corrompues
    # sans chercher la ligne entiere
    
    $replacements = @(
        # Emoji triple-encoded -> ?
        @{
            From = [byte[]]@(0xC3, 0x83, 0xC2, 0xA2, 0xC3, 0x82, 0xC5, 0x93, 0xC3, 0x82, 0xC2, 0xA8)
            To   = [byte[]]@(0xE2, 0x9C, 0xA8)
        }
        # E-acute triple-encoded -> ?
        @{
            From = [byte[]]@(0xC3, 0x83, 0xC6, 0x92, 0xC3, 0x82, 0xE2, 0x80, 0xB0)
            To   = [byte[]]@(0xC3, 0x89)
        }
    )
    
    $newBytes = $bytes
    $totalReplaced = 0
    
    foreach ($r in $replacements) {
        $fromLen = $r.From.Length
        $toBytes = $r.To
        $result = New-Object System.Collections.Generic.List[byte]
        $i = 0
        $replaced = 0
        
        while ($i -lt $newBytes.Length) {
            $match = $false
            if ($i -le ($newBytes.Length - $fromLen)) {
                $match = $true
                for ($j = 0; $j -lt $fromLen; $j++) {
                    if ($newBytes[$i + $j] -ne $r.From[$j]) {
                        $match = $false
                        break
                    }
                }
            }
            if ($match) {
                foreach ($b in $toBytes) { $result.Add($b) }
                $i += $fromLen
                $replaced++
            } else {
                $result.Add($newBytes[$i])
                $i++
            }
        }
        
        $newBytes = $result.ToArray()
        if ($replaced -gt 0) {
            Write-Host ("  OK : {0} remplacements de {1} octets" -f $replaced, $fromLen) -ForegroundColor Green
            $totalReplaced += $replaced
        }
    }
    
    if ($totalReplaced -gt 0) {
        [System.IO.File]::WriteAllBytes($filePath, $newBytes)
        Write-Host ""
        Write-Host ("Total : {0} remplacements" -f $totalReplaced) -ForegroundColor Cyan
        Write-Host ("Nouvelle taille : {0} octets (avant : {1})" -f $newBytes.Length, $bytes.Length) -ForegroundColor Cyan
    } else {
        Write-Host "Aucun remplacement effectue" -ForegroundColor Red
    }
} else {
    Write-Host ("Pattern trouve a l'offset {0}" -f $foundIndex) -ForegroundColor Green
    
    # Construire le nouveau fichier : avant + propre + apres
    $before = $bytes[0..($foundIndex - 1)]
    $after = $bytes[($foundIndex + $corruptedPattern.Length)..($bytes.Length - 1)]
    $newBytes = $before + $cleanPattern + $after
    
    [System.IO.File]::WriteAllBytes($filePath, $newBytes)
    
    Write-Host ""
    Write-Host "Correction appliquee" -ForegroundColor Green
    Write-Host ("Nouvelle taille : {0} octets (avant : {1})" -f $newBytes.Length, $bytes.Length) -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
Write-Host ""

# Relire la ligne 1734
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $content -split "`r?`n"
if ($lines.Length -ge 1734) {
    Write-Host ("Ligne 1734 : {0}" -f $lines[1733].Trim()) -ForegroundColor White
}
