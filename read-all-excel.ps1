# ============================================================
# LIRE LES 11 FICHIERS EXCEL DU CLIENT
# ============================================================

Import-Module ImportExcel -ErrorAction SilentlyContinue

$basePath = "C:\Users\ASUS\Desktop\base agence fital"

$files = @(
    "Produit_Table.xlsx",
    "Locataires_Table.xlsx",
    "Immeubles_Table.xlsx",
    "Propri?taires_Table.xlsx",
    "Contrats_Table.xlsx",
    "Charges.xlsx",
    "Charges Agence_Table.xlsx",
    "Versements_Prop_Table.xlsx",
    "R?glements_Loyer_Table.xlsx",
    "R?glement_Arri?r?s_Table.xlsx",
    "Op?rations.xlsx"
)

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  ANALYSE DES 11 FICHIERS DU CLIENT" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

foreach ($file in $files) {
    $fullPath = Join-Path $basePath $file
    
    Write-Host ""
    Write-Host ("--- {0} ---" -f $file) -ForegroundColor Yellow
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "  FICHIER NON TROUVE" -ForegroundColor Red
        continue
    }
    
    try {
        # Lister les feuilles
        $sheets = Get-ExcelSheetInfo -Path $fullPath -ErrorAction SilentlyContinue
        
        if ($sheets) {
            Write-Host ("  Feuilles : {0}" -f ($sheets.Name -join ", ")) -ForegroundColor DarkGray
        }
        
        # Lire la 1ere feuille
        $data = Import-Excel -Path $fullPath -ErrorAction Stop
        
        if ($data -and $data.Count -gt 0) {
            Write-Host ("  Lignes : {0}" -f $data.Count) -ForegroundColor Green
            
            # Colonnes
            $cols = $data[0].PSObject.Properties.Name
            Write-Host ("  Colonnes ({0}) : {1}" -f $cols.Count, ($cols -join ", ")) -ForegroundColor White
        } else {
            Write-Host "  AUCUNE DONNEE" -ForegroundColor Yellow
        }
    } catch {
        Write-Host ("  Erreur : {0}" -f $_.Exception.Message) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== FIN ANALYSE ===" -ForegroundColor Cyan
