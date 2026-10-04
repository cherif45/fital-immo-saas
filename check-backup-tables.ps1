# ============================================================
# VERIFICATION - Les tables backup sont-elles utilisees ?
# ============================================================

Write-Host ""
Write-Host "=== Les tables backup sont-elles referencees dans le code ? ===" -ForegroundColor Cyan
Write-Host ""

$backupTables = @(
    "tenants_83_backup",
    "tenants_a_fusionner_27",
    "tenants_backup_20261003",
    "tenants_doublons_83",
    "tenants_doublons_identifies",
    "tenants_urgent_backup"
)

$found = $false

foreach ($table in $backupTables) {
    $refs = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
        Select-String -Pattern $table -ErrorAction SilentlyContinue

    if ($refs) {
        Write-Host ("  ATTENTION : '{0}' reference dans le code !" -f $table) -ForegroundColor Red
        $refs | ForEach-Object {
            Write-Host ("    - {0}:{1}" -f $_.Path.Replace($PWD.Path + '\', ''), $_.LineNumber) -ForegroundColor Yellow
        }
        $found = $true
    } else {
        Write-Host ("  OK : '{0}' non reference" -f $table) -ForegroundColor Green
    }
}

Write-Host ""

if ($found) {
    Write-Host "ATTENTION : certaines tables backup sont encore utilisees" -ForegroundColor Red
    Write-Host "-> NE PAS SUPPRIMER avant de corriger le code" -ForegroundColor Red
} else {
    Write-Host "VERDICT : Aucune table backup n'est utilisee dans le code" -ForegroundColor Green
    Write-Host "-> SUPPRESSION SANS RISQUE" -ForegroundColor Green
    Write-Host ""
    Write-Host "Actions recommandees :" -ForegroundColor Cyan
    Write-Host "  1. Faire un BACKUP SQL complet de ces tables (au cas ou)" -ForegroundColor White
    Write-Host "  2. Les supprimer via Supabase SQL Editor" -ForegroundColor White
    Write-Host "  3. Verifier qu'il ne reste plus de tables backup" -ForegroundColor White
}

Write-Host ""
Write-Host "=== Fichiers SQL de fusion existants ? ===" -ForegroundColor Cyan
Write-Host ""

$sqlFiles = Get-ChildItem -Path "." -Recurse -Include "*.sql" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|\.git" } |
    Select-Object -First 20

if ($sqlFiles) {
    Write-Host ("{0} fichiers SQL trouves :" -f $sqlFiles.Count) -ForegroundColor White
    $sqlFiles | ForEach-Object {
        Write-Host ("  - {0} ({1} bytes)" -f $_.FullName.Replace($PWD.Path + '\', ''), $_.Length) -ForegroundColor DarkGray
    }
} else {
    Write-Host "Aucun fichier SQL a la racine" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "=== Fichiers Python/scripts de fusion ? ===" -ForegroundColor Cyan
Write-Host ""

$pyFiles = Get-ChildItem -Path "." -Include "*.py" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|\.git" } |
    Select-Object -First 20

if ($pyFiles) {
    Write-Host ("{0} fichiers Python trouves :" -f $pyFiles.Count) -ForegroundColor White
    $pyFiles | ForEach-Object {
        Write-Host ("  - {0}" -f $_.Name) -ForegroundColor DarkGray
    }
} else {
    Write-Host "Aucun fichier Python a la racine" -ForegroundColor DarkGray
}
