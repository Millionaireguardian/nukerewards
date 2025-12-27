#!/bin/bash

# Backup script for Reward Project
# This script creates a complete backup of the reward-project directory

SOURCE_DIR="/home/van/reward-project"
BACKUP_DIR="/home/van/Reward Project backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "========================================="
echo "Creating backup of Reward Project"
echo "========================================="
echo "Source: $SOURCE_DIR"
echo "Backup: $BACKUP_DIR"
echo "Timestamp: $TIMESTAMP"
echo ""

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "ERROR: Source directory does not exist: $SOURCE_DIR"
    exit 1
fi

# Create backup directory if it doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    echo "Creating backup directory..."
    mkdir -p "$BACKUP_DIR"
fi

# Copy the entire project
echo "Copying files (this may take a few minutes)..."
rsync -av --progress --exclude 'node_modules' --exclude '.git' "$SOURCE_DIR/" "$BACKUP_DIR/" || {
    echo "rsync not available, using cp instead..."
    cp -r "$SOURCE_DIR"/* "$BACKUP_DIR/" 2>/dev/null || {
        echo "ERROR: Failed to copy files"
        exit 1
    }
}

echo ""
echo "========================================="
echo "Backup completed successfully!"
echo "========================================="
echo "Backup location: $BACKUP_DIR"
echo ""
echo "Backup includes:"
echo "  - All source code files"
echo "  - Configuration files"
echo "  - Documentation"
echo ""
echo "Excluded:"
echo "  - node_modules (can be reinstalled)"
echo "  - .git (to save space)"
echo ""
echo "To restore from backup, copy files back from:"
echo "  $BACKUP_DIR"
echo ""

