#!/usr/bin/env bash
#
# Deploy @profullstack/mcp-server to the netcup host.
#
# Streams bin/provision.sh over ssh and runs it as the app user, so the
# provisioning logic that executes is always the one from THIS checkout --
# no need to update anything on the server first, and a first-time host is
# bootstrapped by the same path as an update.
#
#   ./bin/deploy.sh
#
# Env overrides:
#   DEPLOY_HOST  target host      (default: 152.53.47.37)
#   DEPLOY_USER  ssh user         (default: anthony)
#   DEPLOY_PORT  ssh port         (default: 22)
#   APP_DIR      remote install   (default: ~/www/mcp-server)
#   BRANCH       branch to deploy (default: master)
#   DOMAIN       public hostname  (default: mcp.profullstack.com)
#   RUNTIME      bun | node       (default: bun)
#   SSH_KEY      identity file    (default: ssh-agent / ~/.ssh defaults)

set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-152.53.47.37}"
DEPLOY_USER="${DEPLOY_USER:-anthony}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
APP_DIR="${APP_DIR:-}"
BRANCH="${BRANCH:-master}"
DOMAIN="${DOMAIN:-mcp.profullstack.com}"
RUNTIME="${RUNTIME:-bun}"
SSH_KEY="${SSH_KEY:-}"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROVISION="$HERE/provision.sh"
[ -f "$PROVISION" ] || { echo "missing $PROVISION" >&2; exit 1; }

SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15 -p "$DEPLOY_PORT")
[ -n "$SSH_KEY" ] && SSH_OPTS+=(-i "$SSH_KEY" -o IdentitiesOnly=yes)

echo "==> deploying $BRANCH to $DEPLOY_USER@$DEPLOY_HOST ($DOMAIN, runtime $RUNTIME)"

# The remote env is passed explicitly: ssh does not forward these, and a
# non-login shell would not pick them up from a profile either.
ssh "${SSH_OPTS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" \
  "BRANCH='$BRANCH' DOMAIN='$DOMAIN' RUNTIME='$RUNTIME' ${APP_DIR:+APP_DIR='$APP_DIR'} bash -s" \
  < "$PROVISION"

echo "==> verifying"
if curl -fsS -m 15 --resolve "$DOMAIN:80:$DEPLOY_HOST" "http://$DOMAIN/health" >/dev/null 2>&1; then
  echo "==> $DOMAIN healthy via $DEPLOY_HOST"
else
  echo "==> WARNING: health check through nginx failed" >&2
  exit 1
fi
