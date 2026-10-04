# ============================================================
# FIX 1 - Fermer le useMemo correctement
# ============================================================

$filePath = "src\components\TenantsView.tsx"
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Remplacer la fermeture actuelle "});" + commentaire par la version complete
$oldClose = @"
    return true;
  });

  // ============================================================
  // BIENS VACANTS
  // ============================================================
"@

$newClose = @"
    return true;
  });
    
    return { activeTenants: actives, sortedTenants: sortis, filteredTenants: filtered };
  }, [tenants, statusFilter, search]);

  // ============================================================
  // BIENS VACANTS
  // ============================================================
"@

if ($content.Contains($oldClose)) {
    $content = $content.Replace($oldClose, $newClose)
    Write-Host "OK - Fermeture useMemo inseree" -ForegroundColor Green
} else {
    Write-Host "ATTENTION - Bloc non trouve exactement" -ForegroundColor Yellow
    Write-Host "Recherche alternative..." -ForegroundColor Yellow
    
    # Alternative : chercher juste "return true;\n  });"
    $oldClose2 = "    return true;`r`n  });"
    if ($content.Contains($oldClose2)) {
        $newClose2 = "    return true;`r`n  });`r`n    `r`n    return { activeTenants: actives, sortedTenants: sortis, filteredTenants: filtered };`r`n  }, [tenants, statusFilter, search]);"
        $content = $content.Replace($oldClose2, $newClose2)
        Write-Host "OK - Fermeture inseree (methode alternative)" -ForegroundColor Green
    }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

Write-Host ""
Write-Host "=== VERIFICATION lignes 184-220 ===" -ForegroundColor Cyan
$final = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $final -split "`r?`n"
for ($i = 183; $i -lt [Math]::Min(220, $lines.Count); $i++) {
    Write-Host ("  {0,4}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
}
