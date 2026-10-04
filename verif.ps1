$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=== VERIFICATION DOUBLONS CSV vs SUPABASE ===" -ForegroundColor Cyan
Write-Host ""

function Check-CSV {
    param([string]$File, [string]$RefPattern, [string]$TableName)
    
    Write-Host "--- $TableName ---" -ForegroundColor Yellow
    
    if (-not (Test-Path $File)) {
        Write-Host "  FICHIER ABSENT" -ForegroundColor Red
        return
    }
    
    $lines = Get-Content $File -Encoding UTF8
    Write-Host ("  Total lignes CSV : {0}" -f $lines.Count)
    
    $header = $lines[0] -split ","
    $refIndex = -1
    for ($i = 0; $i -lt $header.Count; $i++) {
        if ($header[$i] -match $RefPattern) {
            $refIndex = $i
            break
        }
    }
    
    if ($refIndex -lt 0) {
        Write-Host "  Colonne ref non trouvee" -ForegroundColor Red
        return
    }
    
    $refs = @()
    for ($i = 1; $i -lt $lines.Count; $i++) {
        $cells = $lines[$i] -split ","
        if ($cells.Count -gt $refIndex) {
            $ref = $cells[$refIndex].Trim()
            if ($ref -ne "") {
                $refs += $ref
            }
        }
    }
    
    $uniqueRefs = $refs | Select-Object -Unique
    
    Write-Host ("  Refs valides : {0}" -f $refs.Count) -ForegroundColor White
    Write-Host ("  Refs uniques : {0}" -f $uniqueRefs.Count) -ForegroundColor Cyan
    Write-Host ("  Doublons : {0}" -f ($refs.Count - $uniqueRefs.Count)) -ForegroundColor Yellow
    Write-Host ""
}

Check-CSV -File "locataires.csv" -RefPattern "Ref_Locataire" -TableName "LOCATAIRES"
Check-CSV -File "immeubles.csv" -RefPattern "Ref_Immeuble" -TableName "IMMEUBLES"
Check-CSV -File "proprietaires.csv" -RefPattern "Ref_Propri" -TableName "PROPRIETAIRES"
Check-CSV -File "versements_prop.csv" -RefPattern "Ref_Versement" -TableName "VERSEMENTS_PROP"

Write-Host "=== CONCLUSION ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Si 'Refs uniques' = nb Supabase, alors PAS de manquants."
