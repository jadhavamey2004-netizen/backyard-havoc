#!/usr/bin/env pwsh
[CmdletBinding()]
param(
    [string]$ToolsRoot = $(if ($env:BACKYARD_TOOLS_HOME) { $env:BACKYARD_TOOLS_HOME } else { 'D:\BionicWorkspace\tools' }),
    [string]$OutputRoot = '',
    [string]$BaseRef = 'main',
    [switch]$ProbeMcp,
    [switch]$CreateReviewPackage
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-ExternalPath([string]$Path) {
    return [System.IO.Path]::GetFullPath($Path).TrimEnd([System.IO.Path]::DirectorySeparatorChar)
}

function Test-WithinPath([string]$Candidate, [string]$Parent) {
    $candidateFull = Resolve-ExternalPath $Candidate
    $parentFull = (Resolve-ExternalPath $Parent) + [System.IO.Path]::DirectorySeparatorChar
    return $candidateFull.StartsWith($parentFull, [System.StringComparison]::OrdinalIgnoreCase) -or
        $candidateFull.Equals($Parent, [System.StringComparison]::OrdinalIgnoreCase)
}

function Find-LocalTool([string]$Name, [string[]]$Candidates) {
    $fromPath = Get-Command $Name -ErrorAction SilentlyContinue
    if ($fromPath) { return $fromPath.Source }
    foreach ($candidate in $Candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $candidate }
    }
    return $null
}

function Invoke-ToolCapture([string]$Label, [string]$Executable, [string[]]$Arguments) {
    if (-not $Executable) {
        $script:Report.Add("### $Label`nUnavailable")
        return $null
    }
    try {
        $output = (& $Executable @Arguments 2>&1 | ForEach-Object { "$($_)" }) -join "`n"
        $exitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
        $output = [regex]::Replace($output, '(?i)([A-Z0-9_-]*(?:api[_-]?key|token|password|secret|authorization)[A-Z0-9_-]*["'']?\s*[:=]\s*)(["''][^"'']*["'']|[^\s,;}]+)', '$1<redacted>')
        if ($Label -eq 'Save-The-Token availability') {
            $script:Report.Add("### $Label`nExit code: $exitCode`nCLI is present; it does not expose a version flag.")
        } else {
            $script:Report.Add("### $Label`nExit code: $exitCode`n$($output.Trim())")
        }
        return [pscustomobject]@{ ExitCode = $exitCode; Output = $output }
    } catch {
        $script:Report.Add("### $Label`nFailed to run: $($_.Exception.Message)")
        return [pscustomobject]@{ ExitCode = 1; Output = $_.Exception.Message }
    }
}

$repoRoot = (& git rev-parse --show-toplevel 2>$null).Trim()
if (-not $repoRoot) { throw 'Run this script from inside a Git repository.' }
$repoRoot = Resolve-ExternalPath $repoRoot
$ToolsRoot = Resolve-ExternalPath $ToolsRoot
if (-not $OutputRoot) {
    $OutputRoot = Join-Path $ToolsRoot 'context-preflight'
}
$OutputRoot = Resolve-ExternalPath $OutputRoot
if (Test-WithinPath $OutputRoot $repoRoot) {
    throw "OutputRoot must be outside the repository: $OutputRoot"
}
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

$serena = Find-LocalTool 'serena' @((Join-Path $ToolsRoot 'bin\serena.exe'))
$atlas = Find-LocalTool 'atlas' @((Join-Path $ToolsRoot 'bin\atlas.exe'))
$saveToken = Find-LocalTool 'save-the-token' @((Join-Path $ToolsRoot 'bin\save-the-token.exe'))
$repomix = Find-LocalTool 'repomix' @((Join-Path $ToolsRoot 'npm\repomix.cmd'))
$playwrightCli = Find-LocalTool 'playwright-cli' @((Join-Path $ToolsRoot 'npm\playwright-cli.cmd'))
$memoryPackage = Join-Path $ToolsRoot 'npm\node_modules\coding-agent-memory-mcp\package.json'
$script:Report = [System.Collections.Generic.List[string]]::new()
$script:Report.Add("# Context preflight`n`nGenerated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')`nRepository: $repoRoot`nTools root: $ToolsRoot`nOutput root: $OutputRoot`nBase ref: $BaseRef`nThis script does not install packages, change Codex configuration, or write generated files into the repository.")

foreach ($tool in @(
    [pscustomobject]@{ Name = 'Serena'; Path = $serena; Args = @('--version') },
    [pscustomobject]@{ Name = 'Atlas'; Path = $atlas; Args = @('--version') },
    [pscustomobject]@{ Name = 'Save-The-Token'; Path = $saveToken; Args = @('--help') },
    [pscustomobject]@{ Name = 'Repomix'; Path = $repomix; Args = @('--version') },
    [pscustomobject]@{ Name = 'Playwright CLI'; Path = $playwrightCli; Args = @('--version') }
)) {
    if ($tool.Path) {
        $versionResult = Invoke-ToolCapture "$($tool.Name) availability" $tool.Path $tool.Args
        if ($tool.Name -eq 'Save-The-Token' -and $versionResult.Output) {
            $firstLine = ($versionResult.Output -split "`n" | Select-Object -First 1)
            $script:Report.Add("Save-The-Token command: $firstLine")
        }
    } else {
        $script:Report.Add("### $($tool.Name)`nUnavailable")
    }
}

if (Test-Path -LiteralPath $memoryPackage -PathType Leaf) {
    $memoryMeta = Get-Content -LiteralPath $memoryPackage -Raw | ConvertFrom-Json
    $script:Report.Add("### Markdown memory MCP`nInstalled version: $($memoryMeta.version)`nPackage: $memoryPackage")
} else {
    $script:Report.Add('### Markdown memory MCP' + "`nUnavailable")
}

if (Test-Path -LiteralPath (Join-Path $repoRoot '.serena\project.yml') -PathType Leaf) {
    if ($serena) {
        $previousPythonUtf8 = $env:PYTHONUTF8
        try {
            $env:PYTHONUTF8 = '1'
            $healthOutput = (& $serena project health-check $repoRoot 2>&1 | ForEach-Object { "$($_)" }) -join "`n"
            $healthExit = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
            $healthStatus = if ($healthExit -eq 0 -and $healthOutput -match 'Health check passed|Health check completed successfully') { 'passed' } else { 'did not report a pass' }
            $script:Report.Add("### Serena project health`nExit code: $healthExit; health check $healthStatus. Verbose logs are stored in Serena's ignored local project cache.")
        } finally {
            $env:PYTHONUTF8 = $previousPythonUtf8
        }
    } else {
        $script:Report.Add("### Serena project health`nProject configuration exists but the Serena executable was not found.")
    }
} else {
    $script:Report.Add("### Serena project health`nSkipped: no .serena/project.yml. Run Serena setup/index explicitly when desired; this script will not initialize it.")
}

if ($atlas) {
    $mapPath = Join-Path $OutputRoot 'backyard-havoc-focused-map.md'
    $mapResult = (& $atlas $repoRoot --budget 1400 --focus 'src/main.js,src/game.js,src/rendering,src/ui,style.css' 2>&1 | ForEach-Object { "$($_)" }) -join "`n"
    $mapExit = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
    if ($mapExit -eq 0 -and $mapResult) {
        $mapContent = "<!-- Navigation aid only; verify actual source, callers, styles, and tests. -->`n`n$mapResult`n"
        [System.IO.File]::WriteAllText($mapPath, $mapContent, [System.Text.UTF8Encoding]::new($false))
        $mapBytes = (Get-Item -LiteralPath $mapPath).Length
        $script:Report.Add("### Atlas map`nPath: $mapPath`nRendered bytes: $mapBytes`nBudget: 1400 Atlas tokens (tool estimate)")
    } else {
        $script:Report.Add("### Atlas map`nFailed with exit code $mapExit`n$mapResult")
    }
} else {
    $script:Report.Add('### Atlas map' + "`nUnavailable")
}

if ($saveToken) {
    try {
        $scanOutput = (& $saveToken scan --root $repoRoot 2>&1 | ForEach-Object { "$($_)" }) -join "`n"
        $scanExit = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
        if ($scanExit -eq 0) {
            $scanData = $scanOutput | ConvertFrom-Json
            $sourceSummary = @($scanData.sources | ForEach-Object { "$($_.client)/$($_.scope)" } | Sort-Object -Unique) -join ', '
            $serverSummary = @($scanData.servers | ForEach-Object { "$($_.server_id) ($($_.source.client))" } | Sort-Object -Unique) -join ', '
            $script:Report.Add("### Save-The-Token read-only scan`nCompleted. Clients: $sourceSummary`nConfigured server IDs: $serverSummary`nConfiguration values, commands, URLs, and environment data are intentionally omitted.")
        } else {
            $script:Report.Add("### Save-The-Token read-only scan`nFailed with exit code $scanExit; raw output omitted to avoid exposing configuration values.")
        }
    } catch {
        $script:Report.Add("### Save-The-Token read-only scan`nCould not summarize scan output; raw output omitted. $($_.Exception.Message)")
    }
    try {
        $evalOutput = (& $saveToken eval --root $repoRoot --task 'Phase 14 Canvas2D theater presentation and HUD safe areas' 2>&1 | ForEach-Object { "$($_)" }) -join "`n"
        $evalExit = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
        $evalData = $evalOutput | ConvertFrom-Json
        $variantSummary = @($evalData.variants | ForEach-Object { "$($_.name): $($_.estimated_tokens) estimated tokens; recall $($_.selected_evidence_recall); $($_.sufficiency_status)" }) -join '; '
        $script:Report.Add("### Save-The-Token instruction evaluation`nExit code: $evalExit`n$variantSummary`nThis is a tool estimate, not Codex token usage.")
    } catch {
        $script:Report.Add("### Save-The-Token instruction evaluation`nCould not parse evaluation; raw output omitted. $($_.Exception.Message)")
    }
    if ($ProbeMcp) {
        try {
            $mcpOutput = (& $saveToken report --root $repoRoot --budget 8000 --context-budget 8000 --task 'Phase 14 Canvas2D theater presentation and HUD safe areas' --route-instructions --compress-instructions --order-evidence --schema-digest --timeout 60 2>&1 | ForEach-Object { "$($_)" }) -join "`n"
            $mcpExit = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
            $mcpData = $mcpOutput | ConvertFrom-Json
            $schemaSummary = @($mcpData.tool_schema_digests | ForEach-Object {
                $serverId = if ($_.server -is [string]) { $_.server } else { $_.server.server_id }
                "$serverId`: full $($_.total_full_schema_tokens), digest $($_.total_digest_tokens), saved $($_.saved_tokens) estimated tokens"
            }) -join '; '
            $script:Report.Add("### Save-The-Token task-routed schema report`nExit code: $mcpExit; status: $($mcpData.status)`nContext estimate: $($mcpData.context_budget.total_estimated_tokens) total / $($mcpData.context_budget.selected_tokens) selected / $($mcpData.context_budget.skipped_tokens) skipped`nInstruction estimate: $($mcpData.prompt_compression.original_tokens) original / $($mcpData.prompt_compression.compressed_tokens) compressed; sufficiency is $($mcpData.status).`n$schemaSummary`nMissing-fact count: $(@($mcpData.missing_facts).Count). Config values and raw evidence are omitted.")
        } catch {
            $script:Report.Add("### Save-The-Token task-routed schema report`nCould not summarize report; raw output omitted. $($_.Exception.Message)")
        }
    } else {
        $script:Report.Add("### Save-The-Token MCP schemas`nNot probed. Re-run with -ProbeMcp to start configured servers and produce a task-routed report; no Codex config is changed.")
    }
}

if ($CreateReviewPackage) {
    if (-not $repomix) { throw 'Repomix is unavailable; cannot create the requested review package.' }
    $relativePaths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    @('.ai/CURRENT_PHASE_CAPSULE.md', '.ai/PHASE_HANDOFF_TEMPLATE.md', '.ai/CONTEXT_EFFICIENCY_PREFLIGHT.md', 'AGENTS.md') | ForEach-Object { [void]$relativePaths.Add($_) }
    $diffPaths = @(& git diff --name-only $BaseRef 2>$null)
    if ($LASTEXITCODE -ne 0) { throw "Could not compare working tree with '$BaseRef'." }
    $untrackedPaths = @(& git ls-files --others --exclude-standard)
    foreach ($relative in @($diffPaths + $untrackedPaths)) {
        if ($relative) { [void]$relativePaths.Add($relative.Trim()) }
    }
    $bundleInputs = foreach ($relative in $relativePaths) {
        $candidate = [System.IO.Path]::GetFullPath((Join-Path $repoRoot $relative))
        if (-not (Test-WithinPath $candidate $repoRoot)) { throw "Review input escaped repository root: $relative" }
        if ($relative -match '(?i)(^|[\\/])\.env($|\.)|(^|[\\/])(secrets?|credentials?)([\\/]|$)|\.(pem|key|p12|pfx)$') { continue }
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { $relative.Replace('\', '/') }
    }
    if (-not $bundleInputs) { throw 'No review input files were found.' }
    $unsupportedPath = @($bundleInputs | Where-Object { $_.Contains(',') })
    if ($unsupportedPath.Count -gt 0) { throw "Repomix --include cannot safely encode comma-containing paths: $($unsupportedPath -join ', ')" }
    $includePatterns = $bundleInputs -join ','
    $bundlePath = Join-Path $OutputRoot 'backyard-havoc-review-package.md'
    Push-Location $repoRoot
    try {
        $bundleOutput = & $repomix $repoRoot --include $includePatterns --no-default-patterns --compress --style markdown --token-count-encoding o200k_base --output $bundlePath --verbose 2>&1
        $bundleExit = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
    } finally {
        Pop-Location
    }
    $bundleLog = @($bundleOutput | ForEach-Object { "$($_)" } | Where-Object { $_ -cmatch '^\s*(Total Files:|Total Tokens:|Total Chars:|Security:)' }) -join '; '
    if ($bundleExit -ne 0 -or -not (Test-Path -LiteralPath $bundlePath)) {
        throw "Repomix failed with exit code $bundleExit. $bundleLog"
    }
    $bundleInfo = Get-Item -LiteralPath $bundlePath
    $script:Report.Add("### Repomix review package`nPath: $bundlePath`nFiles: $($bundleInputs.Count)`nBytes: $($bundleInfo.Length)`n$bundleLog")
}

$reportPath = Join-Path $OutputRoot 'context-preflight-report.md'
[System.IO.File]::WriteAllText($reportPath, ($script:Report -join "`n`n") + "`n", [System.Text.UTF8Encoding]::new($false))
Write-Output "Context preflight report: $reportPath"
if ($CreateReviewPackage -and (Test-Path -LiteralPath $bundlePath)) { Write-Output "Review package: $bundlePath" }
