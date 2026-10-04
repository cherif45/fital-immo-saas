# ============================================================
# PHASE 2 - AUDIT SECURITE - Partie 1
# ============================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  AUDIT SECURITE - PHASE 2" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 1. Structure du projet
# ============================================================
Write-Host "=== 1. STRUCTURE DU PROJET ===" -ForegroundColor Yellow
Write-Host ""

$projectFiles = @(
    "server.ts",
    "vite.config.ts",
    "package.json",
    ".env",
    ".env.local",
    ".env.production",
    ".gitignore",
    "src\lib\supabase\client.ts",
    "src\lib\supabase\service.ts"
)

foreach ($f in $projectFiles) {
    if (Test-Path $f) {
        $size = (Get-Item $f).Length
        Write-Host ("  OK   {0} ({1} bytes)" -f $f, $size) -ForegroundColor Green
    } else {
        Write-Host ("  --   {0} (absent)" -f $f) -ForegroundColor DarkGray
    }
}
Write-Host ""

# ============================================================
# 2. Secrets exposes dans le code
# ============================================================
Write-Host "=== 2. RECHERCHE DE SECRETS EXPOSES ===" -ForegroundColor Yellow
Write-Host ""

# Patterns de secrets connus
$secretPatterns = @(
    @{ Pattern = "service_role"; Description = "Cle service_role Supabase (CRITIQUE si exposee)" },
    @{ Pattern = "SUPABASE_SERVICE"; Description = "Variable service_role" },
    @{ Pattern = "eyJ[A-Za-z0-9_-]{20,}"; Description = "Token JWT potentiel" },
    @{ Pattern = "sk_live_"; Description = "Stripe live key" },
    @{ Pattern = "sk_test_"; Description = "Stripe test key" },
    @{ Pattern = "AKIA[0-9A-Z]{16}"; Description = "AWS Access Key" },
    @{ Pattern = "AIza[0-9A-Za-z_-]{35}"; Description = "Google API Key" },
    @{ Pattern = "ghp_[A-Za-z0-9]{36}"; Description = "GitHub Personal Access Token" },
    @{ Pattern = "password\s*=\s*['\`"][^'\`"]+['\`"]"; Description = "Password en dur" }
)

$foundSecrets = @()

Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx","*.js","*.jsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
        foreach ($sp in $secretPatterns) {
            $matches = [regex]::Matches($content, $sp.Pattern)
            if ($matches.Count -gt 0) {
                $foundSecrets += [PSCustomObject]@{
                    Fichier = $_.FullName.Replace($PWD.Path + '\', '')
                    Type = $sp.Description
                    Occurrences = $matches.Count
                }
            }
        }
    }

if ($foundSecrets.Count -eq 0) {
    Write-Host "  OK - Aucun secret expose detecte dans src/" -ForegroundColor Green
} else {
    Write-Host ("  ALERTE : {0} fichiers avec secrets potentiels" -f $foundSecrets.Count) -ForegroundColor Red
    $foundSecrets | Format-Table -AutoSize
}

Write-Host ""

# ============================================================
# 3. Verifier .gitignore
# ============================================================
Write-Host "=== 3. VERIFICATION .gitignore ===" -ForegroundColor Yellow
Write-Host ""

if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    
    $criticalPatterns = @(
        @{ Pattern = "\.env"; Description = "Fichiers .env" },
        @{ Pattern = "node_modules"; Description = "node_modules" },
        @{ Pattern = "\.bak"; Description = "Backups" },
        @{ Pattern = "\.backup"; Description = "Backups .backup" },
        @{ Pattern = "\._backups"; Description = "Dossier _backups" },
        @{ Pattern = "playwright-report"; Description = "Rapports Playwright" },
        @{ Pattern = "test-results"; Description = "Resultats de tests" }
    )
    
    foreach ($cp in $criticalPatterns) {
        if ($gitignoreContent -match $cp.Pattern) {
            Write-Host ("  OK   {0}" -f $cp.Description) -ForegroundColor Green
        } else {
            Write-Host ("  MANQUE {0}" -f $cp.Description) -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  ALERTE : .gitignore absent !" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# 4. Verifier si .env est committe dans Git
# ============================================================
Write-Host "=== 4. VERIFICATION GIT ===" -ForegroundColor Yellow
Write-Host ""

if (Test-Path ".git") {
    # Fichiers trackes dans git
    $tracked = git ls-files 2>$null
    
    $dangerous = $tracked | Where-Object { 
        $_ -match "\.env$" -or 
        $_ -match "\.env\.local$" -or 
        $_ -match "\.env\.production$" -or
        $_ -match "service_role"
    }
    
    if ($dangerous) {
        Write-Host "  ALERTE : Fichiers sensibles committes dans Git :" -ForegroundColor Red
        $dangerous | ForEach-Object { Write-Host ("    - {0}" -f $_) -ForegroundColor Red }
    } else {
        Write-Host "  OK - Aucun fichier .env committe" -ForegroundColor Green
    }
    
    # Nombre de commits
    $commitCount = (git rev-list --count HEAD 2>$null)
    Write-Host ("  Info : {0} commits dans l'historique" -f $commitCount) -ForegroundColor Cyan
} else {
    Write-Host "  Info : Pas de dossier .git (pas un repo Git)" -ForegroundColor DarkGray
}

Write-Host ""

# ============================================================
# 5. RLS Supabase - Chercher les tables creees
# ============================================================
Write-Host "=== 5. RECHERCHE DES TABLES SUPABASE ===" -ForegroundColor Yellow
Write-Host ""

# Chercher des references a des tables Supabase
$tableRefs = @()
Get-ChildItem -Path "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    ForEach-Object {
        $content = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
        # Chercher .from('...') et .from("...")
        $matches = [regex]::Matches($content, "\.from\(['`"]([a-z_]+)['`"]\)")
        foreach ($m in $matches) {
            $tableRefs += $m.Groups[1].Value
        }
    }

$uniqueTables = $tableRefs | Select-Object -Unique | Sort-Object
Write-Host ("  {0} tables referencees dans le code :" -f $uniqueTables.Count) -ForegroundColor Cyan
$uniqueTables | ForEach-Object { Write-Host ("    - {0}" -f $_) -ForegroundColor White }

Write-Host ""

# ============================================================
# 6. Verifier dangerouslySetInnerHTML (XSS)
# ============================================================
Write-Host "=== 6. RECHERCHE XSS (dangerouslySetInnerHTML) ===" -ForegroundColor Yellow
Write-Host ""

$dangerousHTML = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    Select-String -Pattern "dangerouslySetInnerHTML" -ErrorAction SilentlyContinue

if ($dangerousHTML) {
    Write-Host ("  ALERTE : {0} usages de dangerouslySetInnerHTML" -f $dangerousHTML.Count) -ForegroundColor Red
    $dangerousHTML | ForEach-Object {
        Write-Host ("    - {0}:{1}" -f $_.Path.Replace($PWD.Path + '\', ''), $_.LineNumber) -ForegroundColor Yellow
    }
} else {
    Write-Host "  OK - Aucun usage de dangerouslySetInnerHTML" -ForegroundColor Green
}

Write-Host ""

# ============================================================
# 7. Verifier eval / Function (execution de code)
# ============================================================
Write-Host "=== 7. RECHERCHE DE eval() / new Function() ===" -ForegroundColor Yellow
Write-Host ""

$dangerous = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" } |
    Select-String -Pattern "\beval\(|new\s+Function\(" -ErrorAction SilentlyContinue

if ($dangerous) {
    Write-Host ("  ALERTE : {0} usages d'eval/Function" -f $dangerous.Count) -ForegroundColor Red
    $dangerous | ForEach-Object {
        Write-Host ("    - {0}:{1}" -f $_.Path.Replace($PWD.Path + '\', ''), $_.LineNumber) -ForegroundColor Yellow
    }
} else {
    Write-Host "  OK - Aucun usage de eval/Function" -ForegroundColor Green
}

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  FIN PARTIE 1 - Colle-moi tout le resultat" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
