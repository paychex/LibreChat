<#
.SYNOPSIS
    Brings up LibreChat's infrastructure containers (mongodb, meilisearch, etc.) through
    Podman running inside a WSL2 distro on Windows.

.DESCRIPTION
    On Windows, LibreChat dev is typically run with `npm run backend:dev` / `npm run frontend:dev`
    natively, while supporting infra (Mongo, Meilisearch, ...) runs in containers via Podman on
    Windows (installed per wiki.paychex.com/display/DEVSVCS/Linux+Containers+on+Windows).

    Podman itself runs inside a WSL2 distro (default name: "podman"), and its daemon is exposed
    to Windows via DOCKER_HOST (e.g. tcp://127.0.0.1:2333). The docker/docker-compose *.bat shims
    that Windows uses do not forward DOCKER_HOST into WSL, so running `docker compose` from a WSL
    shell requires DOCKER_HOST to be passed in explicitly. This script does that for you.

    It also fixes ADDITIONAL_WSLENV (persistent, user-scoped) so DOCKER_HOST is forwarded into
    WSL automatically for any future terminal sessions.

.PARAMETER Services
    Docker Compose service names to bring up. Defaults to mongodb and meilisearch (the two
    services needed for `npm run backend:dev` / `npm run frontend:dev`).

.PARAMETER RepoPath
    Windows path to the LibreChat repo. Defaults to the parent of this script's directory.

.PARAMETER WslDistro
    Name of the WSL distro running Podman. Defaults to "podman".

.PARAMETER DockerHost
    Value for DOCKER_HOST (host:port podman is listening on). Defaults to the current
    DOCKER_HOST user/machine environment variable, falling back to tcp://127.0.0.1:2333.

.EXAMPLE
    ./scripts/start-podman-infra.ps1

.EXAMPLE
    ./scripts/start-podman-infra.ps1 -Services mongodb,meilisearch,vectordb,rag_api
#>

param(
    [string[]]$Services = @("mongodb", "meilisearch"),
    [string]$RepoPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
    [string]$WslDistro = "podman",
    [string]$DockerHost = $(
        if ($env:DOCKER_HOST) { $env:DOCKER_HOST }
        else {
            $u = [System.Environment]::GetEnvironmentVariable("DOCKER_HOST", "User")
            $m = [System.Environment]::GetEnvironmentVariable("DOCKER_HOST", "Machine")
            if ($u) { $u } elseif ($m) { $m } else { "tcp://127.0.0.1:2333" }
        }
    )
)

$ErrorActionPreference = "Stop"

# 1. Confirm the Podman WSL distro is present and running.
$wslList = wsl -l -v 2>&1
if (-not ($wslList -match [regex]::Escape($WslDistro))) {
    Write-Error "WSL distro '$WslDistro' not found. Run 'wsl -l -v' to see available distros, or verify Podman-on-Windows is installed (wiki.paychex.com/display/DEVSVCS/Linux+Containers+on+Windows)."
    exit 1
}

# 2. Ensure DOCKER_HOST is forwarded into WSL for future sessions (ADDITIONAL_WSLENV).
$currentWslEnv = [System.Environment]::GetEnvironmentVariable("ADDITIONAL_WSLENV", "User")
if (-not $currentWslEnv -or ($currentWslEnv -notmatch "DOCKER_HOST")) {
    $newValue = if ($currentWslEnv) { "$currentWslEnv:DOCKER_HOST/u" } else { "DOCKER_HOST/u" }
    [System.Environment]::SetEnvironmentVariable("ADDITIONAL_WSLENV", $newValue, "User")
    Write-Host "Set ADDITIONAL_WSLENV=$newValue (persistent). New terminals will forward DOCKER_HOST into WSL automatically." -ForegroundColor Yellow
}

# 3. Convert the Windows repo path to its WSL path (e.g. C:\git_source_control\LibreChat -> /mnt/c/git_source_control/LibreChat).
$wslPath = (wsl wslpath ($RepoPath -replace '\\', '/')) 2>&1
if (-not $wslPath) {
    Write-Error "Failed to resolve WSL path for '$RepoPath'."
    exit 1
}
$wslPath = $wslPath.Trim()

# 4. Bring up the requested services through Podman inside WSL, with DOCKER_HOST forwarded explicitly.
$serviceList = $Services -join " "
$remoteCmd = "cd '$wslPath' && DOCKER_HOST=$DockerHost docker compose up $serviceList -d"
Write-Host "Running inside WSL ($WslDistro): $remoteCmd" -ForegroundColor Cyan
wsl -d $WslDistro sh -c $remoteCmd

if ($LASTEXITCODE -ne 0) {
    Write-Error "docker compose up failed (exit code $LASTEXITCODE). Try running 'wsl -l -v' to confirm Podman is 'Running', or restart WSL with 'wsl --shutdown' followed by re-running this script."
    exit $LASTEXITCODE
}

Write-Host "Infra containers requested: $serviceList" -ForegroundColor Green
Write-Host "You can now run 'npm run backend:dev' / 'npm run frontend:dev'." -ForegroundColor Green
