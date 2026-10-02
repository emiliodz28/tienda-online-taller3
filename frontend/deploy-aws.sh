#!/usr/bin/env bash
set -euo pipefail

BACKEND_PRIVATE_IP="${1:-}"
if [[ -z "$BACKEND_PRIVATE_IP" ]]; then
  echo "Uso: bash deploy-aws.sh IP_PRIVADA_DEL_BACKEND" >&2
  exit 2
fi
if [[ ! "$BACKEND_PRIVATE_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
  echo "La IP del backend no tiene un formato IPv4 válido." >&2
  exit 2
fi

FRONTEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$FRONTEND_DIR"
npm ci
VITE_API_URL=/api npm run build

sudo install -d -o www-data -g www-data /var/www/tienda
sudo cp -r dist/. /var/www/tienda/
sudo chown -R www-data:www-data /var/www/tienda

sudo tee /etc/nginx/sites-available/tienda-online >/dev/null <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/tienda;
    index index.html;

    location /api/ {
        proxy_pass http://$BACKEND_PRIVATE_IP:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sfn /etc/nginx/sites-available/tienda-online /etc/nginx/sites-enabled/tienda-online
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx || sudo systemctl restart nginx
echo "Frontend desplegado. Abre http://IP_PUBLICA_FRONT/ en el navegador."
