---
description: "Set up a Windows dev environment for LibreChat using Podman + WSL2, matching the known-working Paychex configuration (fixes DOCKER_HOST/WSL forwarding, Mongo NTFS bind-mount corruption, and Node TLS cert errors)."
name: "Windows + Podman LibreChat Setup"
agent: "agent"
argument-hint: "Optional: path to your LibreChat repo checkout (defaults to current workspace)"
---

# Goal

Get this Paychex LibreChat fork running locally on **Windows**, using **Podman** (via WSL2) for
infrastructure containers (MongoDB, Meilisearch, etc.) and native `npm` processes for the
API/frontend dev servers. This mirrors a known-working configuration that another developer
already validated on Windows — follow it exactly rather than improvising alternatives, since the
gotchas below are non-obvious and each cost significant troubleshooting time the first time.

## Prerequisites

1. Node.js and npm are installed on Windows natively (check with `node --version; npm --version`).
2. The repo is checked out on a Windows path (e.g. `C:\git_source_control\LibreChat`), NOT inside
   the WSL filesystem.
3. The developer has network access to `repository.paychex.com` (internal Artifactory) and
   `wiki.paychex.com` — both are required by Step 1's install script.

Podman itself does **not** need to be pre-installed — Step 1 automates that from the source of
truth: Confluence `wiki.paychex.com/display/DEVSVCS/Linux+Containers+on+Windows`
(short link `wiki.paychex.com/x/_lrOPw`).

## Step 1 — Install and configure Podman on Windows (first-time only)

**Use [scripts/install-podman-windows.ps1](../../scripts/install-podman-windows.ps1)** — it
automates every step from the Confluence page and is safe to re-run (each step checks current
state and skips work that's already done):

```powershell
./scripts/install-podman-windows.ps1 -DryRun   # preview what would happen, no changes made
./scripts/install-podman-windows.ps1           # run for real
```

What it does, in order:
1. Updates the WSL2 Linux kernel (`wsl --update`) and sets WSL2 as the default version.
2. Downloads the latest Paychex `podman.tar` WSL distro image from Artifactory (auto-detects the
   highest-numbered build under `jenkins-build-local/sle/slac/containersonwindows/main/`) and
   imports it as the `podman` WSL distro.
3. Initializes the distro (starts it twice, per the Confluence page's explicit instruction) and
   sets `PODMAN_ON_WINDOWS_HOME` / `DOCKER_HOST` (default `tcp://127.0.0.1:2333`) as persistent
   Windows user environment variables.
4. Downloads the latest lightweight `docker.bat` / `docker-compose.bat` wrappers from Artifactory
   (`ContainersOnWindows_WindowsTools/main/`), installs them plus a `podman.bat` copy into
   `C:\containers-on-windows\linux\podman\path`, renames any pre-existing heavyweight
   `docker.exe`/`podman.exe` wrappers out of the way, and adds that directory to the User `PATH`.
5. Sets `ADDITIONAL_WSLENV=DOCKER_HOST/u` (persistent) so `DOCKER_HOST` is forwarded into WSL for
   tools like `docker-compose` that run inside the podman distro — this is the same mechanism the
   official Paychex wrapper scripts use internally.

**Upgrading an existing install** (e.g. to pick up a newer Podman version) uses the same script
with `-Upgrade`. This is destructive — it unregisters the current WSL distro first, erasing all
locally downloaded/built container images — so it prompts for confirmation:

```powershell
./scripts/install-podman-windows.ps1 -Upgrade
```

After the script finishes, **close and reopen your terminal** (PATH/env var changes only apply to
new sessions), then verify:

```powershell
node --version; npm --version
Get-Command docker -ErrorAction SilentlyContinue
Get-Command podman -ErrorAction SilentlyContinue
Get-Command docker-compose -ErrorAction SilentlyContinue
wsl -l -v
[System.Environment]::GetEnvironmentVariable("DOCKER_HOST", "User")
```

You should see a WSL distro named `podman` in `Running` state, and a `DOCKER_HOST` value like
`tcp://127.0.0.1:2333`. If anything looks wrong, re-run `./scripts/install-podman-windows.ps1
-DryRun` to see what it thinks still needs fixing, or fall back to the Confluence page directly —
the script mirrors it exactly but the page is the source of truth if Paychex's tooling changes.

## Step 2 — Fix `DOCKER_HOST` not being forwarded into WSL (critical gotcha)

The `docker`/`docker-compose` `.bat` shims that Podman-on-Windows installs do **not** forward
`DOCKER_HOST` into the WSL distro. Running plain `docker compose up` from PowerShell will look
like it works but the compose provider inside WSL won't find the podman socket. Two options,
prefer #1 (already partially scripted for you):

**Option 1 (recommended): use [scripts/start-podman-infra.ps1](../../scripts/start-podman-infra.ps1)**

```powershell
./scripts/start-podman-infra.ps1
```

This script:
- Confirms the Podman WSL distro is present/running
- Sets `ADDITIONAL_WSLENV=DOCKER_HOST/u` as a **persistent** Windows user env var (one-time; only
  takes effect in *new* terminal sessions — existing terminals won't pick it up)
- Converts the Windows repo path to its WSL equivalent (`wslpath`)
- Runs `docker compose up mongodb meilisearch -d` **inside WSL**, passing `DOCKER_HOST` explicitly
  so it works even before `ADDITIONAL_WSLENV` propagation kicks in

Pass `-Services mongodb,meilisearch,vectordb,rag_api` if RAG/vector search is also needed locally.

**Option 2 (manual, if the script isn't available):**

```powershell
[System.Environment]::SetEnvironmentVariable("ADDITIONAL_WSLENV", "DOCKER_HOST/u", "User")
wsl -d podman sh -c "cd /mnt/c/git_source_control/LibreChat && DOCKER_HOST=tcp://127.0.0.1:2333 docker compose up mongodb meilisearch -d"
```

Adjust the WSL path and port to match Step 1's output.

## Step 3 — Avoid MongoDB data corruption from NTFS bind mounts (critical gotcha)

`docker-compose.yml` binds Mongo's data directory as `./data-node:/data/db`. On Windows, that
directory lives on an NTFS-backed drive mounted into WSL via `/mnt/c/...` — WiredTiger (Mongo's
storage engine) needs POSIX file-locking semantics that NTFS-over-9p/drvfs does not reliably
provide, and Mongo will fail to start or silently corrupt its data directory.

**Fix:** override the `mongodb` service in `docker-compose.override.yml` (create this file at the
repo root if it doesn't exist — it's gitignored and expected to be host-specific) to use a named
Docker volume instead of the NTFS bind mount, so data lives natively inside the podman/WSL ext4
filesystem:

```yaml
services:
  mongodb:
    volumes:
      - mongo_data_windows:/data/db

volumes:
  mongo_data_windows:
```

Do this **before** first bringing Mongo up on Windows. If Mongo was already started once against
the NTFS bind mount and is failing to connect or crashing, stop the container, delete
`./data-node` locally, and switch to the named volume before retrying — don't try to recover data
from the NTFS-mounted directory.

## Step 4 — Fix Node TLS cert errors against Paychex/OpenAI endpoints (critical gotcha)

Once infra is up and you run `npm run backend:dev`, you'll likely see errors like:

```
Failed to fetch models from openAI API ... unable to get local issuer certificate
```

This is because Node initializes its TLS certificate chain **before** `dotenv` loads `.env`, so
setting `NODE_EXTRA_CA_CERTS` inside `.env` has no effect for the native (non-containerized) dev
servers. It must be set as a **persistent Windows user environment variable**, pointing at
`paychex-root.pem` in the repo root:

```powershell
[System.Environment]::SetEnvironmentVariable("NODE_EXTRA_CA_CERTS", "C:\git_source_control\LibreChat\paychex-root.pem", "User")
$env:NODE_EXTRA_CA_CERTS = "C:\git_source_control\LibreChat\paychex-root.pem"  # also set for the current session
```

Verify the cert is trusted (a non-200 status is fine — TLS succeeding is what matters):

```powershell
node -e "const https=require('https'); const req=https.get('https://service-internal-n2a.paychex.com', r=>{ console.log('OK',r.statusCode); req.destroy(); }).on('error',e=>console.error('FAIL:',e.message)); req.end();"
```

If `npm run backend:dev` is already running via `nodemon`, type `rs` in that terminal to restart
and pick up the newly-set env var — no need to fully stop/restart the process.

## Step 5 — Start the dev servers

```powershell
npm run backend:dev    # in one terminal
npm run frontend:dev   # in another terminal
```

Access at `http://localhost:3090` (frontend dev, proxies to backend) or `http://localhost:3080`
(backend directly).

## After a reboot or `wsl --shutdown`

Infra containers need to be brought back up (WSL and Podman don't auto-start containers on their
own after a restart):

```powershell
./scripts/start-podman-infra.ps1
```

`NODE_EXTRA_CA_CERTS` and `ADDITIONAL_WSLENV` are persistent user env vars and do **not** need to
be re-set after a reboot.

## Troubleshooting checklist

- **`docker compose` hangs or can't reach podman socket** → confirm `wsl -l -v` shows the podman
  distro as `Running`; if not, run any `wsl -d podman ...` command to auto-start it, or
  `wsl --shutdown` followed by re-running [scripts/start-podman-infra.ps1](../../scripts/start-podman-infra.ps1).
- **Mongo container starts but the app can't connect / data looks wiped** → check Step 3; you're
  likely still bind-mounting `./data-node` on NTFS.
- **`ECONNREFUSED` or protocol-level failures against a port that appears open** → known
  Podman-rootless + WSL2 relay (`wslrelay`) issue where TCP handshakes succeed but application
  data doesn't route correctly. Try connecting from *inside* WSL first
  (`wsl -d podman sh -c "nc -zv 127.0.0.1 <port>"`) to isolate whether it's a Windows-side or
  container-side networking problem before assuming the container itself is broken.
- **TLS/certificate errors from any outbound call (OpenAI, Azure, internal Paychex APIs)** → check
  Step 4; `NODE_EXTRA_CA_CERTS` must be a Windows user/machine env var, not a `.env` entry.
