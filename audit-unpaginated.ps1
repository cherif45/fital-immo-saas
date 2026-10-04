# ============================================================
# LISTE DES REQUETES SANS PAGINATION (avec details)
# ============================================================

$files = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" }

$unpaginated = @()

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $lines = $content -split "`r?`n"

    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match "\.from\(['\`"]([a-z_]+)['\`"]\)" -and $line -match "\.select\(") {
            $table = $matches[1]
            $context = ""
            for ($j = $i; $j -lt [Math]::Min($i + 6, $lines.Count); $j++) {
                $context += $lines[$j] + " "
            }
            $hasLimit = $context -match "\.limit\(|\.range\(|fetchAllRows"
            
            if (-not $hasLimit) {
                $unpaginated += [PSCustomObject]@{
                    Fichier = $file.Name
                    Ligne = $i + 1
                    Table = $table
                    Extrait = $line.Trim().Substring(0, [Math]::Min(100, $line.Trim().Length))
                }
            }
        }
    }
}

Write-Host ""
Write-Host ("Total : {0} requetes sans pagination" -f $unpaginated.Count) -ForegroundColor Cyan
Write-Host ""

# Grouper par table
Write-Host "=== PAR TABLE ===" -ForegroundColor Yellow
Write-Host ""
$unpaginated | Group-Object Table | Sort-Object Count -Descending | ForEach-Object {
    Write-Host ("  {0,3} refs -> {1}" -f $_.Count, $_.Name) -ForegroundColor White
}

Write-Host ""
Write-Host "=== DETAIL (30 premieres) ===" -ForegroundColor Yellow
Write-Host ""
$unpaginated | Select-Object -First 30 | ForEach-Object {
    Write-Host ("{0}:{1} [{2}]" -f $_.Fichier, $_.Ligne, $_.Table) -ForegroundColor Cyan
    Write-Host ("    {0}" -f $_.Extrait) -ForegroundColor DarkGray
}
