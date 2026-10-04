# ============================================================
# FIX 2B - Retirer le </ViewLoader> orphelin apres Sidebar
# ============================================================

$filePath = "src\App.tsx"

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Pattern : trouver "/></ViewLoader>" qui suit "onCloseMobile={...}"
# On cible specifiquement cette ligne
$oldLine = "        onCloseMobile={() => setIsMobileSidebarOpen(false)}"
$newLine = "        onCloseMobile={() => setIsMobileSidebarOpen(false)}"

# Trouver la ligne suivante (qui doit etre "/></ViewLoader>")
$lines = $content -split "`r?`n"
$fixed = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "onCloseMobile=\{\(\) => setIsMobileSidebarOpen\(false\)\}") {
        # Verifier la ligne suivante
        if ($i + 1 -lt $lines.Count -and $lines[$i + 1] -match "/></ViewLoader>") {
            Write-Host ("Trouve : ligne {0} = /{1}" -f ($i + 2), ($lines[$i + 1].Trim()))
            # Retirer </ViewLoader>
            $lines[$i + 1] = $lines[$i + 1] -replace "/></ViewLoader>", "/>"
            Write-Host ("Corrige : ligne {0} = {1}" -f ($i + 2), $lines[$i + 1].Trim()) -ForegroundColor Green
            $fixed = $true
            break
        }
    }
}

if ($fixed) {
    # Ecrire
    $newContent = $lines -join "`r`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($filePath, $newContent, $utf8NoBom)
    Write-Host ""
    Write-Host "Fichier corrige" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Pattern non trouve - verification manuelle" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== VERIFICATION lignes 1378-1390 ===" -ForegroundColor Cyan
$final = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$finalLines = $final -split "`r?`n"
for ($i = 1377; $i -lt [Math]::Min(1390, $finalLines.Count); $i++) {
    Write-Host ("  {0,4}: {1}" -f ($i + 1), $finalLines[$i]) -ForegroundColor White
}
