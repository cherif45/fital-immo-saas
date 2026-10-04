# ============================================================
# ANALYSE - Structure des vues volumineuses
# ============================================================

$files = @(
    "src\components\TenantsView.tsx",
    "src\components\ArchiveView.tsx",
    "src\components\PaymentsView.tsx",
    "src\components\PenaltiesView.tsx",
    "src\components\ActivityLogView.tsx"
)

foreach ($f in $files) {
    if (-not (Test-Path $f)) {
        Write-Host "ABSENT : $f" -ForegroundColor Red
        continue
    }
    
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Cyan
    Write-Host "  $f" -ForegroundColor Cyan
    Write-Host "==================================================" -ForegroundColor Cyan
    
    $content = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
    $lines = $content -split "`r?`n"
    
    # Taille
    $size = [math]::Round((Get-Item $f).Length / 1KB, 1)
    Write-Host ("  Taille : {0} KB / {1} lignes" -f $size, $lines.Count) -ForegroundColor White
    
    # Detecter les .map() dans le rendu
    $mapCount = 0
    $mapLines = @()
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "\.map\(" -and $lines[$i] -notmatch "//") {
            $mapCount++
            if ($mapLines.Count -lt 5) {
                $mapLines += ("L{0}: {1}" -f ($i + 1), $lines[$i].Trim().Substring(0, [Math]::Min(100, $lines[$i].Trim().Length)))
            }
        }
    }
    Write-Host ("  .map() detectes : {0}" -f $mapCount) -ForegroundColor Yellow
    if ($mapLines.Count -gt 0) {
        $mapLines | ForEach-Object { Write-Host ("    {0}" -f $_) -ForegroundColor DarkGray }
    }
    
    # Detecter useMemo
    $useMemoCount = ([regex]::Matches($content, "useMemo\(")).Count
    Write-Host ("  useMemo : {0}" -f $useMemoCount) -ForegroundColor $(if ($useMemoCount -gt 0) { "Green" } else { "Yellow" })
    
    # Detecter useCallback
    $useCallbackCount = ([regex]::Matches($content, "useCallback\(")).Count
    Write-Host ("  useCallback : {0}" -f $useCallbackCount) -ForegroundColor $(if ($useCallbackCount -gt 0) { "Green" } else { "Yellow" })
    
    # Detecter virtualisation deja presente
    $hasVirtual = $content -match "react-window|react-virtual|virtuoso|VirtualList"
    Write-Host ("  Virtualisation : {0}" -f $(if ($hasVirtual) { "OUI" } else { "NON" })) -ForegroundColor $(if ($hasVirtual) { "Green" } else { "Red" })
}
