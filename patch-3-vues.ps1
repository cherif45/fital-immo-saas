# ============================================================
# PATCH UNIFIE - useMemo sur 3 vues
# ============================================================

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# ============================================================
# PATCH 1 - PaymentsView
# ============================================================
Write-Host ""
Write-Host "=== PATCH 1 : PaymentsView ===" -ForegroundColor Cyan

$filePath = "src\components\PaymentsView.tsx"
Copy-Item $filePath "$filePath.before-usememo-$timestamp.bak" -Force
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# 1. Ajouter useMemo a l'import
$content = $content.Replace(
    "import React, { useState } from 'react';",
    "import React, { useState, useMemo } from 'react';"
)

# 2. Wrapper le filtre
$oldBlock = @"
  const filteredPayments = displayPayments.filter((p) => {
    if (statusFilter !== 'all' && p.statut !== statusFilter) return false;
    if (methodFilter !== 'all' && p.modePaiement !== methodFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.locataireNom.toLowerCase().includes(q) ||
        p.bienNom.toLowerCase().includes(q) ||
        p.quittanceNumero.toLowerCase().includes(q) ||
        p.ref.toLowerCase().includes(q)
      );
    }
    return true;
  });
"@

$newBlock = @"
  const filteredPayments = React.useMemo(() => {
    return displayPayments.filter((p) => {
      if (statusFilter !== 'all' && p.statut !== statusFilter) return false;
      if (methodFilter !== 'all' && p.modePaiement !== methodFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.locataireNom.toLowerCase().includes(q) ||
          p.bienNom.toLowerCase().includes(q) ||
          p.quittanceNumero.toLowerCase().includes(q) ||
          p.ref.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [displayPayments, statusFilter, methodFilter, search]);
"@

if ($content.Contains($oldBlock)) {
    $content = $content.Replace($oldBlock, $newBlock)
    Write-Host "  OK - filteredPayments wrappe dans useMemo" -ForegroundColor Green
} else {
    Write-Host "  ATTENTION - Pattern non trouve exactement" -ForegroundColor Yellow
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

# ============================================================
# PATCH 2 - PenaltiesView
# ============================================================
Write-Host ""
Write-Host "=== PATCH 2 : PenaltiesView ===" -ForegroundColor Cyan

$filePath = "src\components\PenaltiesView.tsx"
Copy-Item $filePath "$filePath.before-usememo-$timestamp.bak" -Force
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

$content = $content.Replace(
    "import React, { useState } from 'react';",
    "import React, { useState, useMemo } from 'react';"
)

$oldBlock = @"
  const filteredPenalties = displayPenalties.filter((p) => {
    if (statusFilter !== 'all' && p.statut !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (p.locataireNom || '').toLowerCase().includes(q) ||
        (p.bienNom || '').toLowerCase().includes(q) ||
        (p.periode || '').toLowerCase().includes(q)
      );
    }
    return true;
  });
"@

$newBlock = @"
  const filteredPenalties = React.useMemo(() => {
    return displayPenalties.filter((p) => {
      if (statusFilter !== 'all' && p.statut !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (p.locataireNom || '').toLowerCase().includes(q) ||
          (p.bienNom || '').toLowerCase().includes(q) ||
          (p.periode || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [displayPenalties, statusFilter, search]);
"@

if ($content.Contains($oldBlock)) {
    $content = $content.Replace($oldBlock, $newBlock)
    Write-Host "  OK - filteredPenalties wrappe dans useMemo" -ForegroundColor Green
} else {
    Write-Host "  ATTENTION - Pattern non trouve exactement" -ForegroundColor Yellow
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

# ============================================================
# PATCH 3 - ActivityLogView
# ============================================================
Write-Host ""
Write-Host "=== PATCH 3 : ActivityLogView ===" -ForegroundColor Cyan

$filePath = "src\components\ActivityLogView.tsx"
Copy-Item $filePath "$filePath.before-usememo-$timestamp.bak" -Force
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

$content = $content.Replace(
    "import React, { useState } from 'react';",
    "import React, { useState, useMemo } from 'react';"
)

$oldBlock = @"
  // Tri par date d??croissante + heure
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    if (a.activityDate !== b.activityDate) return b.activityDate.localeCompare(a.activityDate);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
"@

$newBlock = @"
  // Tri par date decroissante + heure (memoise)
  const sortedActivities = React.useMemo(() => {
    return [...filteredActivities].sort((a, b) => {
      if (a.activityDate !== b.activityDate) return b.activityDate.localeCompare(a.activityDate);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [filteredActivities]);
"@

if ($content.Contains($oldBlock)) {
    $content = $content.Replace($oldBlock, $newBlock)
    Write-Host "  OK - sortedActivities wrappe dans useMemo" -ForegroundColor Green
} else {
    Write-Host "  ATTENTION - Pattern non trouve exactement" -ForegroundColor Yellow
    Write-Host "    (encodage du commentaire peut differer)" -ForegroundColor DarkGray
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

# ============================================================
# VERIFICATION
# ============================================================
Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
Write-Host ""

$files = @(
    "src\components\PaymentsView.tsx",
    "src\components\PenaltiesView.tsx",
    "src\components\ActivityLogView.tsx"
)

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
    $hasImport = $content -match "useState, useMemo"
    $hasUseMemo = ([regex]::Matches($content, "React\.useMemo\(")).Count
    
    Write-Host ("{0}" -f $f) -ForegroundColor White
    Write-Host ("  Import useMemo : {0}" -f $(if ($hasImport) { "OUI" } else { "NON" })) -ForegroundColor $(if ($hasImport) { "Green" } else { "Red" })
    Write-Host ("  React.useMemo() : {0} usages" -f $hasUseMemo) -ForegroundColor $(if ($hasUseMemo -gt 0) { "Green" } else { "Red" })
}
