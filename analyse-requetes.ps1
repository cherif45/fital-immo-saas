# ============================================================
# ANALYSE - Categoriser les requetes Supabase
# ============================================================

$filePath = "src\lib\supabase\service.ts"
$lines = Get-Content $filePath

Write-Host ""
Write-Host "=== CATEGORISATION DES REQUETES SUPABASE ===" -ForegroundColor Cyan
Write-Host ""

$insertCount = 0
$updateCount = 0
$deleteCount = 0
$selectFiltered = 0
$selectUnfiltered = 0
$upsertCount = 0

foreach ($line in $lines) {
    if ($line -match "\.from\(") {
        if ($line -match "\.insert\(") { $insertCount++ }
        elseif ($line -match "\.update\(") { $updateCount++ }
        elseif ($line -match "\.delete\(") { $deleteCount++ }
        elseif ($line -match "\.upsert\(") { $upsertCount++ }
        elseif ($line -match "\.select\(") {
            # Verifier si la requete a un filtre
            if ($line -match "\.eq\(|\.is\(|\.in\(|\.gte\(|\.lte\(|agencyFilter") {
                $selectFiltered++
            } else {
                $selectUnfiltered++
            }
        }
    }
}

Write-Host "  SELECT avec filtre : $selectFiltered" -ForegroundColor Green
Write-Host "  SELECT sans filtre : $selectUnfiltered" -ForegroundColor $(if ($selectUnfiltered -gt 20) { "Red" } else { "Yellow" })
Write-Host "  INSERT             : $insertCount" -ForegroundColor White
Write-Host "  UPDATE             : $updateCount" -ForegroundColor White
Write-Host "  DELETE             : $deleteCount" -ForegroundColor White
Write-Host "  UPSERT             : $upsertCount" -ForegroundColor White
Write-Host ""

# Afficher les SELECT sans filtre
Write-Host "=== SELECT SANS FILTRE (a verifier) ===" -ForegroundColor Yellow
Write-Host ""

$shown = 0
foreach ($line in $lines) {
    if ($line -match "\.select\(" -and $line -match "\.from\(" -and $line -notmatch "\.eq\(|\.is\(|\.in\(|agencyFilter") {
        if ($shown -lt 20) {
            $trimmed = $line.Trim()
            if ($trimmed.Length -gt 100) { $trimmed = $trimmed.Substring(0, 100) + "..." }
            Write-Host ("  {0}" -f $trimmed) -ForegroundColor White
            $shown++
        }
    }
}

if ($shown -ge 20) {
    Write-Host ""
    Write-Host "  ... et plus" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "=== CONCLUSION ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Les INSERT/UPDATE/DELETE n'ont PAS besoin de filtre agency_id" -ForegroundColor DarkGray
Write-Host "  (ils envoient agency_id: agencyId dans le body)" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Les SELECT sans filtre sont a verifier manuellement" -ForegroundColor DarkGray
Write-Host "  (peuvent etre legitimes si filtres par ID ou dans une RPC)" -ForegroundColor DarkGray
