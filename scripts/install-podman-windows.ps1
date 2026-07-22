<#
.SYNOPSIS
    Installs and configures Podman-on-Windows (via WSL2) per the Paychex "Linux Containers on
    Windows" Confluence page (wiki.paychex.com/x/_lrOPw), so LibreChat's infra containers can run
    locally on Windows.

.DESCRIPTION
    Automates the steps documented on that page:
      1. Update the WSL2 Linux kernel and set WSL2 as the default version.
      2. Download the latest Paychex "podman.tar" WSL distro image from Artifactory and import it
         as the "podman" WSL distro.
      3. Initialize the distro and set persistent PODMAN_ON_WINDOWS_HOME / DOCKER_HOST env vars.
      4. Download the latest lightweight docker.bat wrapper from Artifactory, install it (and a
         podman.bat copy) into the wrapper path directory, and add that directory to the User PATH.
      5. Set ADDITIONAL_WSLENV=DOCKER_HOST/u so DOCKER_HOST is forwarded into WSL for tools
         (docker-compose, etc.) that run inside the podman distro.

    Every step checks current state first and skips work that's already done, so it's safe to
    re-run. Use -DryRun to preview what would happen without making any changes.

    Upgrading an EXISTING podman install (-Upgrade) unregisters the current WSL distro first,
    which erases all locally downloaded/built container images - this requires explicit
    confirmation (or -Confirm:$false to skip the prompt).

.PARAMETER InstallRoot
    Root directory for the podman WSL distro and wrapper files. Defaults to
    C:\containers-on-windows\linux\podman, matching the Confluence page.

.PARAMETER DockerHostPort
    Port the podman daemon listens on inside WSL. Defaults to 2333 (the Paychex default, chosen
    to avoid colliding with the standard Docker port 2375).

.PARAMETER Upgrade
    Perform an upgrade instead of a fresh install: stops and unregisters the existing "podman" WSL
    distro (erasing its images), updates the WSL kernel, and re-imports the latest podman.tar.
    Prompts for confirmation unless -Confirm:$false is passed.

.PARAMETER DryRun
    Print the actions that would be taken without making any changes or downloading anything.

.EXAMPLE
    ./scripts/install-podman-windows.ps1 -DryRun

.EXAMPLE
    ./scripts/install-podman-windows.ps1

.EXAMPLE
    ./scripts/install-podman-windows.ps1 -Upgrade
#>

[CmdletBinding(SupportsShouldProcess, ConfirmImpact = "High")]
param(
    [string]$InstallRoot = "C:\containers-on-windows\linux\podman",
    [int]$DockerHostPort = 2333,
    [switch]$Upgrade,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$PodmanDistroArtifactoryUrl = "https://repository.paychex.com/artifactory/jenkins-build-local/sle/slac/containersonwindows/main/"
$WrapperArtifactoryUrl = "https://repository.paychex.com/artifactory/jenkins-build-local/sle/slac/ContainersOnWindows_WindowsTools/main/"
$WslDistroName = "podman"
$WrapperDir = Join-Path $InstallRoot "path"
$WslMountDir = Join-Path $InstallRoot "wsl"

function Write-Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Skip($msg) { Write-Host "    (skip) $msg" -ForegroundColor DarkGray }
function Write-Action($msg) { Write-Host "    $msg" -ForegroundColor Yellow }

function Invoke-MaybeAction {
    param([string]$Description, [scriptblock]$Action)
    if ($DryRun) {
        Write-Action "[DryRun] Would: $Description"
        return
    }
    Write-Action $Description
    & $Action
}

function Get-LatestArtifactoryBuildUrl {
    param([string]$BaseUrl)
    $resp = Invoke-WebRequest -Uri $BaseUrl -UseBasicParsing -UseDefaultCredentials
    $numbers = [regex]::Matches($resp.Content, 'href="(\d+)/?"') |
        ForEach-Object { [int]$_.Groups[1].Value } |
        Sort-Object -Unique
    if (-not $numbers -or $numbers.Count -eq 0) {
        throw "Could not find any numbered build directories at $BaseUrl. Browse it manually in a browser to confirm the layout hasn't changed."
    }
    $latest = ($numbers | Measure-Object -Maximum).Maximum
    return "$($BaseUrl.TrimEnd('/'))/$latest/"
}

function Get-ArtifactoryNamedFileUrl {
    param([string]$FolderUrl, [string]$FileName)
    $resp = Invoke-WebRequest -Uri $FolderUrl -UseBasicParsing -UseDefaultCredentials
    $pattern = 'href="' + [regex]::Escape($FileName) + '"'
    if ($resp.Content -notmatch $pattern) {
        throw "Could not find '$FileName' under $FolderUrl. Browse it manually to find the correct file name."
    }
    return "$($FolderUrl.TrimEnd('/'))/$FileName"
}

function Get-WslDistroStatus {
    param([string]$Name)
    $list = (wsl -l -v 2>&1) -join "`n"
    if ($list -notmatch [regex]::Escape($Name)) { return $null }
    $line = ($list -split "`n") | Where-Object { $_ -match [regex]::Escape($Name) }
    return $line
}

# ---------------------------------------------------------------------------
# Upgrade path: unregister the existing distro first (destructive, confirmed).
# ---------------------------------------------------------------------------
if ($Upgrade) {
    $existing = Get-WslDistroStatus -Name $WslDistroName
    if ($existing) {
        $target = "WSL distro '$WslDistroName' ($InstallRoot)"
        if ($PSCmdlet.ShouldProcess($target, "Terminate and unregister (ERASES all images) to upgrade")) {
            Invoke-MaybeAction "wsl --terminate $WslDistroName" { wsl --terminate $WslDistroName }
            Invoke-MaybeAction "wsl --unregister $WslDistroName" { wsl --unregister $WslDistroName }
        }
        else {
            Write-Host "Upgrade cancelled." -ForegroundColor Red
            exit 1
        }
    }
    else {
        Write-Skip "No existing '$WslDistroName' WSL distro found; proceeding as a fresh install."
    }
}

# ---------------------------------------------------------------------------
# Step 1 - WSL2 kernel + default version.
# ---------------------------------------------------------------------------
Write-Step "WSL2 kernel update"
Invoke-MaybeAction "wsl --update" { wsl --update }
Invoke-MaybeAction "wsl --set-default-version 2" { wsl --set-default-version 2 }

# ---------------------------------------------------------------------------
# Step 2 - Download + import the podman WSL distro (skip if already registered, unless -Upgrade).
# ---------------------------------------------------------------------------
Write-Step "Podman WSL distro"
$existingDistro = Get-WslDistroStatus -Name $WslDistroName
if ($existingDistro -and -not $Upgrade) {
    Write-Skip "WSL distro '$WslDistroName' already registered: $existingDistro"
}
else {
    Invoke-MaybeAction "Set PODMAN_ON_WINDOWS_HOME=$InstallRoot (persistent, User scope)" {
        [System.Environment]::SetEnvironmentVariable("PODMAN_ON_WINDOWS_HOME", $InstallRoot, "User")
    }

    New-Item -ItemType Directory -Force -Path $WslMountDir | Out-Null

    $buildFolder = Get-LatestArtifactoryBuildUrl -BaseUrl $PodmanDistroArtifactoryUrl
    $tarUrl = Get-ArtifactoryNamedFileUrl -FolderUrl $buildFolder -FileName "podman.tar"
    $tarPath = Join-Path $env:TEMP "podman.tar"

    Invoke-MaybeAction "Download $tarUrl -> $tarPath" {
        Invoke-WebRequest -Uri $tarUrl -OutFile $tarPath -UseDefaultCredentials
    }
    Invoke-MaybeAction "wsl --import $WslDistroName `"$WslMountDir`" `"$tarPath`"" {
        wsl --import $WslDistroName $WslMountDir $tarPath
    }

    if (-not $DryRun) {
        $imported = Get-WslDistroStatus -Name $WslDistroName
        if (-not $imported) {
            throw "Import appears to have failed - '$WslDistroName' not found in 'wsl -l -v'."
        }
        if ($imported -notmatch "\b2\b") {
            Write-Host "WARNING: '$WslDistroName' was not imported as WSL version 2. Run: wsl --set-default-version 2 ; wsl --terminate $WslDistroName ; wsl --unregister $WslDistroName ; then re-run this script." -ForegroundColor Red
        }
    }
}

# ---------------------------------------------------------------------------
# Step 3 - Initialize the distro (must be started twice per the Confluence page) + DOCKER_HOST.
# ---------------------------------------------------------------------------
Write-Step "Initialize podman distro + DOCKER_HOST"
Invoke-MaybeAction "wsl -d $WslDistroName (first run)" { wsl -d $WslDistroName -- true }
Invoke-MaybeAction "wsl -d $WslDistroName (second run, required)" { wsl -d $WslDistroName -- true }

$dockerHostValue = "tcp://127.0.0.1:$DockerHostPort"
Invoke-MaybeAction "Set DOCKER_HOST=$dockerHostValue (persistent, User scope)" {
    [System.Environment]::SetEnvironmentVariable("DOCKER_HOST", $dockerHostValue, "User")
    $env:DOCKER_HOST = $dockerHostValue
}
Invoke-MaybeAction "Set ADDITIONAL_WSLENV=DOCKER_HOST/u (persistent, User scope) so DOCKER_HOST is forwarded into WSL" {
    $currentWslEnv = [System.Environment]::GetEnvironmentVariable("ADDITIONAL_WSLENV", "User")
    if (-not $currentWslEnv -or ($currentWslEnv -notmatch "DOCKER_HOST")) {
        $newValue = if ($currentWslEnv) { "$currentWslEnv:DOCKER_HOST/u" } else { "DOCKER_HOST/u" }
        [System.Environment]::SetEnvironmentVariable("ADDITIONAL_WSLENV", $newValue, "User")
    }
}

# ---------------------------------------------------------------------------
# Step 4 - Install the lightweight docker.bat / podman.bat wrapper + PATH entry.
# ---------------------------------------------------------------------------
Write-Step "docker/podman command wrappers"
$dockerBatPath = Join-Path $WrapperDir "docker.bat"
$podmanBatPath = Join-Path $WrapperDir "podman.bat"
$composeBatPath = Join-Path $WrapperDir "docker-compose.bat"

if ((Test-Path $dockerBatPath) -and (Test-Path $podmanBatPath) -and (Test-Path $composeBatPath) -and -not $Upgrade) {
    Write-Skip "Wrappers already present at $WrapperDir"
}
else {
    New-Item -ItemType Directory -Force -Path $WrapperDir | Out-Null

    # Rename any old (heavyweight) docker.exe/podman.exe wrappers out of the way, per the wiki.
    foreach ($exe in @("docker.exe", "podman.exe")) {
        $exePath = Join-Path $WrapperDir $exe
        if (Test-Path $exePath) {
            Invoke-MaybeAction "Rename old wrapper $exePath -> $exePath.orig" {
                Rename-Item -Path $exePath -NewName "$exe.orig" -Force
            }
        }
    }

    $wrapperFolder = Get-LatestArtifactoryBuildUrl -BaseUrl $WrapperArtifactoryUrl
    $dockerBatUrl = Get-ArtifactoryNamedFileUrl -FolderUrl $wrapperFolder -FileName "docker.bat"
    $composeBatUrl = Get-ArtifactoryNamedFileUrl -FolderUrl $wrapperFolder -FileName "docker-compose.bat"

    Invoke-MaybeAction "Download $dockerBatUrl -> $dockerBatPath" {
        Invoke-WebRequest -Uri $dockerBatUrl -OutFile $dockerBatPath -UseDefaultCredentials
    }
    Invoke-MaybeAction "Download $composeBatUrl -> $composeBatPath" {
        Invoke-WebRequest -Uri $composeBatUrl -OutFile $composeBatPath -UseDefaultCredentials
    }
    Invoke-MaybeAction "Copy $dockerBatPath -> $podmanBatPath" {
        Copy-Item -Path $dockerBatPath -Destination $podmanBatPath -Force
    }
}

Write-Step "PATH entry for $WrapperDir"
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -and ($userPath -split ';' | Where-Object { $_ -eq $WrapperDir })) {
    Write-Skip "$WrapperDir already on User PATH."
}
else {
    Invoke-MaybeAction "Prepend $WrapperDir to User PATH (persistent)" {
        $newPath = if ($userPath) { "$WrapperDir;$userPath" } else { $WrapperDir }
        [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    }
    Write-Host "    NOTE: close and reopen any terminals to pick up the new PATH." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# Step 5 - Confirm the daemon is running and auto-restart is configured.
# ---------------------------------------------------------------------------
Write-Step "Confirm podman daemon"
Invoke-MaybeAction "wsl -d $WslDistroName podman start --all --filter restart-policy=always" {
    wsl -d $WslDistroName podman start --all --filter restart-policy=always
}

if ($DryRun) {
    Write-Host "`nDry run complete - no changes were made." -ForegroundColor Green
}
else {
    Write-Host "`nDone. Close and reopen your terminal so PATH/DOCKER_HOST/ADDITIONAL_WSLENV changes take effect, then verify with:" -ForegroundColor Green
    Write-Host "  wsl -l -v" -ForegroundColor Green
    Write-Host "  where docker; where podman" -ForegroundColor Green
    Write-Host "  docker --version" -ForegroundColor Green
    Write-Host "`nNext: run ./scripts/start-podman-infra.ps1 from the LibreChat repo to bring up Mongo/Meilisearch." -ForegroundColor Green
}
