#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="$(dirname "$BACKEND_DIR")"
SERVICE_USER="$(id -un)"
NODE_BIN="$(command -v node)"

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  echo "Falta $BACKEND_DIR/.env. Créalo antes de instalar el servicio." >&2
  exit 1
fi

sudo tee /etc/systemd/system/tienda-backend.service >/dev/null <<EOF
[Unit]
Description=Tienda en línea - API Node.js
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$BACKEND_DIR
EnvironmentFile=$BACKEND_DIR/.env
Environment=NODE_ENV=production
ExecStart=$NODE_BIN src/main.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now tienda-backend
sudo systemctl --no-pager --full status tienda-backend
