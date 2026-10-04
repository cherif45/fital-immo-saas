# ============================================================
# PATCH 2 - Route /api/cron/reminders (version corrigee)
# ============================================================

$filePath = "server.ts"

# Backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $filePath "$filePath.before-cron-$timestamp.bak" -Force
Write-Host "Backup cree" -ForegroundColor Green
Write-Host ""

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Verifier si la route existe deja
if ($content -match "api/cron/reminders") {
    Write-Host "Route deja presente" -ForegroundColor Green
    exit
}

# Construire le bloc cron avec des caracteres echappes proprement
# On utilise un tableau de lignes avec des apostrophes normales
$cronBlock = @()
$cronBlock += "// ============================================================"
$cronBlock += "// CRON VERCEL - Relances automatiques quotidiennes"
$cronBlock += "// Appele par vercel.json (crons: 0 9 * * *)"
$cronBlock += "// ============================================================"
$cronBlock += "app.all('/api/cron/reminders', async (req, res) => {"
$cronBlock += "  // SECURITE : Verifier le header Authorization si CRON_SECRET est configure"
$cronBlock += "  const authHeader = req.headers.authorization;"
$cronBlock += "  const cronSecret = process.env.CRON_SECRET;"
$cronBlock += "  "
$cronBlock += "  if (process.env.NODE_ENV === 'production' && cronSecret) {"
$cronBlock += "    if (authHeader !== 'Bearer ' + cronSecret) {"
$cronBlock += "      return res.status(401).json({ error: 'Non autorise' });"
$cronBlock += "    }"
$cronBlock += "  }"
$cronBlock += "  "
$cronBlock += "  console.log('[CRON] Relances automatiques demarrees');"
$cronBlock += "  "
$cronBlock += "  try {"
$cronBlock += "    // NOTE : Logique metier a implementer (envoi WhatsApp/SMS via API tierce)"
$cronBlock += "    const result = {"
$cronBlock += "      success: true,"
$cronBlock += "      timestamp: new Date().toISOString(),"
$cronBlock += "      message: 'Relances automatiques executees',"
$cronBlock += "    };"
$cronBlock += "    "
$cronBlock += "    console.log('[CRON] Termine:', result);"
$cronBlock += "    res.json(result);"
$cronBlock += "  } catch (err) {"
$cronBlock += "    console.error('[CRON] Erreur:', err);"
$cronBlock += "    res.status(500).json({ error: 'Erreur cron' });"
$cronBlock += "  }"
$cronBlock += "});"
$cronBlock += ""
$cronBlock += "// API Health"

$cronText = $cronBlock -join "`r`n"

# Remplacer "// API Health" par le bloc cron + "// API Health"
$content = $content.Replace("// API Health", $cronText)

# Ecrire
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

Write-Host "OK - Route /api/cron/reminders ajoutee" -ForegroundColor Green
Write-Host ""

# Verification
$final = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
$checks = @(
    @{ Name = "Route /api/cron/reminders"; Pattern = "api/cron/reminders" },
    @{ Name = "Authorization check"; Pattern = "authHeader" },
    @{ Name = "CRON_SECRET"; Pattern = "CRON_SECRET" },
    @{ Name = "Toujours export default"; Pattern = "export default app" }
)

foreach ($c in $checks) {
    if ($final -match $c.Pattern) {
        Write-Host ("  OK - {0}" -f $c.Name) -ForegroundColor Green
    } else {
        Write-Host ("  MANQUE - {0}" -f $c.Name) -ForegroundColor Red
    }
}

# Verifier les doubles apostrophes
$doubleCount = ([regex]::Matches($final, "''")).Count
Write-Host ""
Write-Host ("Doubles apostrophes restantes : {0}" -f $doubleCount) -ForegroundColor $(if ($doubleCount -eq 0) { "Green" } else { "Red" })

Write-Host ""
Write-Host "=== Contexte de la route cron ===" -ForegroundColor Yellow
$finalLines = $final -split "`r?`n"
$start = -1
for ($i = 0; $i -lt $finalLines.Count; $i++) {
    if ($finalLines[$i] -match "api/cron/reminders") {
        $start = $i - 4
        break
    }
}
if ($start -ge 0) {
    for ($i = $start; $i -lt [Math]::Min($start + 35, $finalLines.Count); $i++) {
        Write-Host ("  {0,3}: {1}" -f ($i + 1), $finalLines[$i]) -ForegroundColor White
    }
}
