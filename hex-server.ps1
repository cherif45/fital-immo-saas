# ============================================================
# INSPECTION HEX - Corruptions dans server.ts
# ============================================================

Write-Host ""
Write-Host "=== Corruptions UTF-8 dans server.ts ===" -ForegroundColor Cyan
Write-Host ""

$filePath = "server.ts"
$bytes = [System.IO.File]::ReadAllBytes($filePath)

# Trouver les corruptions (C3 83 = debut de sequence double-encoded)
$corruptions = @()
for ($i = 0; $i -lt $bytes.Length - 2; $i++) {
    if ($bytes[$i] -eq 0xC3 -and $bytes[$i + 1] -eq 0x83) {
        $corruptions += $i
    }
}

Write-Host ("Total sequences C3 83 : {0}" -f $corruptions.Count) -ForegroundColor Yellow
Write-Host ""

if ($corruptions.Count -eq 0) {
    Write-Host "Aucune corruption detectee avec le pattern C3 83" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verification avec un pattern plus large (recherche 'e-acute mal encode')..." -ForegroundColor Yellow
    
    # Pattern simple : C3 A9 (e-acute en UTF-8 valide) mais doit etre precede de C3
    # Pour les corruptions simples, chercher C3 A9 suivi de rien
    # En fait, cherchons les octets qui ne sont PAS du UTF-8 valide
    
    $pos = 0
    while ($pos -lt $bytes.Length - 1) {
        # Octet de continuation sans octet de depart
        if ($bytes[$pos] -ge 0x80 -and $bytes[$pos] -le 0xBF) {
            $start = [Math]::Max(0, $pos - 10)
            $end = [Math]::Min($bytes.Length - 1, $pos + 10)
            $context = $bytes[$start..$end] | ForEach-Object { "{0:X2}" -f $_ }
            $ascii = ($bytes[$start..$end] | ForEach-Object { if ($_ -ge 32 -and $_ -le 126) { [char]$_ } else { "." } }) -join ""
            Write-Host ("Position {0} : {1}" -f $pos, ($context -join " ")) -ForegroundColor DarkGray
            Write-Host ("              {0}" -f $ascii) -ForegroundColor White
            $pos += 20
        } else {
            $pos++
        }
    }
} else {
    # Afficher les 10 premiers contextes
    $shown = 0
    foreach ($pos in $corruptions) {
        if ($shown -ge 10) { break }
        
        $start = [Math]::Max(0, $pos - 20)
        $end = [Math]::Min($bytes.Length - 1, $pos + 20)
        $context = $bytes[$start..$end] | ForEach-Object { "{0:X2}" -f $_ }
        $ascii = ($bytes[$start..$end] | ForEach-Object { if ($_ -ge 32 -and $_ -le 126) { [char]$_ } else { "." } }) -join ""
        
        Write-Host ("Position {0} :" -f $pos) -ForegroundColor Cyan
        Write-Host ("  HEX   : {0}" -f ($context -join " ")) -ForegroundColor DarkGray
        Write-Host ("  ASCII : {0}" -f $ascii) -ForegroundColor White
        Write-Host ""
        $shown++
    }
}

# ============================================================
# Chercher TOUTES les sequences suspectes (combien de types ?)
# ============================================================
Write-Host ""
Write-Host "=== Types de corruptions (C3 83 X) ===" -ForegroundColor Cyan
Write-Host ""

$types = @{}
for ($i = 0; $i -lt $bytes.Length - 3; $i++) {
    if ($bytes[$i] -eq 0xC3 -and $bytes[$i + 1] -eq 0x83) {
        # Capturer 4 octets
        $key = "{0:X2} {1:X2} {2:X2} {3:X2}" -f $bytes[$i], $bytes[$i + 1], $bytes[$i + 2], $bytes[$i + 3]
        if ($types.ContainsKey($key)) {
            $types[$key]++
        } else {
            $types[$key] = 1
        }
    }
}

if ($types.Count -gt 0) {
    Write-Host ("{0} types de sequences trouvees :" -f $types.Count) -ForegroundColor Yellow
    $types.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
        Write-Host ("  {0}  -> {1} occurrences" -f $_.Key, $_.Value) -ForegroundColor White
    }
} else {
    Write-Host "Aucune sequence C3 83 trouvee" -ForegroundColor Green
}

Write-Host ""

# ============================================================
# Verifier aussi la corruption simple (C3 seul)
# ============================================================
Write-Host "=== Types de corruptions (C3 seul, corruption simple) ===" -ForegroundColor Cyan
Write-Host ""

$simpleTypes = @{}
for ($i = 0; $i -lt $bytes.Length - 2; $i++) {
    if ($bytes[$i] -eq 0xC3 -and ($bytes[$i + 1] -ge 0x80 -and $bytes[$i + 1] -le 0xBF)) {
        # C3 suivi d'un octet de continuation = UTF-8 valide (2 octets)
        # C'est valide, on ne cherche que les invalides
        # Mais on regarde si le contexte est suspect
        if ($i -gt 0) {
            $prev = $bytes[$i - 1]
            if ($prev -eq 0xC3 -or $prev -eq 0xC2) {
                # C'est un double-encodage, ignorer ici (deja compte)
                continue
            }
        }
    }
}

Write-Host "Analyse terminee." -ForegroundColor Green
