# ============================================================
# PATCH server.ts - Compatible Vercel
# ============================================================

$filePath = "server.ts"

# Backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $filePath "$filePath.before-vercel-$timestamp.bak" -Force
Write-Host "Backup cree" -ForegroundColor Green
Write-Host ""

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $content -split "`r?`n"

# Trouver la ligne "async function startServer()"
$startServerLine = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^async function startServer\(\)") {
        $startServerLine = $i
        break
    }
}

if ($startServerLine -lt 0) {
    Write-Host "startServer non trouve" -ForegroundColor Red
    exit
}

Write-Host ("startServer trouve ligne {0}" -f ($startServerLine + 1)) -ForegroundColor Green
Write-Host ""

# Remplacer TOUT ? partir de startServer jusqu'? la fin
$newTail = @(
    "",
    "// ============================================================",
    "// ADAPTATION VERCEL - On garde app.listen UNIQUEMENT en dev local",
    "// En production Vercel, on exporte app (Vercel gere l'ecoute)",
    "// ============================================================",
    "",
    "async function startServer() {",
    "  // SECURITE : En production, NODE_ENV DOIT etre defini",
    "  if (process.env.NODE_ENV === ''production'' || process.env.VERCEL) {",
    "    if (!process.env.NODE_ENV) {",
    "      console.error(''[SECURITE] NODE_ENV non defini en production !'');",
    "      process.exit(1);",
    "    }",
    "  }",
    "",
    "  // En dev local UNIQUEMENT : Vite middleware + listen",
    "  if (process.env.NODE_ENV !== ''production'' && !process.env.VERCEL) {",
    "    const vite = await createViteServer({",
    "      server: { middlewareMode: true },",
    "      appType: ''spa'',",
    "    });",
    "    app.use(vite.middlewares);",
    "",
    "    app.listen(PORT, ''0.0.0.0'', () => {",
    "      console.log(''Server running on http://localhost:'' + PORT);",
    "    });",
    "  }",
    "  // En production Vercel : on n'ecoute PAS, on exporte app",
    "}",
    "",
    "// En dev local : on demarre le serveur",
    "// En production Vercel : on exporte app pour que Vercel l''utilise",
    "if (process.env.NODE_ENV !== ''production'' && !process.env.VERCEL) {",
    "  startServer();",
    "}",
    "",
    "// Export par defaut pour Vercel (serverless function)",
    "export default app;",
    ""
)

# Construire le nouveau fichier
$newLines = @()
for ($i = 0; $i -lt $startServerLine; $i++) {
    $newLines += $lines[$i]
}
$newLines += $newTail

# Ecrire
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, ($newLines -join "`r`n"), $utf8NoBom)

Write-Host "OK - server.ts adapte pour Vercel" -ForegroundColor Green
Write-Host ""

# Verification
$final = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$finalLines = $final -split "`r?`n"

Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
$checks = @(
    @{ Name = "export default app"; Pattern = "export default app" },
    @{ Name = "Condition VERCEL"; Pattern = "process\.env\.VERCEL" },
    @{ Name = "app.listen dans un if"; Pattern = "if.*NODE_ENV.*production.*VERCEL" }
)

foreach ($c in $checks) {
    if ($final -match $c.Pattern) {
        Write-Host ("  OK - {0}" -f $c.Name) -ForegroundColor Green
    } else {
        Write-Host ("  MANQUE - {0}" -f $c.Name) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== 40 dernieres lignes ===" -ForegroundColor Yellow
$start = [Math]::Max(0, $finalLines.Count - 40)
for ($i = $start; $i -lt $finalLines.Count; $i++) {
    Write-Host ("  {0,3}: {1}" -f ($i + 1), $finalLines[$i]) -ForegroundColor White
}
