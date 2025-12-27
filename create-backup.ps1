# PowerShell backup script for Reward Project
# This script creates a complete backup of the reward-project directory

$SourceDir = "\\wsl.localhost\Ubuntu-20.04\home\van\reward-project"
$BackupDir = "\\wsl.localhost\Ubuntu-20.04\home\van\Reward Project backup"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Creating backup of Reward Project" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Source: $SourceDir"
Write-Host "Backup: $BackupDir"
Write-Host "Timestamp: $Timestamp"
Write-Host ""

# Check if source directory exists
if (-not (Test-Path $SourceDir)) {
    Write-Host "ERROR: Source directory does not exist: $SourceDir" -ForegroundColor Red
    exit 1
}

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    Write-Host "Creating backup directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Copy the entire project (excluding node_modules and .git)
Write-Host "Copying files (this may take a few minutes)..." -ForegroundColor Yellow

$excludeDirs = @('node_modules', '.git')
Get-ChildItem -Path $SourceDir -Recurse | Where-Object {
    $relativePath = $_.FullName.Substring($SourceDir.Length + 1)
    $pathParts = $relativePath -split [IO.Path]::DirectorySeparatorChar
    -not ($excludeDirs | Where-Object { $pathParts -contains $_ })
} | ForEach-Object {
    $destPath = $_.FullName.Replace($SourceDir, $BackupDir)
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item -Path $_.FullName -Destination $destPath -Force
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Backup completed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Backup location: $BackupDir"
Write-Host ""
Write-Host "Backup includes:" -ForegroundColor Cyan
Write-Host "  - All source code files"
Write-Host "  - Configuration files"
Write-Host "  - Documentation"
Write-Host ""
Write-Host "Excluded:" -ForegroundColor Yellow
Write-Host "  - node_modules (can be reinstalled)"
Write-Host "  - .git (to save space)"
Write-Host ""
Write-Host "To restore from backup, copy files back from:" -ForegroundColor Cyan
Write-Host "  $BackupDir"
Write-Host ""

