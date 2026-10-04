# ============================================================
# CONTEXTE - AgencySettingsView.tsx utilise la table documents
# ============================================================

$filePath = "src\components\AgencySettingsView.tsx"

if (-not (Test-Path $filePath)) {
    Write-Host "Fichier absent" -ForegroundColor Red
    exit
}

$lines = Get-Content $filePath
Write-Host ("Total : {0} lignes" -f $lines.Count) -ForegroundColor Cyan
Write-Host ""

# Chercher toutes les mentions de "documents" (la table, pas le mot generique)
$found = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -match "from\(['\`"]documents['\`"]\)|\.documents\b|agency_documents|'documents'") {
        $found += $i
    }
}

Write-Host ("{0} lignes suspectes" -f $found.Count) -ForegroundColor Yellow
Write-Host ""

# Afficher les 10 premiers contextes
$shown = 0
foreach ($lineNum in $found) {
    if ($shown -ge 10) { break }
    $start = [Math]::Max(0, $lineNum - 3)
    $end = [Math]::Min($lines.Count - 1, $lineNum + 5)
    Write-Host ("--- Contexte ligne {0} ---" -f ($lineNum + 1)) -ForegroundColor Cyan
    for ($i = $start; $i -le $end; $i++) {
        $marker = if ($i -eq $lineNum) { ">>>" } else { "   " }
        $color = if ($marker -eq ">>>") { "Yellow" } else { "White" }
        Write-Host ("{0} {1,4}: {2}" -f $marker, ($i + 1), $lines[$i]) -ForegroundColor $color
    }
    Write-Host ""
    $shown++
}
