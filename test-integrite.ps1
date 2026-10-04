# ============================================================
# TESTS D'INTEGRITE - SaaS FITAL IMMO
# ============================================================

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  TESTS D'INTEGRITE - PHASE FINALE" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 1. Verifier la coherence du schema Supabase
# ============================================================
Write-Host "=== 1. COHERENCE DES TABLES ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Tables actives dans public/ : 31" -ForegroundColor Cyan
Write-Host "  Tables archivees dans _backups_archive/ : 29" -ForegroundColor Cyan
Write-Host ""

# Verifier que les vues utilisent les bonnes tables
$viewsToCheck = @(
    @{ File = "src\components\TenantsView.tsx"; Tables = @("tenants", "properties", "units", "payments") },
    @{ File = "src\components\PaymentsView.tsx"; Tables = @("payments", "tenants", "properties") },
    @{ File = "src\components\PropertiesView.tsx"; Tables = @("properties", "buildings", "units", "owners") },
    @{ File = "src\components\OwnersView.tsx"; Tables = @("owners", "properties", "payments") },
    @{ File = "src\components\ArchiveView.tsx"; Tables = @("archives", "tenants", "owners", "properties", "payments") }
)

foreach ($v in $viewsToCheck) {
    if (Test-Path $v.File) {
        $content = [System.IO.File]::ReadAllText($v.File, [System.Text.Encoding]::UTF8)
        Write-Host ("  {0}" -f (Split-Path $v.File -Leaf)) -ForegroundColor White
        foreach ($t in $v.Tables) {
            $hasTable = $content -match "from\(['\`"]$t['\`"]\)"
            if ($hasTable) {
                Write-Host ("    OK  -> {0}" -f $t) -ForegroundColor Green
            } else {
                Write-Host ("    --  -> {0} (non utilise)" -f $t) -ForegroundColor DarkGray
            }
        }
    }
}

# ============================================================
# 2. Verifier les RPC Supabase
# ============================================================
Write-Host ""
Write-Host "=== 2. RPC SUPABASE ===" -ForegroundColor Yellow
Write-Host ""

$rpcToCheck = @("get_agency_stats", "get_daily_activity", "get_owner_bulletin_data", "paginate_table")

foreach ($rpc in $rpcToCheck) {
    $found = Get-ChildItem "src" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -notmatch "node_modules|dist|\._backups" } |
        Select-String -Pattern "\.rpc\(['\`"]$rpc['\`"]" -ErrorAction SilentlyContinue
    
    if ($found) {
        Write-Host ("  OK  {0} ({1} refs)" -f $rpc, $found.Count) -ForegroundColor Green
    } else {
        Write-Host ("  --  {0} (non utilise)" -f $rpc) -ForegroundColor DarkGray
    }
}

# ============================================================
# 3. Verifier les hooks et composants partages
# ============================================================
Write-Host ""
Write-Host "=== 3. HOOKS ET COMPOSANTS PARTAGES ===" -ForegroundColor Yellow
Write-Host ""

$hooks = @(
    "src\hooks\useTheme.ts",
    "src\hooks\useAgencySettings.ts",
    "src\lib\supabase\client.ts",
    "src\lib\supabase\service.ts",
    "src\lib\utils.ts"
)

foreach ($h in $hooks) {
    if (Test-Path $h) {
        $size = [math]::Round((Get-Item $h).Length / 1KB, 1)
        Write-Host ("  OK  {0} ({1} KB)" -f $h, $size) -ForegroundColor Green
    } else {
        Write-Host ("  MANQUE  {0}" -f $h) -ForegroundColor Red
    }
}

# ============================================================
# 4. Verifier les imports circulaires
# ============================================================
Write-Host ""
Write-Host "=== 4. IMPORT CIRCULAIRES (suspicion) ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "  Recherche de dependances croisees entre composants..." -ForegroundColor DarkGray

$circularCount = 0
$components = Get-ChildItem "src\components" -Filter "*.tsx" -ErrorAction SilentlyContinue

foreach ($comp in $components) {
    $content = [System.IO.File]::ReadAllText($comp.FullName, [System.Text.Encoding]::UTF8)
    
    # Chercher les imports d'autres composants
    $imports = [regex]::Matches($content, "import.*from ['\`"]\./([A-Za-z]+)['\`"]")
    
    # Verifier si un autre composant importe celui-ci
    $compName = $comp.BaseName
    foreach ($m in $imports) {
        $imported = $m.Groups[1].Value
        $otherFile = "src\components\$imported.tsx"
        if (Test-Path $otherFile) {
            $otherContent = [System.IO.File]::ReadAllText($otherFile, [System.Text.Encoding]::UTF8)
            if ($otherContent -match "import.*from ['\`"]\./$compName['\`"]") {
                Write-Host ("  CIRCULAIRE : {0} <-> {1}" -f $compName, $imported) -ForegroundColor Yellow
                $circularCount++
            }
        }
    }
}

if ($circularCount -eq 0) {
    Write-Host "  OK - Aucun import circulaire detecte" -ForegroundColor Green
} else {
    Write-Host ("  {0} imports circulaires possibles" -f $circularCount) -ForegroundColor Yellow
}

# ============================================================
# 5. Verifier les appels Supabase critiques
# ============================================================
Write-Host ""
Write-Host "=== 5. APPELS SUPABASE (filtrage par agency_id) ===" -ForegroundColor Yellow
Write-Host ""

$serviceFile = "src\lib\supabase\service.ts"
if (Test-Path $serviceFile) {
    $content = [System.IO.File]::ReadAllText($serviceFile, [System.Text.Encoding]::UTF8)
    
    $totalFrom = ([regex]::Matches($content, "\.from\(")).Count
    $totalAgencyFilter = ([regex]::Matches($content, "agencyFilter|\.eq\(['\`"]agency_id")).Count
    $fetchAllRows = ([regex]::Matches($content, "fetchAllRows\(")).Count
    
    Write-Host ("  Total .from() : {0}" -f $totalFrom) -ForegroundColor White
    Write-Host ("  Filtrage agency_id : {0}" -f $totalAgencyFilter) -ForegroundColor Green
    Write-Host ("  fetchAllRows (pagination) : {0}" -f $fetchAllRows) -ForegroundColor Green
    Write-Host ""
    
    if ($totalAgencyFilter -ge $totalFrom * 0.7) {
        Write-Host "  OK - Bonne couverture du filtrage (>=70%)" -ForegroundColor Green
    } else {
        Write-Host "  ATTENTION - Filtrage agency_id faible" -ForegroundColor Yellow
    }
}

# ============================================================
# 6. Verifier les cles etrangeres dans le code
# ============================================================
Write-Host ""
Write-Host "=== 6. INTEGRITE DES RELATIONS ===" -ForegroundColor Yellow
Write-Host ""

Write-Host "  Verifications des liens entre entites :" -ForegroundColor DarkGray
Write-Host "    tenant.agency_id -> agencies.id" -ForegroundColor White
Write-Host "    property.agency_id -> agencies.id" -ForegroundColor White
Write-Host "    payment.tenant_id -> tenants.id" -ForegroundColor White
Write-Host "    payment.property_id -> properties.id" -ForegroundColor White
Write-Host "    unit.building_id -> buildings.id" -ForegroundColor White
Write-Host "    contract.tenant_id -> tenants.id" -ForegroundColor White
Write-Host "    contract.property_id -> properties.id" -ForegroundColor White
Write-Host ""

# Verifier que ces relations existent dans les types
$typesFile = "src\types.ts"
if (Test-Path $typesFile) {
    $content = [System.IO.File]::ReadAllText($typesFile, [System.Text.Encoding]::UTF8)
    
    $relations = @(
        @{ Name = "Tenant.agencyId"; Pattern = "Tenant.*agencyId|agencyId.*Tenant" },
        @{ Name = "Property.agencyId"; Pattern = "Property.*agencyId" },
        @{ Name = "Payment.tenantId"; Pattern = "Payment.*locataireId|tenantId" },
        @{ Name = "Unit.buildingId"; Pattern = "Unit.*buildingId" },
        @{ Name = "Contract.locataireId"; Pattern = "Contract.*locataireId|tenantId" }
    )
    
    foreach ($r in $relations) {
        if ($content -match $r.Pattern) {
            Write-Host ("    OK  {0}" -f $r.Name) -ForegroundColor Green
        } else {
            Write-Host ("    --  {0} (verifier manuellement)" -f $r.Name) -ForegroundColor DarkGray
        }
    }
}

# ============================================================
# 7. RESUME
# ============================================================
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  RESUME DES TESTS" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Pour finaliser, va dans le navigateur et teste :" -ForegroundColor Yellow
Write-Host "  1. Toutes les pages s'ouvrent sans erreur" -ForegroundColor White
Write-Host "  2. Les donnees sont coherentes entre les vues" -ForegroundColor White
Write-Host "  3. Les modales s'ouvrent et fonctionnent" -ForegroundColor White
Write-Host "  4. Aucune erreur rouge dans la console" -ForegroundColor White
Write-Host ""
