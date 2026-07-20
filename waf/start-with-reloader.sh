#!/bin/sh
set -eu

sh /opt/siheung/reload-on-change.sh &
exec /docker-entrypoint.sh "$@"
