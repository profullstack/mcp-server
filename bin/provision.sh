#!/usr/bin/env bash
#
# Idempotent server-side provisioning + deploy for @profullstack/mcp-server.
#
# Runs AS THE APP USER (anthony) on the target host. Safe to re-run any number
# of times: every step checks its own desired state first. Requires passwordless
# sudo for the systemd/nginx/certbot steps.
#
#   bash bin/provision.sh
#
# Env overrides:
#   APP_DIR    install location            (default: $HOME/www/mcp-server)
#   REPO_URL   git remote                  (default: profullstack/mcp-server)
#   BRANCH     branch to deploy            (default: master)
#   DOMAIN     public hostname             (default: mcp.profullstack.com)
#   PORT       loopback port for the app   (default: 3000)
#   RUNTIME    bun | node                  (default: bun)
#   CERT_EMAIL letsencrypt contact         (default: anthony@profullstack.com)

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/www/mcp-server}"
REPO_URL="${REPO_URL:-https://github.com/profullstack/mcp-server.git}"
BRANCH="${BRANCH:-master}"
DOMAIN="${DOMAIN:-mcp.profullstack.com}"
PORT="${PORT:-3000}"
RUNTIME="${RUNTIME:-bun}"
CERT_EMAIL="${CERT_EMAIL:-anthony@profullstack.com}"
SERVICE=mcp-server

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[fail]\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- toolchain --
# mise owns the runtimes. Its shims dir is on PATH for login shells, but the
# mise binary itself lives in ~/.local/bin, which is NOT on a non-interactive
# PATH -- so npm's shim fails with "mise: command not found" under ssh/CI.
export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"

if ! command -v mise >/dev/null 2>&1; then
  log "installing mise"
  curl -fsSL https://mise.run | sh
  export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"
fi
log "mise $(mise --version 2>/dev/null | head -1)"

# Pin runtimes globally so the systemd unit's absolute paths stay valid.
mise use -g node@24 >/dev/null 2>&1 || true
mise use -g bun@latest >/dev/null 2>&1 || true
mise reshim >/dev/null 2>&1 || true

command -v node >/dev/null 2>&1 || die "node missing after mise install"
command -v bun  >/dev/null 2>&1 || die "bun missing after mise install"

if ! command -v pnpm >/dev/null 2>&1; then
  log "installing pnpm"
  npm i -g pnpm@10.6.5 >/dev/null 2>&1
  mise reshim >/dev/null 2>&1 || true
fi

log "node $(node --version)  bun $(bun --version)  pnpm $(pnpm --version)"

# ------------------------------------------------------------------- source --
if [ -d "$APP_DIR/.git" ]; then
  log "updating $APP_DIR"
  git -C "$APP_DIR" remote set-url origin "$REPO_URL"
  git -C "$APP_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$APP_DIR" checkout -q -B "$BRANCH" "origin/$BRANCH"
  git -C "$APP_DIR" reset --hard -q "origin/$BRANCH"
else
  log "cloning into $APP_DIR"
  mkdir -p "$(dirname "$APP_DIR")"
  rm -rf "$APP_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
VERSION="$(node -p "require('./package.json').version")"
COMMIT="$(git rev-parse --short HEAD)"
log "deploying v$VERSION @ $COMMIT"

# Pin the runtimes for anyone working in the checkout too.
cat > mise.toml <<'EOF'
[tools]
node = "24"
bun = "latest"
EOF

# --------------------------------------------------------------- dependencies --
# CI=true keeps pnpm non-interactive. Without it, a node_modules dir left by a
# different pnpm/store state triggers a "remove and reinstall? (Y/n)" prompt
# that hangs an unattended deploy.
export CI=true
# --ignore-scripts: puppeteer/lighthouse postinstall would pull a ~200MB Chrome
# on every deploy. Modules needing a browser use CHROME_PATH (see below).
log "installing root dependencies"
pnpm install --prod --ignore-scripts

# Each mcp_modules/* is its OWN pnpm project with its own lockfile -- a root
# install does NOT reach them, and every module whose deps are missing silently
# degrades to "Could not load metadata" at boot.
log "installing module dependencies"
MOD_DIR="$APP_DIR/mcp_modules"
installed=0; skipped=0; failed=""
for m in $(ls -1 "$MOD_DIR" 2>/dev/null); do
  if [ ! -f "$MOD_DIR/$m/package.json" ]; then
    skipped=$((skipped + 1)); continue
  fi
  if (cd "$MOD_DIR/$m" && pnpm install --prod --ignore-scripts >/dev/null 2>&1); then
    installed=$((installed + 1))
  else
    failed="$failed $m"
  fi
done
log "modules: $installed installed, $skipped without package.json"
[ -n "$failed" ] && warn "module install failed:$failed"

# ------------------------------------------------------------------ systemd --
# Absolute path: systemd does not run a login shell, so mise shims are not on
# PATH. Resolve the real binary now.
RUNTIME_BIN="$(mise which "$RUNTIME")"
[ -x "$RUNTIME_BIN" ] || die "runtime binary not executable: $RUNTIME_BIN"

UNIT=/etc/systemd/system/$SERVICE.service
UNIT_TMP="$(mktemp)"
cat > "$UNIT_TMP" <<EOF
[Unit]
Description=Profullstack MCP Server
Documentation=https://github.com/profullstack/mcp-server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=$APP_DIR
ExecStart=$RUNTIME_BIN $APP_DIR/index.js
Restart=always
RestartSec=5

Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=HOST=127.0.0.1
Environment=LOG_LEVEL=info
Environment=CORS_ENABLED=true
Environment=CORS_ORIGINS=*
Environment=RATE_LIMIT_ENABLED=true
Environment=RATE_LIMIT_MAX=100
Environment=RATE_LIMIT_WINDOW_MS=900000
Environment=MODULES_AUTOLOAD=true

StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectKernelTunables=true
ProtectControlGroups=true
RestrictSUIDSGID=true

[Install]
WantedBy=multi-user.target
EOF

# ProtectHome is deliberately NOT set: the app lives under /home/$USER.
if ! sudo cmp -s "$UNIT_TMP" "$UNIT" 2>/dev/null; then
  log "writing $UNIT"
  sudo cp "$UNIT_TMP" "$UNIT"
  sudo systemctl daemon-reload
fi
rm -f "$UNIT_TMP"
sudo systemctl enable "$SERVICE" >/dev/null 2>&1 || true

# -------------------------------------------------------------------- nginx --
VHOST=/etc/nginx/sites-available/$DOMAIN
VHOST_TMP="$(mktemp)"
# HTTP only here. certbot --nginx appends the TLS server block and the redirect
# in place, and rewriting this file unconditionally would undo that -- so the
# file is only written when it does not already exist.
cat > "$VHOST_TMP" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    access_log /var/log/nginx/$DOMAIN.access.log;
    error_log  /var/log/nginx/$DOMAIN.error.log;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host              \$host;
        proxy_set_header X-Real-IP         \$remote_addr;
        proxy_set_header X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # MCP streams over SSE; buffering would hold responses back.
        proxy_set_header Upgrade    \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
EOF

if [ ! -f "$VHOST" ]; then
  log "writing $VHOST"
  sudo cp "$VHOST_TMP" "$VHOST"
fi
rm -f "$VHOST_TMP"
sudo ln -sfn "$VHOST" "/etc/nginx/sites-enabled/$DOMAIN"

if sudo nginx -t >/dev/null 2>&1; then
  sudo systemctl reload nginx
  log "nginx reloaded"
else
  sudo nginx -t || true
  die "nginx config test failed"
fi

# --------------------------------------------------------------------- TLS --
# Only attempt issuance once the public DNS actually points at this host,
# otherwise the HTTP-01 challenge fails and certbot rate-limits us.
if sudo test -d "/etc/letsencrypt/live/$DOMAIN"; then
  log "TLS certificate already present for $DOMAIN"
else
  MY_IP="$(curl -fsS -m 10 https://api.ipify.org 2>/dev/null || true)"
  DNS_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}' || true)"
  if [ -n "$MY_IP" ] && [ "$DNS_IP" = "$MY_IP" ]; then
    log "DNS points here ($DNS_IP); requesting certificate"
    sudo certbot --nginx -d "$DOMAIN" \
      --non-interactive --agree-tos -m "$CERT_EMAIL" --redirect || warn "certbot failed"
  else
    warn "skipping TLS: $DOMAIN resolves to '${DNS_IP:-nothing}', this host is '${MY_IP:-unknown}'"
    warn "point the A record at $MY_IP, then re-run this script to get the cert"
  fi
fi

# ------------------------------------------------------------------ restart --
log "restarting $SERVICE"
sudo systemctl restart "$SERVICE"

ok=""
for _ in $(seq 1 30); do
  sleep 1
  if curl -fsS -m 3 "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then ok=1; break; fi
done

if [ -z "$ok" ]; then
  sudo systemctl status "$SERVICE" --no-pager -n 20 || true
  die "service did not become healthy on 127.0.0.1:$PORT"
fi

MODULES="$(curl -fsS -m 10 "http://127.0.0.1:$PORT/" | node -e \
  'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).modules.length)}catch{console.log("?")}})')"

log "healthy: v$VERSION @ $COMMIT, runtime $RUNTIME, $MODULES modules"
