#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

output="${1:-wiki-data/wiki.json}"
if [[ "$output" == /* || "$output" == *".."* ]]; then
  echo "La salida debe ser una ruta relativa dentro del repositorio." >&2
  exit 2
fi

sync_tmp="$(mktemp -d)"
output_tmp="${output}.tmp"
cleanup() {
  rm -rf -- "$sync_tmp"
  rm -f -- "$output_tmp"
}
trap 'cleanup' EXIT

wiki_source="$sync_tmp/wiki"
git clone --depth 1 --branch master https://github.com/ChurrOS-GNU-Linux/ChurrOS.wiki.git "$wiki_source"
wiki_commit="$(git -C "$wiki_source" rev-parse HEAD)"

mkdir -p "$(dirname "$output")"
node scripts/build-github-wiki.mjs \
  --source "$wiki_source" \
  --output "$output_tmp" \
  --repo ChurrOS-GNU-Linux/ChurrOS \
  --commit "$wiki_commit"

WIKI_SOURCE_DIR="$wiki_source" node --test tests/wiki-stable-content.test.js
WIKI_DATA_FILE="$output_tmp" WIKI_DATA_PATH="$output_tmp" node --test tests/wiki-static.test.js
mv -- "$output_tmp" "$output"

echo "Wiki sincronizada desde $wiki_commit en $output"
