# ============================================================
# FIX - Ajouter boutons pagination dans ArchiveView
# ============================================================

$filePath = "src\components\ArchiveView.tsx"

# Lire
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$lines = $content -split "`r?`n"

# Trouver la ligne "</tbody>" dans le fichier
$tbodyEndLine = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^\s*</tbody>\s*$") {
        $tbodyEndLine = $i
        break
    }
}

if ($tbodyEndLine -lt 0) {
    Write-Host "Impossible de trouver </tbody>" -ForegroundColor Red
    exit
}

Write-Host ("</tbody> trouve ligne {0}" -f ($tbodyEndLine + 1)) -ForegroundColor Green
Write-Host ""

# Trouver la ligne "</table>" apres </tbody>
$tableEndLine = -1
for ($i = $tbodyEndLine; $i -lt [Math]::Min($tbodyEndLine + 20, $lines.Count); $i++) {
    if ($lines[$i] -match "^\s*</table>\s*$") {
        $tableEndLine = $i
        break
    }
}

# Trouver la ligne "</div>" qui ferme le container du tableau apres </table>
# On va chercher 5-15 lignes apres </table>
$containerEndLine = -1
for ($i = $tableEndLine; $i -lt [Math]::Min($tableEndLine + 15, $lines.Count); $i++) {
    # Trouver une fermeture div qui n'est pas un attribut
    if ($lines[$i] -match "^\s*</div>\s*$") {
        $containerEndLine = $i
        # On prend la 2eme </div> (la 1ere est le wrapper du tableau overflow)
        # Chercher la suivante
        for ($j = $i + 1; $j -lt [Math]::Min($i + 10, $lines.Count); $j++) {
            if ($lines[$j] -match "^\s*</div>\s*$") {
                $containerEndLine = $j
                break
            }
        }
        break
    }
}

if ($containerEndLine -lt 0) {
    Write-Host "Impossible de trouver la fermeture du container" -ForegroundColor Red
    Write-Host "Fallback : insertion apres </table>" -ForegroundColor Yellow
    $containerEndLine = $tableEndLine
}

Write-Host ("</table> trouve ligne {0}" -f ($tableEndLine + 1)) -ForegroundColor Green
Write-Host ("Fermeture container ligne {0}" -f ($containerEndLine + 1)) -ForegroundColor Green
Write-Host ""

# Afficher le contexte
Write-Host "=== AVANT (lignes 355-380) ===" -ForegroundColor Yellow
for ($i = 354; $i -lt [Math]::Min(380, $lines.Count); $i++) {
    Write-Host ("  {0,4}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor White
}
Write-Host ""

# Construire le bloc de pagination
$paginationBlock = @(
    "",
    "        {/* Pagination */}",
    "        {totalPages > 1 && (",
    "          <div className=`"flex items-center justify-between gap-3 mt-4 px-4 py-3 rounded-2xl bg-[#162133] border border-[#2A3447]`">",
    "            <div className=`"text-xs text-[#A8B4C4]`">",
    "              Page <span className=`"text-[#C9A96E] font-bold`">{currentPage}</span> sur <span className=`"text-white font-bold`">{totalPages}</span>",
    "              <span className=`"ml-2 text-[#6B7C94]`">({filtered.length} elements)</span>",
    "            </div>",
    "            <div className=`"flex items-center gap-2`">",
    "              <button",
    "                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}",
    "                disabled={currentPage === 1}",
    "                className=`"px-3 py-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-white text-xs font-semibold border border-[#C9A96E]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer`"",
    "              >",
    "                Precedent",
    "              </button>",
    "              <button",
    "                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}",
    "                disabled={currentPage === totalPages}",
    "                className=`"px-3 py-1.5 rounded-lg bg-[#1E2E45] hover:bg-[#2A3F5C] text-white text-xs font-semibold border border-[#C9A96E]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer`"",
    "              >",
    "                Suivant",
    "              </button>",
    "            </div>",
    "          </div>",
    "        )}"
)

# Inserer apres $containerEndLine
$newLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    $newLines += $lines[$i]
    if ($i -eq $containerEndLine) {
        $newLines += $paginationBlock
    }
}

# Ecrire
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, ($newLines -join "`r`n"), $utf8NoBom)

Write-Host "OK - Bloc pagination insere" -ForegroundColor Green
Write-Host ""

# Verification
Write-Host "=== APRES (lignes 360-400) ===" -ForegroundColor Yellow
$final = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$finalLines = $final -split "`r?`n"
for ($i = 359; $i -lt [Math]::Min(400, $finalLines.Count); $i++) {
    Write-Host ("  {0,4}: {1}" -f ($i + 1), $finalLines[$i]) -ForegroundColor White
}

Write-Host ""
Write-Host "=== VERIFICATION FINALE ===" -ForegroundColor Cyan
$checks = @(
    @{ Name = "Boutons Precedent/Suivant"; Pattern = "Precedent" },
    @{ Name = "totalPages"; Pattern = "totalPages" },
    @{ Name = "page count"; Pattern = "filtered\.length" }
)

foreach ($c in $checks) {
    if ($final -match $c.Pattern) {
        Write-Host ("  OK - {0}" -f $c.Name) -ForegroundColor Green
    } else {
        Write-Host ("  MANQUE - {0}" -f $c.Name) -ForegroundColor Red
    }
}
