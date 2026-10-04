# ============================================================
# LIRE les 3 dernieres tables (coup?es dans l'affichage)
# ============================================================

Import-Module ImportExcel -ErrorAction SilentlyContinue

$basePath = "C:\Users\ASUS\Desktop\base agence fital"

$files = @(
    "R?glements_Loyer_Table.xlsx",
    "R?glement_Arri?r?s_Table.xlsx",
    "Op?rations.xlsx"
)

foreach ($file in $files) {
    $fullPath = Join-Path $basePath $file
    
    Write-Host ""
    Write-Host ("--- {0} ---" -f $file) -ForegroundColor Yellow
    
    if (-not (Test-Path $fullPath)) {
        Write-Host "  FICHIER NON TROUVE" -ForegroundColor Red
        continue
    }
    
    try {
        # Lire seulement les 100 premieres lignes (les gros fichiers prennent du temps)
        $data = Import-Excel -Path $fullPath -ErrorAction Stop | Select-Object -First 100
        
        if ($data -and $data.Count -gt 0) {
            Write-Host ("  Lignes (echantillon) : {0}" -f $data.Count) -ForegroundColor Green
            
            $cols = $data[0].PSObject.Properties.Name
            Write-Host ("  Colonnes ({0}) : {1}" -f $cols.Count, ($cols -join ", ")) -ForegroundColor White
        }
    } catch {
        Write-Host ("  Erreur : {0}" -f $_.Exception.Message) -ForegroundColor Red
    }
}
