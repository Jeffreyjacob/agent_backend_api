#!/bin/sh
set -e

echo "Starting worker..."
exec "$@"
# $@ = "node dist/worker.js"
# worker never runs migrations
# only the API runs migrations to avoid race conditions
# if both api and worker ran migrations at the same time
# they would conflict with each other