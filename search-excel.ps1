# ============================================================
# RECHERCHE EXHAUSTIVE - Fichiers Excel (.xlsx, .xls)
# ============================================================

Write-Host ""
Write-Host "=== 1. FICHIERS EXCEL DANS LE PROJET ===" -ForegroundColor Cyan
Write-Host ""

Get-ChildItem -Path "." -Recurse -Include "*.xlsx","*.xls","*.xlsm" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|\.venv|\.git|dist" } |
    Select-Object FullName, Length, LastWriteTime |
    Sort-Object LastWriteTime -Descending |
    Format-Table -AutoSize

Write-Host ""
Write-Host "=== 2. FICHIERS EXCEL DANS Downloads ===" -ForegroundColor Cyan
Write-Host ""

Get-ChildItem -Path "$env:USERPROFILE\Downloads" -Include "*.xlsx","*.xls","*.xlsm","*.csv" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|\.venv|\.git" } |
    Select-Object FullName, Length, LastWriteTime |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 30 |
    Format-Table -AutoSize

Write-Host ""
Write-Host "=== 3. FICHIERS EXCEL SUR LE BUREAU ===" -ForegroundColor Cyan
Write-Host ""

Get-ChildItem -Path "$env:USERPROFILE\Desktop" -Include "*.xlsx","*.xls","*.xlsm","*.csv" -Recurse -ErrorAction SilentlyContinue |
    Select-Object FullName, Length, LastWriteTime |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 30 |
    Format-Table -AutoSize

Write-Host ""
Write-Host "=== 4. FICHIERS CSV A LA RACINE ===" -ForegroundColor Cyan
Write-Host ""

Get-ChildItem -Path "." -Include "*.csv","*.xlsx","*.xls" -ErrorAction SilentlyContinue |
    Select-Object Name, Length, LastWriteTime |
    Sort-Object Name |
    Format-Table -AutoSize

Write-Host ""
Write-Host "=== 5. RECHERCHE DE DOSSIERS 'DATA', 'EXCEL', 'CLIENT' ===" -ForegroundColor Cyan
Write-Host ""

$searchDirs = @("data", "excel", "client", "import", "source", "fichiers", "documents", "docs")

foreach ($dir in $searchDirs) {
    Get-ChildItem -Path "." -Recurse -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "node_modules|\.venv|\.git|\._backups|dist" -and $_.Name -match $dir } |
        Select-Object -First 10 |
        ForEach-Object {
            Write-Host ("?? {0}" -f $_.FullName) -ForegroundColor Green
            Get-ChildItem $_.FullName -ErrorAction SilentlyContinue | Select-Object -First 15 | ForEach-Object {
                Write-Host ("   - {0} ({1} bytes)" -f $_.Name, $_.Length) -ForegroundColor DarkGray
            }
        }
}
