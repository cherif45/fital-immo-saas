# ============================================================
# PATCH AUTOMATIQUE - PenaltiesView + ActivityLogView
# Methode robuste : par numeros de ligne + regex
# ============================================================

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# ============================================================
# PATCH 1 - PenaltiesView
# ============================================================
Write-Host ""
Write-Host "=== PATCH : PenaltiesView ===" -ForegroundColor Cyan

$filePath = "src\components\PenaltiesView.tsx"
Copy-Item $filePath "$filePath.before-auto-$timestamp.bak" -Force

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $content -split "`r?`n"

# Trouver la ligne de debut du filtre
$startLine = -1
$endLine = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "const\s+filteredPenalties\s*=\s*displayPenalties\.filter") {
        $startLine = $i
        # Trouver la fermeture "});" 
        for ($j = $i; $j -lt [Math]::Min($i + 30, $lines.Count); $j++) {
            if ($lines[$j] -match "^\s*\}\);\s*$") {
                $endLine = $j
                break
            }
        }
        break
    }
}

if ($startLine -lt 0 -or $endLine -lt 0) {
    Write-Host "  ERREUR : Bloc filteredPenalties non trouve" -ForegroundColor Red
} else {
    Write-Host ("  Bloc trouve : lignes {0} a {1}" -f ($startLine + 1), ($endLine + 1)) -ForegroundColor Green
    
    # Extraire le bloc original
    $originalBlock = $lines[$startLine..$endLine]
    
    # Reconstruire avec useMemo
    $newBlock = @()
    $newBlock += "  const filteredPenalties = React.useMemo(() => {"
    $newBlock += "    return displayPenalties.filter((p) => {"
    
    # Copier le corps (lignes 2 a endLine-1 du bloc, en ignorant la 1ere ligne et la derniere)
    for ($k = 1; $k -lt $originalBlock.Count - 1; $k++) {
        # Indenter de 2 espaces en plus
        $newBlock += ("  " + $originalBlock[$k])
    }
    
    $newBlock += "    });"
    $newBlock += "  }, [displayPenalties, statusFilter, search]);"
    
    # Remplacer
    $newLines = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($i -lt $startLine -or $i -gt $endLine) {
            $newLines += $lines[$i]
        } elseif ($i -eq $startLine) {
            $newLines += $newBlock
        }
    }
    
    $newContent = $newLines -join "`r`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($filePath, $newContent, $utf8NoBom)
    Write-Host "  OK - PenaltiesView patch?" -ForegroundColor Green
}

# ============================================================
# PATCH 2 - ActivityLogView
# ============================================================
Write-Host ""
Write-Host "=== PATCH : ActivityLogView ===" -ForegroundColor Cyan

$filePath = "src\components\ActivityLogView.tsx"
Copy-Item $filePath "$filePath.before-auto-$timestamp.bak" -Force

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $content -split "`r?`n"

$startLine = -1
$endLine = -1

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "const\s+sortedActivities\s*=\s*\[\.\.\.filteredActivities\]") {
        $startLine = $i
        # Trouver la fermeture "});"
        for ($j = $i; $j -lt [Math]::Min($i + 15, $lines.Count); $j++) {
            if ($lines[$j] -match "^\s*\}\);\s*$") {
                $endLine = $j
                break
            }
        }
        break
    }
}

if ($startLine -lt 0 -or $endLine -lt 0) {
    Write-Host "  ERREUR : Bloc sortedActivities non trouve" -ForegroundColor Red
} else {
    Write-Host ("  Bloc trouve : lignes {0} a {1}" -f ($startLine + 1), ($endLine + 1)) -ForegroundColor Green
    
    $originalBlock = $lines[$startLine..$endLine]
    
    $newBlock = @()
    $newBlock += "  const sortedActivities = React.useMemo(() => {"
    $newBlock += "    return [...filteredActivities].sort((a, b) => {"
    
    for ($k = 1; $k -lt $originalBlock.Count - 1; $k++) {
        $newBlock += ("  " + $originalBlock[$k])
    }
    
    $newBlock += "    });"
    $newBlock += "  }, [filteredActivities]);"
    
    $newLines = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($i -lt $startLine -or $i -gt $endLine) {
            $newLines += $lines[$i]
        } elseif ($i -eq $startLine) {
            $newLines += $newBlock
        }
    }
    
    $newContent = $newLines -join "`r`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($filePath, $newContent, $utf8NoBom)
    Write-Host "  OK - ActivityLogView patch?" -ForegroundColor Green
}

# ============================================================
# VERIFICATION
# ============================================================
Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
Write-Host ""

$files = @(
    "src\components\PaymentsView.tsx",
    "src\components\PenaltiesView.tsx",
    "src\components\ActivityLogView.tsx"
)

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
    $hasUseMemo = ([regex]::Matches($content, "React\.useMemo\(")).Count
    $status = if ($hasUseMemo -gt 0) { "OK" } else { "MANQUE" }
    $color = if ($hasUseMemo -gt 0) { "Green" } else { "Red" }
    Write-Host ("  {0,-45} {1} ({2} usages)" -f $f, $status, $hasUseMemo) -ForegroundColor $color
}
