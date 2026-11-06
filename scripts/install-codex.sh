#!/usr/bin/env bash
# Link the flow skills into Codex's user skills folder.
# usage: scripts/install-codex.sh     (run from anywhere, re-run after pulling to pick up new skills)
set -eu
repo=$(cd "$(dirname "$0")/.." && pwd)
dest="${CODEX_SKILLS_DIR:-$HOME/.agents/skills}"
mkdir -p "$dest"
for dir in "$repo"/skills/*/; do
  name=$(basename "$dir")
  target="$dest/$name"
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    echo "skip $name: $target exists and is not a symlink"
    continue
  fi
  ln -sfn "${dir%/}" "$target"
  echo "linked $name -> $target"
done
