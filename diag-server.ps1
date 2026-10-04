# ============================================================
# DIAGNOSTIC - Voir les lignes 40-60 de server.ts
# ============================================================

Write-Host ""
Write-Host "=== server.ts - Lignes 40 a 60 ===" -ForegroundColor Cyan
Write-Host ""

$lines = Get-Content "server.ts"
$start = 39
$end = [Math]::Min(60, $lines.Count)

for ($i = $start; $i -lt $end; $i++) {
    $marker = if ($i -eq 50) { ">>>" } else { "   " }
    $color = if ($marker -eq ">>>") { "Red" } else { "White" }
    Write-Host ("{0} {1,3}: {2}" -f $marker, ($i + 1), $lines[$i]) -ForegroundColor $color
}

Write-Host ""
Write-Host "=== Analyse de la ligne 51 (codes Unicode non-ASCII) ===" -ForegroundColor Cyan
Write-Host ""

if ($lines.Count -ge 51) {
    $line51 = $lines[50]
    Write-Host ("Contenu brut :") -ForegroundColor Yellow
    Write-Host ($line51) -ForegroundColor White
    Write-Host ""
    
    Write-Host "Caracteres non-ASCII sur cette ligne :" -ForegroundColor Yellow
    $hasNonAscii = $false
    for ($i = 0; $i -lt $line51.Length; $i++) {
        $c = $line51[$i]
        $code = [int][char]$c
        if ($code -gt 127) {
            Write-Host ("  Position {0} : U+{1:X4}" -f $i, $code) -ForegroundColor Red
            $hasNonAscii = $true
        }
    }
    if (-not $hasNonAscii) {
        Write-Host "  Aucun caractere non-ASCII" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== Comptage des caracteres speciaux ===" -ForegroundColor Cyan
Write-Host ""

$content = Get-Content "server.ts" -Raw

# Compter les backticks (character code 96)
$backtickCount = 0
foreach ($ch in $content.ToCharArray()) {
    if ([int][char]$ch -eq 96) { $backtickCount++ }
}

# Compter les dollars (pour template literals ${...})
$dollarBraceCount = 0
$len = $content.Length
for ($i = 0; $i -lt $len - 1; $i++) {
    if ($content[$i] -eq '$' -and $content[$i + 1] -eq '{') {
        $dollarBraceCount++
    }
}

Write-Host ("Backticks (code 96) : {0}" -f $backtickCount) -ForegroundColor White
Write-Host ("Sequences `${{ : {0}" -f $dollarBraceCount) -ForegroundColor White
Write-Host ("Attendu : backticks PAIRS (ouverture + fermeture)" -f " ") -ForegroundColor DarkGray

if ($backtickCount % 2 -ne 0) {
    Write-Host "ALERTE : nombre impair de backticks - il manque une fermeture !" -ForegroundColor Red
} else {
    Write-Host "OK : nombre pair de backticks" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Recherche de backticks problematiques ===" -ForegroundColor Cyan
Write-Host ""

# Afficher chaque ligne avec un nombre impair de backticks
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $bt = 0
    foreach ($ch in $line.ToCharArray()) {
        if ([int][char]$ch -eq 96) { $bt++ }
    }
    if ($bt % 2 -ne 0) {
        Write-Host ("L{0} : {1} backtick(s) - {2}" -f ($i + 1), $bt, $line.Trim()) -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== FIN DIAGNOSTIC ===" -ForegroundColor Green
