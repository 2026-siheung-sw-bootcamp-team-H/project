#!/bin/sh
set -eu

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <api-domain> <vercel-origin> <certbot-email>" >&2
  exit 1
fi

repository_root="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
template_file="${repository_root}/.env.production.example"
output_file="${repository_root}/.env.production"

if [ -e "$output_file" ]; then
  echo "$output_file already exists. Refusing to overwrite it." >&2
  exit 1
fi

api_domain="$1"
vercel_origin="${2%/}"
certbot_email="$3"

case "$api_domain" in
  http://*|https://*|*/*)
    echo "api-domain must be a hostname without protocol or path." >&2
    exit 1
    ;;
esac

case "$vercel_origin" in
  https://*) ;;
  *)
    echo "vercel-origin must start with https://." >&2
    exit 1
    ;;
esac

random_hex() {
  openssl rand -hex "$1"
}

cp "$template_file" "$output_file"
sed -i \
  -e "s|^EDGE_SERVER_NAME=.*|EDGE_SERVER_NAME=${api_domain}|" \
  -e "s|^CLIENT_ORIGIN=.*|CLIENT_ORIGIN=${vercel_origin}|" \
  -e "s|^CERTBOT_EMAIL=.*|CERTBOT_EMAIL=${certbot_email}|" \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(random_hex 24)|" \
  -e "s|^JWT_SECRET=.*|JWT_SECRET=$(random_hex 32)|" \
  -e "s|^HMAC_SECRET=.*|HMAC_SECRET=$(random_hex 32)|" \
  -e "s|^TELEMETRY_TOKEN=.*|TELEMETRY_TOKEN=$(random_hex 32)|" \
  -e "s|^ZAP_API_KEY=.*|ZAP_API_KEY=$(random_hex 32)|" \
  "$output_file"
chmod 600 "$output_file"

echo "Created $output_file with generated infrastructure secrets."
echo "Edit OPENAI_API_KEY in that file before starting the backend."
