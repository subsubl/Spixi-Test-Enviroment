param(
    [string]$Message = "chore: update",
    [switch]$Force
)

# Staging all changes
Write-Host "Staging all changes..."
git add -A

# Commit
try {
    git commit -m $Message
} catch {
    Write-Host "No changes to commit or commit failed: $_"
}

# Pull latest and rebase
Write-Host "Pulling and rebasing from origin/main..."
git pull --rebase origin main

# Push to origin/main
Write-Host "Pushing to origin/main..."
if ($Force) {
    git push origin main --force
} else {
    git push origin main
}

Write-Host "Done."