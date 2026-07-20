#!/bin/sh
set -u

request_file="/opt/siheung/state/waf-reload-request.json"
status_file="/opt/siheung/state/waf-reload-status.json"
last_revision=""

write_status() {
  revision="$1"
  status="$2"
  message="$3"
  temporary="${status_file}.tmp"
  printf '{"revision":"%s","status":"%s","message":"%s"}\n' \
    "$revision" "$status" "$message" > "$temporary"
  mv "$temporary" "$status_file"
}

while true; do
  revision="$(sed -n 's/.*"revision":"\([0-9a-f]\{64\}\)".*/\1/p' "$request_file" 2>/dev/null || true)"
  if [ -n "$revision" ] && [ "$revision" != "$last_revision" ]; then
    if nginx -t >/tmp/siheung-nginx-test.log 2>&1 && nginx -s reload; then
      write_status "$revision" "reloaded" "Nginx reloaded successfully."
      echo "Reloaded Nginx for WAF revision $revision."
    else
      message="$(tr '\n' ' ' </tmp/siheung-nginx-test.log | sed 's/["\\]/_/g' | cut -c1-500)"
      write_status "$revision" "failed" "$message"
      echo "Rejected WAF revision $revision." >&2
    fi
    last_revision="$revision"
  fi
  sleep 1
done
