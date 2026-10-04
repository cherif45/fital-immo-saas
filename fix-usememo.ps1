# ============================================================
# FIX 1 - useMemo sur filteredTenants + activeTenants
# ============================================================

$filePath = "src\components\TenantsView.tsx"

# Backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $filePath "$filePath.before-useMemo-$timestamp.bak" -Force
Write-Host "Backup cree" -ForegroundColor Green
Write-Host ""

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# 1. Ajouter useMemo a l'import
$content = $content.Replace(
    "import React, { useState } from 'react';",
    "import React, { useState, useMemo } from 'react';"
)
Write-Host "OK - useMemo ajoute a l'import" -ForegroundColor Green

# 2. Wrapper activeTenants, sortedTenants, filteredTenants dans useMemo
# Trouver le bloc "// Filtres" et la ligne filteredTenants
$oldBlock = @"
  // Filtres
  const activeTenants = tenants.filter((t) => !isTenantSorted(t));
  const sortedTenants = tenants.filter((t) => isTenantSorted(t));

  const filteredTenants = tenants.filter((t) => {
"@

$newBlock = @"
  // Filtres (memoises pour eviter les recalculs a chaque frappe)
  const { activeTenants, sortedTenants, filteredTenants } = React.useMemo(() => {
    const actives = tenants.filter((t) => !isTenantSorted(t));
    const sortis = tenants.filter((t) => isTenantSorted(t));
    
    const filtered = tenants.filter((t) => {
"@

if ($content.Contains($oldBlock)) {
    $content = $content.Replace($oldBlock, $newBlock)
    Write-Host "OK - Bloc useMemo debut insere" -ForegroundColor Green
} else {
    Write-Host "ATTENTION - Bloc initial non trouve" -ForegroundColor Yellow
}

# Trouver la fermeture du filteredTenants (le "});" final)
# Il faut le remplacer par la fermeture useMemo
$oldClose = @"
  });

  const uniqueStatuses"
"@

$newClose = @"
    });
    
    return { activeTenants: actives, sortedTenants: sortis, filteredTenants: filtered };
  }, [tenants, statusFilter, search]);

  const uniqueStatuses"
"@

if ($content.Contains($oldClose)) {
    $content = $content.Replace($oldClose, $newClose)
    Write-Host "OK - Bloc useMemo fermeture inseree" -ForegroundColor Green
} else {
    Write-Host "ATTENTION - Bloc de fermeture non trouve" -ForegroundColor Yellow
    Write-Host "Recherche de la fermeture reelle..." -ForegroundColor Yellow
}

# Ecrire
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
$final = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $final -split "`r?`n"

Write-Host ""
Write-Host "Ligne 1 (import) :" -ForegroundColor Yellow
Write-Host ("  {0}" -f $lines[0]) -ForegroundColor White

Write-Host ""
Write-Host "Lignes 184-215 (nouveau bloc) :" -ForegroundColor Yellow
for ($i = 183; $i -lt [Math]::Min(215, $lines.Count); $i++) {
    Write-Host ("  {0,4}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
}
