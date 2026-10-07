#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js não encontrado. Instale em https://nodejs.org (versão LTS) e rode de novo."
    exit 1
fi
exec node "$DIR/scripts/setup.mjs" "$@"
