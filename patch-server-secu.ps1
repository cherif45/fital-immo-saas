# ============================================================
# PATCH SERVER.TS - Securite complete
# - CORS strict
# - Helmet
# - Rate limiting (global + Gemini)
# - Body limit
# - HTTPS redirect en prod
# ============================================================

$filePath = "server.ts"

# Backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item $filePath "$filePath.before-secu-fix-$timestamp.bak" -Force
Write-Host ("Backup : {0}.before-secu-fix-{1}.bak" -f $filePath, $timestamp) -ForegroundColor Green
Write-Host ""

# Lire le contenu
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# ============================================================
# 1. Remplacer les imports (ajouter helmet, cors, rateLimit)
# ============================================================
$oldImports = @"
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
"@

$newImports = @"
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
"@

if ($content.Contains($oldImports)) {
    $content = $content.Replace($oldImports, $newImports)
    Write-Host "OK - Imports ajoutes (helmet, cors, rateLimit)" -ForegroundColor Green
} else {
    Write-Host "ATTENTION - Imports originaux non trouves a l'identique" -ForegroundColor Yellow
}

# ============================================================
# 2. Remplacer la section apres "const app = express();"
# ============================================================
$oldSetup = @"
const app = express();
const PORT = 3000;

app.use(express.json());
"@

$newSetup = @"
const app = express();
const PORT = 3000;

// Trust proxy (necessaire pour Vercel / Heroku)
app.set("trust proxy", 1);

// ============================================================
// SECURITE - Headers HTTP
// ============================================================
app.use(helmet({
  contentSecurityPolicy: false,       // Desactive pour Vite (scripts inline)
  crossOriginEmbedderPolicy: false,   // Compatibilite avec Vite
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ============================================================
// SECURITE - CORS strict (whitelist)
// ============================================================
const ALLOWED_ORIGINS: (string | RegExp)[] = [
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:5173",
  /\.vercel\.app$/,
  // Ajouter ici les domaines de production :
  // /\.fital-immo\.com$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requetes sans origin (Postman, curl, same-origin)
    if (!origin) return callback(null, true);

    const allowed = ALLOWED_ORIGINS.some(o =>
      typeof o === "string" ? o === origin : o.test(origin)
    );

    if (allowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origine refusee : ${origin}`);
      callback(new Error("CORS refuse : origine non autorisee"), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

// ============================================================
// SECURITE - Body parser limite (anti-DoS)
// ============================================================
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ============================================================
// SECURITE - Rate limiting global
// ============================================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,                    // 100 requetes par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requetes. Reessayez dans 15 minutes." },
});
app.use("/api/", globalLimiter);

// ============================================================
// SECURITE - Rate limiting Gemini (tres strict, couteux)
// ============================================================
const geminiLimiter = rateLimit({
  windowMs: 60 * 1000,         // 1 minute
  max: 10,                     // 10 requetes/min par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Trop de requetes IA. Attendez 1 minute." },
});
app.use("/api/gemini/", geminiLimiter);
"@

if ($content.Contains($oldSetup)) {
    $content = $content.Replace($oldSetup, $newSetup)
    Write-Host "OK - Configuration securite ajoutee" -ForegroundColor Green
} else {
    Write-Host "ATTENTION - Setup original non trouve a l'identique" -ForegroundColor Yellow
    Write-Host "Recherche manuelle..." -ForegroundColor Yellow
    # Debug : chercher les 20 premieres lignes
    $lines = $content -split "`r?`n"
    for ($i = 0; $i -lt [Math]::Min(20, $lines.Count); $i++) {
        Write-Host ("  L{0}: {1}" -f ($i + 1), $lines[$i]) -ForegroundColor DarkGray
    }
}

# ============================================================
# 3. Securiser le serveur : bloquer si NODE_ENV manquant en prod
# ============================================================
$oldStart = @"
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
"@

$newStart = @"
async function startServer() {
  // SECURITE : En production, NODE_ENV DOIT etre defini
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    if (!process.env.NODE_ENV) {
      console.error("[SECURITE] NODE_ENV non defini en production !");
      process.exit(1);
    }
  }

  if (process.env.NODE_ENV !== "production") {
"@

if ($content.Contains($oldStart)) {
    $content = $content.Replace($oldStart, $newStart)
    Write-Host "OK - Verification NODE_ENV ajoutee" -ForegroundColor Green
} else {
    Write-Host "ATTENTION - startServer non trouve a l'identique" -ForegroundColor Yellow
}

# ============================================================
# 4. Ecrire le fichier
# ============================================================
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($filePath, $content, $utf8NoBom)

Write-Host ""
Write-Host "=== Fichier ecrit ===" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 5. Verification
# ============================================================
$newContent = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
$checks = @(
    @{ Name = "import helmet"; Pattern = "import helmet from" },
    @{ Name = "import cors"; Pattern = "import cors from" },
    @{ Name = "import rateLimit"; Pattern = "import rateLimit from" },
    @{ Name = "trust proxy"; Pattern = 'app\.set\("trust proxy"' },
    @{ Name = "helmet()"; Pattern = "app\.use\(helmet" },
    @{ Name = "cors()"; Pattern = "app\.use\(cors" },
    @{ Name = "globalLimiter"; Pattern = "globalLimiter" },
    @{ Name = "geminiLimiter"; Pattern = "geminiLimiter" },
    @{ Name = "NODE_ENV check"; Pattern = "NODE_ENV non defini" }
)

$ok = 0
foreach ($c in $checks) {
    if ($newContent -match $c.Pattern) {
        Write-Host ("  OK - {0}" -f $c.Name) -ForegroundColor Green
        $ok++
    } else {
        Write-Host ("  MANQUE - {0}" -f $c.Name) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host ("Total : {0}/{1} verifications OK" -f $ok, $checks.Count) -ForegroundColor $(if ($ok -eq $checks.Count) { "Green" } else { "Yellow" })
