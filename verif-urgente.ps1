# ============================================================
# VERIFICATION URGENTE - Fuite de secrets ?
# ============================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION URGENTE - Fuite de secrets ?" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 1. Verifier si .env est committe dans Git
# ============================================================
Write-Host "=== 1. .env dans Git ? ===" -ForegroundColor Yellow
Write-Host ""

$gitEnv = git ls-files 2>$null | Where-Object { $_ -match "\.env" }
if ($gitEnv) {
    Write-Host "  CRITIQUE : Fichiers .env committes dans Git :" -ForegroundColor Red
    $gitEnv | ForEach-Object { Write-Host ("    - {0}" -f $_) -ForegroundColor Red }
    Write-Host ""
    Write-Host "  ACTION IMMEDIATE :" -ForegroundColor Red
    Write-Host "    1. Retirer du tracking : git rm --cached .env .env.local .env.production" -ForegroundColor White
    Write-Host "    2. Revoquer TOUTES les cles Supabase dans le dashboard" -ForegroundColor White
    Write-Host "    3. Regenerer les cles" -ForegroundColor White
} else {
    Write-Host "  OK - Aucun fichier .env committe dans Git" -ForegroundColor Green
}

Write-Host ""

# ============================================================
# 2. Verifier l'historique Git (anciens commits)
# ============================================================
Write-Host "=== 2. Historique Git - Anciens .env ? ===" -ForegroundColor Yellow
Write-Host ""

$historyEnv = git log --all --full-history --name-only 2>$null | Select-String "\.env" | Select-Object -Unique -First 20
if ($historyEnv) {
    Write-Host "  ATTENTION : .env trouve dans l'historique Git :" -ForegroundColor Yellow
    $historyEnv | ForEach-Object { Write-Host ("    {0}" -f $_.Line) -ForegroundColor Yellow }
    Write-Host ""
    Write-Host "  Si les cles n'ont PAS ete revoquees, elles sont considerees comme compromises." -ForegroundColor Red
} else {
    Write-Host "  OK - Aucun .env dans l'historique Git" -ForegroundColor Green
}

Write-Host ""

# ============================================================
# 3. Voir le contenu du .env.production (noms uniquement)
# ============================================================
Write-Host "=== 3. .env.production - variables ===" -ForegroundColor Yellow
Write-Host ""

if (Test-Path ".env.production") {
    $lines = Get-Content ".env.production"
    foreach ($line in $lines) {
        if ($line -match "^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$") {
            $key = $matches[1]
            $value = $matches[2]
            $masked = if ($value.Length -gt 8) { $value.Substring(0, 4) + "***" } else { "(vide ou court)" }
            Write-Host ("  {0} = {1}" -f $key, $masked) -ForegroundColor White
        }
    }
} else {
    Write-Host "  Fichier absent" -ForegroundColor DarkGray
}

Write-Host ""

# ============================================================
# 4. Comparer .env et .env.local
# ============================================================
Write-Host "=== 4. .env vs .env.local (identiques ?) ===" -ForegroundColor Yellow
Write-Host ""

if ((Test-Path ".env") -and (Test-Path ".env.local")) {
    $envHash = (Get-FileHash ".env" -Algorithm MD5).Hash
    $envLocalHash = (Get-FileHash ".env.local" -Algorithm MD5).Hash
    
    if ($envHash -eq $envLocalHash) {
        Write-Host "  ATTENTION : .env et .env.local sont IDENTIQUES" -ForegroundColor Yellow
        Write-Host "  -> .env.local doit contenir UNIQUEMENT les secrets locaux" -ForegroundColor Yellow
    } else {
        Write-Host "  OK - Les fichiers sont differents" -ForegroundColor Green
    }
} else {
    Write-Host "  Un des deux fichiers manque" -ForegroundColor DarkGray
}

Write-Host ""

# ============================================================
# 5. Verifier CORS dans server.ts
# ============================================================
Write-Host "=== 5. CORS dans server.ts ===" -ForegroundColor Yellow
Write-Host ""

if (Test-Path "server.ts") {
    $content = Get-Content "server.ts" -Raw
    
    # Chercher toutes les mentions de cors
    $corsLines = $content -split "`r?`n" | Where-Object { $_ -match "cors|Access-Control" }
    if ($corsLines) {
        Write-Host "  Lignes liees a CORS :" -ForegroundColor Cyan
        $corsLines | ForEach-Object { Write-Host ("    {0}" -f $_.Trim()) -ForegroundColor White }
    } else {
        Write-Host "  Aucune mention de CORS dans server.ts" -ForegroundColor DarkGray
        Write-Host "  -> Si tu utilises express, un middleware CORS est recommande" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Fichier absent" -ForegroundColor DarkGray
}

Write-Host ""

# ============================================================
# 6. Voir le contenu de server.ts (30 premieres lignes)
# ============================================================
Write-Host "=== 6. server.ts (30 premieres lignes) ===" -ForegroundColor Yellow
Write-Host ""

if (Test-Path "server.ts") {
    $lines = Get-Content "server.ts"
    $count = [Math]::Min(30, $lines.Count)
    for ($i = 0; $i -lt $count; $i++) {
        Write-Host ("{0,3}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
    }
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  FIN VERIFICATION URGENTE" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
