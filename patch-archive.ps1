# ============================================================
# PATCH ArchiveView - Pagination
# ============================================================

$filePath = "src\components\ArchiveView.tsx"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $filePath "$filePath.before-pagination-$timestamp.bak" -Force

$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# 1. Ajouter le state de pagination apres "const [search, setSearch] = useState('')" ou similaire
# Chercher la ligne de state existante
if ($content -match "(const \[search, setSearch\] = useState[^;]+;)") {
    $stateBlock = $matches[1]
    $newStateBlock = @"
$stateBlock
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
"@
    $content = $content.Replace($stateBlock, $newStateBlock)
    Write-Host "OK - State pagination ajoute" -ForegroundColor Green
} else {
    Write-Host "Recherche alternative du state..." -ForegroundColor Yellow
    # Chercher n'importe quel useState
    if ($content -match "(const \[[a-zA-Z]+, set[a-zA-Z]+\] = useState[^;]+;)") {
        $stateBlock = $matches[1]
        $newStateBlock = @"
$stateBlock
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
"@
        $content = $content.Replace($stateBlock, $newStateBlock)
        Write-Host "OK - State pagination ajoute (methode alternative)" -ForegroundColor Green
    }
}

# 2. Ajouter le calcul paginatedFiltered APRES le useMemo filtered (ligne 190-202)
# Chercher la fermeture du filtered useMemo
$oldFilteredEnd = "  }, [allRecords, activeTab, search]);"
$newFilteredEnd = @"
  }, [allRecords, activeTab, search]);

  // ============================================================
  // PAGINATION
  // ============================================================
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedFiltered = React.useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  // Reset page si filtre change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search]);
"@

if ($content.Contains($oldFilteredEnd)) {
    $content = $content.Replace($oldFilteredEnd, $newFilteredEnd)
    Write-Host "OK - Pagination calculee ajoutee" -ForegroundColor Green
} else {
    Write-Host "ATTENTION - Fin du useMemo filtered non trouvee" -ForegroundColor Yellow
}

# 3. Remplacer "filtered.map(" par "paginatedFiltered.map("
$content = $content.Replace("filtered.map((r) => {", "paginatedFiltered.map((r) => {")
Write-Host "OK - Rendu pagine" -ForegroundColor Green

# 4. Ajouter les boutons de pagination AVANT </tbody>
$oldTbodyClose = @"
            </tbody>
          </table>
        </div>
      </div>
"@

$newTbodyClose = @"
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 mt-4 px-4 py-3 rounded-2xl bg-[#162133] border border-[#2A3447]">
            <div className="text-xs text-[#A8B4C4]">
              Page <span className="text-[#C9A96E] font-bold">{currentPage}</span> sur <span className="text-white font-bold">{totalPages}</span>
              <span className="ml-2 text-[#6B7C94]">({filtered.length} elements)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-white text-xs font-semibold border border-[#C9A96E]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Precedent
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-white text-xs font-semibold border border-[#C9A96E]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
"@

if ($content.Contains($oldTbodyClose)) {
    $content = $content.Replace($oldTbodyClose, $newTbodyClose)
    Write-Host "OK - Boutons pagination ajoutes" -ForegroundColor Green
} else {
    Write-Host "ATTENTION - Bloc tbody/table non trouve exactement" -ForegroundColor Yellow
}

# Sauvegarder
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
$final = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$checks = @(
    @{ Name = "currentPage state"; Pattern = "const \[currentPage, setCurrentPage\]" },
    @{ Name = "ITEMS_PER_PAGE"; Pattern = "ITEMS_PER_PAGE = 50" },
    @{ Name = "paginatedFiltered"; Pattern = "paginatedFiltered" },
    @{ Name = "Reset page"; Pattern = "setCurrentPage\(1\)" },
    @{ Name = "Boutons pagination"; Pattern = "Precedent" }
)

foreach ($c in $checks) {
    if ($final -match $c.Pattern) {
        Write-Host ("  OK - {0}" -f $c.Name) -ForegroundColor Green
    } else {
        Write-Host ("  MANQUE - {0}" -f $c.Name) -ForegroundColor Red
    }
}
