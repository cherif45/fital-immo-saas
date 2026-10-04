# ============================================================
# CORRECTION LIGNE 1734 - ASCII pur avec icone Lucide
# ============================================================

$filePath = "src\App.tsx"

# Backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $filePath "$filePath.before-ascii-fix-$timestamp.bak" -Force
Write-Host ("Backup cree") -ForegroundColor Green
Write-Host ""

# Lire en tant que texte (UTF-8)
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Remplacer par ASCII + icone Lucide (sans emoji)
$oldLine = '<span>? Assistant Nouveau Locataire (7 ?tapes)</span>'
$newLine = '<span className="flex items-center gap-2"><Sparkles className="w-4 h-4" />Assistant Nouveau Locataire (7 Etapes)</span>'

# Verifier si l'ancienne ligne existe
if ($content.Contains($oldLine)) {
    $content = $content.Replace($oldLine, $newLine)
    Write-Host "Ligne corrigee" -ForegroundColor Green
} else {
    Write-Host "Recherche alternative..." -ForegroundColor Yellow
    # Chercher n'importe quelle ligne avec "Assistant Nouveau Locataire"
    $lines = $content -split "`r?`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "Assistant Nouveau Locataire \(7") {
            Write-Host ("Ligne {0} : {1}" -f ($i + 1), $lines[$i].Trim()) -ForegroundColor White
        }
    }
}

# Verifier que Sparkles est importe
if ($content -notmatch "Sparkles") {
    Write-Host "Ajout de l'import Sparkles..." -ForegroundColor Yellow
    # Chercher la ligne d'import lucide-react
    if ($content -match "import\s*\{([^}]+)\}\s*from\s*'lucide-react'") {
        $imports = $matches[1]
        if ($imports -notmatch "Sparkles") {
            $newImports = $imports.TrimEnd() + ",`n  Sparkles,"
            $content = $content.Replace("import {$imports} from 'lucide-react'", "import {$newImports} from 'lucide-react'")
            Write-Host "Sparkles ajoute aux imports" -ForegroundColor Green
        }
    }
} else {
    Write-Host "Sparkles deja importe" -ForegroundColor Green
}

# Ecrire en UTF-8 sans BOM
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan

$newContent = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$newLines = $newContent -split "`r?`n"
for ($i = 0; $i -lt $newLines.Count; $i++) {
    if ($newLines[$i] -match "Assistant Nouveau Locataire") {
        Write-Host ("Ligne {0} : {1}" -f ($i + 1), $newLines[$i].Trim()) -ForegroundColor White
    }
}
