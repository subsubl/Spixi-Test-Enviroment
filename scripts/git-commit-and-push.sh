#!/usr/bin/env bash
MSG=${1:-"chore: update"}
FORCE=${2:-""}

echo "Staging all changes..."
git add -A

if ! git commit -m "$MSG"; then
  echo "No changes to commit or commit failed."
fi

echo "Pulling and rebasing from origin/main..."
git pull --rebase origin main || { echo "pull failed"; exit 1; }

echo "Pushing to origin/main..."
if [ "$FORCE" = "--force" ] || [ "$FORCE" = "-f" ]; then
  git push origin main --force
else
  git push origin main
fi

echo "Done."