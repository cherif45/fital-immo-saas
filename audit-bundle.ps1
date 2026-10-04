# ============================================================
# ETAT DES LIEUX - Imports et taille des composants
# ============================================================

Write-Host ""
Write-Host "=== 1. IMPORTS dans App.tsx ===" -ForegroundColor Cyan
Write-Host ""

$appLines = Get-Content "src\App.tsx"
$imports = @()
for ($i = 0; $i -lt $appLines.Count; $i++) {
    if ($appLines[$i] -match "^import\s+\{.*\}\s+from\s+'\./components/") {
        $imports += $appLines[$i].Trim()
    }
}

Write-Host ("{0} imports de composants" -f $imports.Count) -ForegroundColor Yellow
Write-Host ""
$imports | Select-Object -First 60 | ForEach-Object {
    Write-Host ("  {0}" -f $_) -ForegroundColor White
}

Write-Host ""
Write-Host "=== 2. TAILLE DES COMPOSANTS (top 20) ===" -ForegroundColor Cyan
Write-Host ""

$components = Get-ChildItem -Path "src\components" -Recurse -Include "*.tsx" -ErrorAction SilentlyContinue |
    Sort-Object Length -Descending |
    Select-Object -First 20

foreach ($c in $components) {
    $sizeKB = [math]::Round($c.Length / 1KB, 1)
    $color = if ($c.Length -gt 40KB) { "Red" } elseif ($c.Length -gt 25KB) { "Yellow" } else { "White" }
    Write-Host ("  {0,6} KB  {1}" -f $sizeKB, $c.Name) -ForegroundColor $color
}

Write-Host ""
Write-Host "=== 3. UTILISATION DES COMPOSANTS dans App.tsx ===" -ForegroundColor Cyan
Write-Host ""

# Compter combien de fois chaque composant est utilise
$usageCount = @{}
foreach ($import in $imports) {
    if ($import -match "import\s+\{\s*([^}]+)\s*\}") {
        $names = $matches[1] -split "," | ForEach-Object { $_.Trim() }
        foreach ($name in $names) {
            if (-not $usageCount.ContainsKey($name)) { $usageCount[$name] = 0 }
        }
    }
}

Write-Host ("{0} composants importes" -f $usageCount.Count) -ForegroundColor Cyan
Write-Host ""
Write-Host "=== 4. DEJA UTILISE React.lazy ? ===" -ForegroundColor Cyan
Write-Host ""

$hasLazy = $appLines | Select-String "React\.lazy|lazy\(" -ErrorAction SilentlyContinue
if ($hasLazy) {
    Write-Host ("OUI - {0} usages de lazy" -f $hasLazy.Count) -ForegroundColor Green
    $hasLazy | Select-Object -First 5 | ForEach-Object {
        Write-Host ("  Ligne {0}: {1}" -f $_.LineNumber, $_.Line.Trim()) -ForegroundColor White
    }
} else {
    Write-Host "NON - Aucun usage de React.lazy" -ForegroundColor Yellow
    Write-Host "  -> C'est LE probleme : tout est charge en meme temps" -ForegroundColor White
}

Write-Host ""
Write-Host "=== 5. SUSPENSE deja utilise ? ===" -ForegroundColor Cyan
$hasSuspense = $appLines | Select-String "Suspense" -ErrorAction SilentlyContinue
if ($hasSuspense) {
    Write-Host ("OUI - {0} usages" -f $hasSuspense.Count) -ForegroundColor Green
} else {
    Write-Host "NON" -ForegroundColor Yellow
}
