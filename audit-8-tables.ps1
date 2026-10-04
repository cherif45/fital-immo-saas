# ============================================================
# AUDIT - 8 tables suspectes (RLS + 0 policies)
# Verifier references dans le code + contenu
# ============================================================

$tablesToAudit = @(
    "charges_mapping",
    "documents",
    "imported_payments_archive",
    "produits",
    "properties_manual_mapping",
    "properties_owner_mapping",
    "temp_contrats",
    "temp_versements"
)

Write-Host ""
Write-Host "=== References dans le code (TS/TSX/SQL) ===" -ForegroundColor Cyan
Write-Host ""

foreach ($table in $tablesToAudit) {
    $refs = Get-ChildItem -Path "src", "supabase", "sql" -Recurse -Include "*.ts","*.tsx","*.sql" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
        Select-String -Pattern $table -ErrorAction SilentlyContinue

    if ($refs) {
        Write-Host ("{0} -> {1} refs" -f $table, $refs.Count) -ForegroundColor Yellow
        $refs | Select-Object -First 3 | ForEach-Object {
            Write-Host ("    {0}:{1}" -f $_.Path.Replace($PWD.Path + '\', ''), $_.LineNumber) -ForegroundColor DarkGray
        }
    } else {
        Write-Host ("{0} -> AUCUNE reference" -f $table) -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "=== VERDICT PAR TABLE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Aucune reference = SUPPRESSION SANS RISQUE (si orpheline)" -ForegroundColor White
Write-Host "  References trouvees = VERIFIER avant de supprimer" -ForegroundColor White
