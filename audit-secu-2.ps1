# ============================================================
# PHASE 2 - AUDIT SECURITE - Partie 2
# Analyse de client.ts, service.ts, server.ts, .env, .gitignore
# ============================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  AUDIT SECURITE - PARTIE 2 (fichiers critiques)" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 1. Contenu du .gitignore
# ============================================================
Write-Host "=== 1. CONTENU .gitignore ===" -ForegroundColor Yellow
Write-Host ""
Get-Content ".gitignore"
Write-Host ""

# ============================================================
# 2. Structure du .env (NOMS des cles uniquement, PAS les valeurs)
# ============================================================
Write-Host "=== 2. VARIABLES .env (noms uniquement, valeurs masquees) ===" -ForegroundColor Yellow
Write-Host ""

if (Test-Path ".env") {
    $envLines = Get-Content ".env"
    foreach ($line in $envLines) {
        if ($line -match "^\s*#") {
            Write-Host ("  {0}" -f $line) -ForegroundColor DarkGray
            continue
        }
        if ($line -match "^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$") {
            $key = $matches[1]
            $value = $matches[2]
            $masked = if ($value.Length -gt 8) { $value.Substring(0, 4) + "***" + $value.Substring($value.Length - 4) } else { "***" }
            $sensitive = $key -match "KEY|SECRET|TOKEN|PASSWORD|SERVICE|PRIVATE"
            $color = if ($sensitive) { "Red" } else { "White" }
            Write-Host ("  {0} = {1}" -f $key, $masked) -ForegroundColor $color
        } elseif ($line.Trim().Length -gt 0) {
            Write-Host ("  {0}" -f $line) -ForegroundColor DarkGray
        }
    }
} else {
    Write-Host "  .env absent" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# 3. Analyse client.ts (cle Supabase publique = OK, service_role = INTERDIT)
# ============================================================
Write-Host "=== 3. ANALYSE src\lib\supabase\client.ts ===" -ForegroundColor Yellow
Write-Host ""

if (Test-Path "src\lib\supabase\client.ts") {
    $content = Get-Content "src\lib\supabase\client.ts" -Raw
    
    # Chercher les references a des cles
    $hasAnonKey = $content -match "VITE_SUPABASE_ANON_KEY|anon_key|anonKey"
    $hasServiceRole = $content -match "SERVICE_ROLE|service_role|serviceRole"
    $hasUrl = $content -match "VITE_SUPABASE_URL|supabaseUrl"
    $hasImportMetaEnv = $content -match "import\.meta\.env"
    $hasHardcoded = $content -match "eyJ[A-Za-z0-9_-]{20,}|https://[a-z]+\.supabase\.co"
    
    Write-Host ("  URL via env       : {0}" -f $(if ($hasUrl) { "OUI" } else { "NON" })) -ForegroundColor $(if ($hasUrl) { "Green" } else { "Yellow" })
    Write-Host ("  Anon key via env  : {0}" -f $(if ($hasAnonKey) { "OUI" } else { "NON" })) -ForegroundColor $(if ($hasAnonKey) { "Green" } else { "Yellow" })
    Write-Host ("  Service_role ref  : {0}" -f $(if ($hasServiceRole) { "ALERTE !" } else { "NON" })) -ForegroundColor $(if ($hasServiceRole) { "Red" } else { "Green" })
    Write-Host ("  import.meta.env   : {0}" -f $(if ($hasImportMetaEnv) { "OUI" } else { "NON" })) -ForegroundColor $(if ($hasImportMetaEnv) { "Green" } else { "Yellow" })
    Write-Host ("  Valeurs hardcodees: {0}" -f $(if ($hasHardcoded) { "ALERTE !" } else { "NON" })) -ForegroundColor $(if ($hasHardcoded) { "Red" } else { "Green" })
    Write-Host ""
    
    if ($hasServiceRole) {
        Write-Host "  CRITIQUE : Le service_role est reference dans le client front." -ForegroundColor Red
        Write-Host "  Le service_role contourne TOUTES les RLS. Il doit rester cote serveur uniquement." -ForegroundColor Red
    }
} else {
    Write-Host "  Fichier absent" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# 4. Analyse server.ts (CORS, routes, auth)
# ============================================================
Write-Host "=== 4. ANALYSE server.ts ===" -ForegroundColor Yellow
Write-Host ""

if (Test-Path "server.ts") {
    $content = Get-Content "server.ts" -Raw
    
    # CORS
    $corsMatch = [regex]::Match($content, "cors\([^)]*\)")
    if ($corsMatch.Success) {
        $corsConfig = $corsMatch.Value
        Write-Host "  Configuration CORS trouvee :" -ForegroundColor Cyan
        Write-Host ("    {0}" -f $corsConfig.Replace("`n", " ").Replace("`r", "")) -ForegroundColor White
        
        if ($corsConfig -match "origin\s*:\s*['`"]?\*['`"]?" -or $corsConfig -match "origin\s*:\s*true") {
            Write-Host "    ALERTE : CORS ouvert a TOUS (*) - risque CSRF" -ForegroundColor Red
        } elseif ($corsConfig -match "origin\s*:") {
            Write-Host "    OK : CORS avec origine specifiee" -ForegroundColor Green
        }
    } else {
        Write-Host "  Aucune config CORS explicite (a verifier manuellement)" -ForegroundColor Yellow
    }
    
    # Rate limiting
    $hasRateLimit = $content -match "rate.?limit|express-rate-limit|rateLimit"
    Write-Host ("  Rate limiting     : {0}" -f $(if ($hasRateLimit) { "OUI" } else { "NON (a ajouter)" })) -ForegroundColor $(if ($hasRateLimit) { "Green" } else { "Yellow" })
    
    # Helmet (headers securite)
    $hasHelmet = $content -match "helmet"
    Write-Host ("  Helmet (headers)  : {0}" -f $(if ($hasHelmet) { "OUI" } else { "NON (recommande)" })) -ForegroundColor $(if ($hasHelmet) { "Green" } else { "Yellow" })
    
    # Service role cote serveur (OK, mais a verifier)
    $hasServiceRole = $content -match "SERVICE_ROLE|service_role|serviceRole"
    Write-Host ("  service_role serveur : {0}" -f $(if ($hasServiceRole) { "OUI (OK si uniquement serveur)" } else { "NON" })) -ForegroundColor Cyan
    
    # Routes exposees
    Write-Host ""
    Write-Host "  Routes declarees :" -ForegroundColor Cyan
    $routeMatches = [regex]::Matches($content, "app\.(get|post|put|delete|patch)\s*\(\s*['`"]([^'`"]+)['`"]")
    if ($routeMatches.Count -gt 0) {
        foreach ($r in $routeMatches) {
            $method = $r.Groups[1].Value.ToUpper()
            $path = $r.Groups[2].Value
            $color = if ($path -match "admin|super|service|secret") { "Yellow" } else { "White" }
            Write-Host ("    {0,-6} {1}" -f $method, $path) -ForegroundColor $color
        }
    } else {
        Write-Host "    Aucune route Express detectee (peut-etre juste du proxy)" -ForegroundColor DarkGray
    }
} else {
    Write-Host "  server.ts absent" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# 5. Recherche de clients Supabase mal configures
# ============================================================
Write-Host "=== 5. RECHERCHE clients Supabase dans src/ ===" -ForegroundColor Yellow
Write-Host ""

$supabaseRefs = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    Select-String -Pattern "createClient\s*\(" -ErrorAction SilentlyContinue

if ($supabaseRefs) {
    Write-Host ("  {0} appels a createClient :" -f $supabaseRefs.Count) -ForegroundColor Cyan
    $supabaseRefs | ForEach-Object {
        Write-Host ("    - {0}:{1}" -f $_.Path.Replace($PWD.Path + '\', ''), $_.LineNumber) -ForegroundColor White
    }
    
    # Verifier qu'aucun n'utilise SERVICE_ROLE cote client
    $serviceRoleInClient = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
        Select-String -Pattern "SERVICE_ROLE|service_role" -ErrorAction SilentlyContinue
    
    if ($serviceRoleInClient) {
        Write-Host ""
        Write-Host "  CRITIQUE : service_role reference dans le CLIENT :" -ForegroundColor Red
        $serviceRoleInClient | ForEach-Object {
            Write-Host ("    - {0}:{1}" -f $_.Path.Replace($PWD.Path + '\', ''), $_.LineNumber) -ForegroundColor Red
        }
    } else {
        Write-Host "  OK - Aucune reference a service_role dans le client" -ForegroundColor Green
    }
} else {
    Write-Host "  Aucun createClient detecte" -ForegroundColor DarkGray
}

Write-Host ""

# ============================================================
# 6. Verifier localStorage (donnees sensibles)
# ============================================================
Write-Host "=== 6. RECHERCHE localStorage (donnees sensibles) ===" -ForegroundColor Yellow
Write-Host ""

$localStorageRefs = Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    Select-String -Pattern "localStorage\.(setItem|getItem)" -ErrorAction SilentlyContinue

if ($localStorageRefs) {
    # Chercher des cles sensibles
    $sensitiveKeys = @()
    foreach ($ref in $localStorageRefs) {
        if ($ref.Line -match "token|password|secret|session|auth") {
            $sensitiveKeys += $ref
        }
    }
    
    Write-Host ("  {0} usages de localStorage" -f $localStorageRefs.Count) -ForegroundColor Cyan
    
    if ($sensitiveKeys.Count -gt 0) {
        Write-Host ""
        Write-Host ("  ATTENTION : {0} references a des cles sensibles" -f $sensitiveKeys.Count) -ForegroundColor Yellow
        $sensitiveKeys | Select-Object -First 10 | ForEach-Object {
            $line = $_.Line.Trim()
            if ($line.Length -gt 80) { $line = $line.Substring(0, 80) + "..." }
            Write-Host ("    - {0}:{1}" -f $_.Path.Replace($PWD.Path + '\', ''), $_.LineNumber) -ForegroundColor Yellow
            Write-Host ("      {0}" -f $line) -ForegroundColor DarkGray
        }
    } else {
        Write-Host "  OK - Aucune cle sensible en localStorage" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  FIN PARTIE 2 - Colle-moi tout le resultat" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
