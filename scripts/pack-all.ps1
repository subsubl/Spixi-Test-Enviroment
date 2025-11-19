param(
    [string]$AppsDir = "$(Split-Path -Parent $PSScriptRoot)\apps",
    [string]$OutputDir = "$(Split-Path -Parent $PSScriptRoot)\packed"
)

if (-not (Test-Path $OutputDir)) { New-Item -Path $OutputDir -ItemType Directory | Out-Null }

Get-ChildItem -Directory $AppsDir | ForEach-Object {
    Write-Host "Packing app: $($_.Name)"
    & node (Join-Path (Split-Path -Parent $PSScriptRoot) 'pack-app.js') $_.FullName $OutputDir
}

Write-Host "All pack attempts finished."
