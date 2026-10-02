param(
  [string]$ProjectRoot = "D:\Backyard Havock",
  [string]$ToolsRoot = "D:\BionicWorkspace\tools",
  [switch]$SkipDesktopApps,
  [switch]$SkipProjectPackages,
  [switch]$SkipAgentSkills,
  [switch]$InstallSpectorMcp
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found."
  }
}

Require-Command git
Require-Command node
Require-Command npm
Require-Command npx

if (-not $SkipDesktopApps) {
  Require-Command winget
  $common = @("--exact", "--accept-package-agreements", "--accept-source-agreements", "--disable-interactivity")

  # LTS is preferred for scripted animation/export stability.
  winget install --id BlenderFoundation.Blender.LTS.4.5 @common
  winget install --id Inkscape.Inkscape @common
  winget install --id KDE.Krita @common
}

if (-not (Test-Path $ProjectRoot)) {
  throw "ProjectRoot does not exist: $ProjectRoot"
}

Push-Location $ProjectRoot
try {
  $head = (git rev-parse HEAD).Trim()
  $branch = (git branch --show-current).Trim()

  Write-Host "Repository branch: $branch"
  Write-Host "Repository HEAD:   $head"

  if ($branch -eq "main") {
    throw "Refusing to install remaster dependencies on main. Use codex/phase-13-visual-remaster-toolchain or a child branch."
  }

  if (-not $SkipAgentSkills) {
    # Official MIT PixiJS v8 skills for Codex/Cursor/Claude/Windsurf/Copilot and other Agent Skills clients.
    npx --yes skills add https://github.com/pixijs/pixijs-skills
  }

  if (-not $SkipProjectPackages) {
    # Runtime: rendering spike + perceptually accurate irregular physics bodies.
    npm install --save-exact pixi.js@8.20.1 poly-decomp@0.3.0

    # Development-only asset/tuning pipeline.
    npm install --save-dev --save-exact @assetpack/core@1.7.0 svgo@4.1.0 lil-gui@0.21.0

    npm test
    npm run build
  }
}
finally {
  Pop-Location
}

if ($InstallSpectorMcp) {
  New-Item -ItemType Directory -Force -Path $ToolsRoot | Out-Null
  $spectorRoot = Join-Path $ToolsRoot "Spector.js"

  if (-not (Test-Path $spectorRoot)) {
    git clone https://github.com/BabylonJS/Spector.js.git $spectorRoot
  } else {
    Push-Location $spectorRoot
    try {
      git pull --ff-only
    } finally {
      Pop-Location
    }
  }

  Push-Location (Join-Path $spectorRoot "mcp")
  try {
    npm install
    npx playwright install chromium
    npm run build
  } finally {
    Pop-Location
  }

  Write-Host "Spector.js MCP built at: $(Join-Path $spectorRoot 'mcp\dist')"
  Write-Host "Add the MCP server to your agent only when Phase 14 renderer work begins."
}

Write-Host "Visual-remaster tool bootstrap completed."
