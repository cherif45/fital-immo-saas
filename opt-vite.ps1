# ============================================================
# VITE CONFIG - Optimisations bundle splitting
# ============================================================

$filePath = "vite.config.ts"

# Backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $filePath "$filePath.before-splitting-$timestamp.bak" -Force
Write-Host "Backup : $filePath.before-splitting-$timestamp.bak" -ForegroundColor Green
Write-Host ""

# Lire le contenu
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Verifier si on a deja un bloc build
$hasBuild = $content -match "build:\s*\{"

if ($hasBuild) {
    Write-Host "Un bloc 'build' existe deja. Verification..." -ForegroundColor Yellow
    # Afficher la section build actuelle
    $lines = $content -split "`r?`n"
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match "^\s*build:\s*\{") {
            $start = $i
            $depth = 0
            for ($j = $i; $j -lt $lines.Count; $j++) {
                $depth += ([regex]::Matches($lines[$j], '\{')).Count
                $depth -= ([regex]::Matches($lines[$j], '\}')).Count
                if ($depth -eq 0 -and $j -gt $i) {
                    for ($k = $start; $k -le $j; $k++) {
                        Write-Host ("  {0}: {1}" -f ($k + 1), $lines[$k]) -ForegroundColor White
                    }
                    break
                }
            }
            break
        }
    }
    Write-Host ""
    Write-Host "ATTENTION : ajouter manuellement les options de splitting" -ForegroundColor Yellow
} else {
    Write-Host "Ajout du bloc 'build' avec splitting..." -ForegroundColor Cyan
    
    # Trouver le point d'insertion (apres plugins)
    $insertAfter = "    ],"
    
    # Chercher la ligne "plugins: [...]," et l'insertion apres sa fermeture
    $lines = $content -split "`r?`n"
    $newLines = @()
    $inserted = $false
    $inPlugins = $false
    $depth = 0
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $newLines += $lines[$i]
        
        if (-not $inserted) {
            if ($lines[$i] -match "^\s*plugins:\s*\[") {
                $inPlugins = $true
                $depth = ([regex]::Matches($lines[$i], '\[')).Count - ([regex]::Matches($lines[$i], '\]')).Count
                continue
            }
            
            if ($inPlugins) {
                $depth += ([regex]::Matches($lines[$i], '\[')).Count
                $depth -= ([regex]::Matches($lines[$i], '\]')).Count
                
                if ($depth -eq 0) {
                    # On vient de fermer le tableau plugins, ins?rer le bloc build APRES
                    # Mais il faut v?rifier que la ligne suivante n'est pas d?j? un build
                    $newLines += ""
                    $newLines += "    // ============================================================"
                    $newLines += "    // OPTIMISATION BUNDLE SPLITTING"
                    $newLines += "    // Separe les librairies communes en chunks caches par le navigateur"
                    $newLines += "    // ============================================================"
                    $newLines += "    build: {"
                    $newLines += "      rollupOptions: {"
                    $newLines += "        output: {"
                    $newLines += "          manualChunks: {"
                    $newLines += "            // Librairies principales (cache long terme)"
                    $newLines += "            'vendor-react': ['react', 'react-dom'],"
                    $newLines += "            'vendor-supabase': ['@supabase/supabase-js'],"
                    $newLines += "            'vendor-icons': ['lucide-react'],"
                    $newLines += "          },"
                    $newLines += "        },"
                    $newLines += "      },"
                    $newLines += "      // Alerte a 600 KB au lieu de 500 KB"
                    $newLines += "      chunkSizeWarningLimit: 600,"
                    $newLines += "    },"
                    
                    $inserted = $true
                    $inPlugins = $false
                }
            }
        }
    }
    
    $content = $newLines -join "`r`n"
    
    # Ecrire en UTF-8 sans BOM
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)
    
    Write-Host "OK - Options de splitting ajoutees" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== VERIFICATION vite.config.ts ===" -ForegroundColor Cyan
Write-Host ""
$finalContent = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$finalLines = $finalContent -split "`r?`n"
$count = 0
for ($i = 0; $i -lt $finalLines.Count; $i++) {
    $line = $finalLines[$i]
    if ($line -match "manualChunks|vendor-react|vendor-supabase|vendor-icons|chunkSizeWarningLimit|build:") {
        Write-Host ("  {0,3}: {1}" -f ($i + 1), $line) -ForegroundColor Green
        $count++
    }
}
if ($count -eq 0) {
    Write-Host "  AUCUNE modification visible" -ForegroundColor Red
} else {
    Write-Host ""
    Write-Host ("{0} lignes de config ajoutees" -f $count) -ForegroundColor Cyan
}
