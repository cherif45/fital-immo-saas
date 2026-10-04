# ============================================================
# REMPLACEMENT LIGNE 1734 - Methode regex (robuste)
# ============================================================

$filePath = "src\App.tsx"

# Lire en UTF-8
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Regex : matcher TOUTE ligne <span>...Assistant Nouveau Locataire (7...tapes)</span>
# Le . matche n'importe quel caractere sauf newline
$pattern = '<span>[^<]*Assistant Nouveau Locataire \(7[^<]*\)[^<]*</span>'

# Verifier qu'on matche bien
$matches = [regex]::Matches($content, $pattern)
Write-Host ("Occurrences trouvees : {0}" -f $matches.Count) -ForegroundColor Cyan
Write-Host ""

foreach ($m in $matches) {
    Write-Host ("AVANT : {0}" -f $m.Value) -ForegroundColor Yellow
}

if ($matches.Count -gt 0) {
    # Remplacement : ASCII pur avec icone Lucide
    $replacement = '<span className="inline-flex items-center gap-2"><Sparkles className="w-4 h-4" />Assistant Nouveau Locataire (7 Etapes)</span>'
    
    $newContent = [regex]::Replace($content, $pattern, $replacement)
    
    # Ecrire
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($filePath, $newContent, $utf8NoBom)
    
    Write-Host ""
    Write-Host ("Nouveau : {0}" -f $replacement) -ForegroundColor Green
    Write-Host ""
    Write-Host "Fichier ecrit" -ForegroundColor Green
} else {
    Write-Host "Aucune occurrence trouvee avec le pattern" -ForegroundColor Red
    Write-Host "Debug : chercher manuellement..." -ForegroundColor Yellow
    Write-Host ""
    
    # Debug : afficher les 5 lignes autour de 1734
    $lines = $content -split "`r?`n"
    for ($i = 1730; $i -lt 1738; $i++) {
        if ($i -lt $lines.Count) {
            Write-Host ("L{0}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
        }
    }
}

Write-Host ""
Write-Host "=== VERIFICATION FINALE ===" -ForegroundColor Cyan
Write-Host ""

$finalContent = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$finalLines = $finalContent -split "`r?`n"
for ($i = 0; $i -lt $finalLines.Count; $i++) {
    if ($finalLines[$i] -match "Assistant Nouveau Locataire") {
        Write-Host ("Ligne {0} :" -f ($i + 1)) -ForegroundColor Cyan
        Write-Host ("  {0}" -f $finalLines[$i].Trim()) -ForegroundColor White
        Write-Host ""
    }
}
