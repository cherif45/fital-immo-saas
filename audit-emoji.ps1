# ============================================================
# AUDIT GLOBAL DES EMOJIS - Version corrigee
# ============================================================

Write-Host ""
Write-Host "=== RECHERCHE DES EMOJIS DANS src/ ===" -ForegroundColor Cyan
Write-Host ""

$emojiCodes = @{
    0x2728  = "Sparkles"
    0x1F3AF = "Target"
    0x2705  = "CheckCircle2"
    0x274C  = "XCircle"
    0x26A0  = "AlertTriangle"
    0x1F512 = "Lock"
    0x1F513 = "Unlock"
    0x1F4CA = "BarChart3"
    0x1F4B0 = "Coins"
    0x1F4B8 = "Banknote"
    0x1F3E0 = "Home"
    0x1F3E2 = "Building2"
    0x1F464 = "User"
    0x1F465 = "Users"
    0x23F0  = "Clock"
    0x1F680 = "Rocket"
    0x1F4DD = "FileText"
    0x1F4C4 = "FileText"
    0x1F4C5 = "Calendar"
    0x1F4C6 = "Calendar"
    0x1F4C8 = "TrendingUp"
    0x1F4C9 = "TrendingDown"
    0x1F4E7 = "Mail"
    0x1F4DE = "Phone"
    0x1F4F1 = "Smartphone"
    0x1F4BB = "Laptop"
    0x1F50D = "Search"
    0x1F4A1 = "Lightbulb"
    0x2699  = "Settings"
    0x1F527 = "Wrench"
    0x1F528 = "Hammer"
    0x1F4E6 = "Package"
    0x1F4E4 = "Upload"
    0x1F4E5 = "Download"
    0x1F4C1 = "Folder"
    0x1F4C2 = "FolderOpen"
    0x1F517 = "Link"
    0x1F58B = "Pen"
    0x270F  = "Pencil"
    0x1F4CB = "ClipboardList"
    0x2757  = "AlertCircle"
    0x2753  = "HelpCircle"
    0x2139  = "Info"
    0x2714  = "Check"
    0x2716  = "X"
    0x2795  = "Plus"
    0x2796  = "Minus"
    0x2B50  = "Star"
    0x1F31F = "Star"
    0x1F44D = "ThumbsUp"
    0x1F44E = "ThumbsDown"
}

$files = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "node_modules|dist|\.git|\._backups" }

$found = @()

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $lines = $content -split "`r?`n"
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        $lineEmojis = @()
        
        foreach ($code in $emojiCodes.Keys) {
            $char = [char]$code
            if ($line.Contains($char)) {
                $lineEmojis += ("U+{0:X4}" -f $code)
            }
        }
        
        for ($j = 0; $j -lt $line.Length - 1; $j++) {
            $c1 = [int][char]$line[$j]
            if ($c1 -ge 0xD800 -and $c1 -le 0xDBFF) {
                $c2 = [int][char]$line[$j + 1]
                $codePoint = 0x10000 + (($c1 - 0xD800) * 0x400) + ($c2 - 0xDC00)
                $lineEmojis += ("U+{0:X4}" -f $codePoint)
            }
        }
        
        if ($lineEmojis.Count -gt 0) {
            $extract = $line.Trim()
            if ($extract.Length -gt 80) { $extract = $extract.Substring(0, 80) + "..." }
            
            $found += [PSCustomObject]@{
                Fichier = $file.FullName.Replace($PWD.Path + '\', '')
                Ligne = $i + 1
                Emojis = (($lineEmojis | Select-Object -Unique) -join ", ")
                Extrait = $extract
            }
        }
    }
}

Write-Host ("Total : {0} lignes avec emojis" -f $found.Count) -ForegroundColor Yellow
Write-Host ""

if ($found.Count -gt 0) {
    Write-Host "=== RESUME PAR FICHIER ===" -ForegroundColor Cyan
    $byFile = $found | Group-Object Fichier | Sort-Object Count -Descending
    foreach ($group in $byFile) {
        Write-Host ("  {0,3} lignes  ->  {1}" -f $group.Count, $group.Name) -ForegroundColor White
    }
    Write-Host ""
    
    Write-Host "=== DETAIL (30 premieres) ===" -ForegroundColor Cyan
    $found | Select-Object -First 30 | ForEach-Object {
        Write-Host ("{0}:{1}" -f $_.Fichier, $_.Ligne) -ForegroundColor Yellow
        Write-Host ("  Emojis : {0}" -f $_.Emojis) -ForegroundColor DarkGray
        Write-Host ("  Texte  : {0}" -f $_.Extrait) -ForegroundColor White
        Write-Host ""
    }
}
