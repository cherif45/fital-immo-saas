# ============================================================
# VERIFICATION - Chercher les </ViewLoader> orphelins
# ============================================================

$filePath = "src\App.tsx"
$lines = Get-Content $filePath

Write-Host ""
Write-Host "=== TOUS LES </ViewLoader> ===" -ForegroundColor Cyan
Write-Host ""

$orphans = @()
$validCount = 0

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "</ViewLoader>") {
        $hasLazy = $lines[$i] -match "<Lazy"
        
        if ($hasLazy) {
            Write-Host ("  L{0,4} VALIDE : {1}" -f ($i + 1), $lines[$i].Trim()) -ForegroundColor Green
            $validCount++
        } else {
            $hasLazyBefore = $false
            $start = [Math]::Max(0, $i - 40)
            for ($j = $start; $j -lt $i; $j++) {
                if ($lines[$j] -match "<Lazy") {
                    $hasLazyBefore = $true
                    break
                }
            }
            
            if ($hasLazyBefore) {
                Write-Host ("  L{0,4} VALIDE (Lazy avant) : {1}" -f ($i + 1), $lines[$i].Trim()) -ForegroundColor Green
                $validCount++
            } else {
                Write-Host ("  L{0,4} ORPHELIN : {1}" -f ($i + 1), $lines[$i].Trim()) -ForegroundColor Red
                $orphans += $i + 1
            }
        }
    }
}

Write-Host ""
Write-Host ("Valides : {0}" -f $validCount) -ForegroundColor Green
Write-Host ("Orphelins : {0}" -f $orphans.Count) -ForegroundColor $(if ($orphans.Count -gt 0) { "Red" } else { "Green" })

# Compter aussi les <ViewLoader>
$openCount = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "<ViewLoader") {
        $openCount += ([regex]::Matches($lines[$i], "<ViewLoader")).Count
    }
}

Write-Host ""
Write-Host ("Balises <ViewLoader> ouvertes : {0}" -f $openCount) -ForegroundColor Cyan
Write-Host ("Balises </ViewLoader> fermees : {0}" -f ($validCount + $orphans.Count)) -ForegroundColor Cyan
Write-Host ""
if ($openCount -eq ($validCount + $orphans.Count)) {
    Write-Host "OK : Nombre de balises coherent" -ForegroundColor Green
} else {
    Write-Host "ATTENTION : Nombre de balises INCOHERENT" -ForegroundColor Red
}
