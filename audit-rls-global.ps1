# ============================================================
# AUDIT RLS - Verification que TOUTES les tables ont des RLS
# Via l'API Supabase (appel direct)
# ============================================================

# Charger les cles depuis .env
$envContent = Get-Content ".env" -Raw
$supabaseUrl = ""
$anonKey = ""

foreach ($line in ($envContent -split "`r?`n")) {
    if ($line -match "VITE_SUPABASE_URL\s*=\s*(.+)") { $supabaseUrl = $matches[1].Trim().Trim('"').Trim("'") }
    if ($line -match "VITE_SUPABASE_ANON_KEY\s*=\s*(.+)") { $anonKey = $matches[1].Trim().Trim('"').Trim("'") }
}

Write-Host ""
Write-Host "=== AUDIT RLS - Toutes les tables ===" -ForegroundColor Cyan
Write-Host ""

# Liste des tables a verifier
$tables = @(
    "tenants", "properties", "owners", "payments", "contracts",
    "buildings", "units", "cash_movements", "cash_closings",
    "maintenance_tickets", "property_inspections", "disbursements",
    "invoices", "tenant_reminders", "audit_logs", "notifications",
    "payment_methods_config", "profiles", "agencies", "agency_settings",
    "owner_charges", "owner_deductions", "bulletin_versements",
    "archives", "activity_logs", "penalties",
    # Tables backup suspectes
    "tenants_83_backup", "tenants_a_fusionner_27",
    "tenants_doublons_83", "tenants_doublons_identifies"
)

$headers = @{
    "apikey" = $anonKey
    "Authorization" = "Bearer $anonKey"
}

$results = @()

foreach ($table in $tables) {
    try {
        $uri = "$supabaseUrl/rest/v1/$table?select=id&limit=1"
        $response = Invoke-WebRequest -Uri $uri -Headers $headers -Method GET -TimeoutSec 5 -ErrorAction Stop
        
        # Si on arrive ici, l'API a renvoye 200 = RLS DESACTIVE ou policy trop permissive
        $results += [PSCustomObject]@{
            Table = $table
            Status = "EXPOSE"
            Detail = "L'API renvoie des donnees (RLS desactive ou policy trop ouverte)"
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401 -or $statusCode -eq 403) {
            $results += [PSCustomObject]@{
                Table = $table
                Status = "PROTEGE"
                Detail = "RLS active (401/403)"
            }
        } elseif ($statusCode -eq 404) {
            $results += [PSCustomObject]@{
                Table = $table
                Status = "ABSENTE"
                Detail = "Table inexistante (404)"
            }
        } else {
            $results += [PSCustomObject]@{
                Table = $table
                Status = "?"
                Detail = "Status $statusCode"
            }
        }
    }
}

# Rapport
Write-Host "=== RESULTAT ===" -ForegroundColor Cyan
Write-Host ""

$exposed = $results | Where-Object { $_.Status -eq "EXPOSE" }
$protected = $results | Where-Object { $_.Status -eq "PROTEGE" }
$absent = $results | Where-Object { $_.Status -eq "ABSENTE" }
$other = $results | Where-Object { $_.Status -eq "?" }

Write-Host ("PROTEGEES : {0}" -f $protected.Count) -ForegroundColor Green
Write-Host ("EXPOSEES  : {0}" -f $exposed.Count) -ForegroundColor $(if ($exposed.Count -gt 0) { "Red" } else { "Green" })
Write-Host ("ABSENTES  : {0}" -f $absent.Count) -ForegroundColor DarkGray
Write-Host ("AUTRES    : {0}" -f $other.Count) -ForegroundColor Yellow
Write-Host ""

if ($exposed.Count -gt 0) {
    Write-Host "=== TABLES EXPOSEES (CRITIQUE) ===" -ForegroundColor Red
    Write-Host ""
    $exposed | Format-Table -AutoSize
}

if ($other.Count -gt 0) {
    Write-Host "=== TABLES EN ERREUR ===" -ForegroundColor Yellow
    Write-Host ""
    $other | Format-Table -AutoSize
}

Write-Host ""
Write-Host "=== DETAIL COMPLET ===" -ForegroundColor Cyan
$results | Sort-Object Status, Table | Format-Table -AutoSize
