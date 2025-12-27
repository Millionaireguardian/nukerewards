#!/usr/bin/env python3
"""
Backup script for Reward Project
Creates a complete backup of the reward-project directory
"""

import os
import shutil
import sys
from pathlib import Path
from datetime import datetime

def create_backup():
    # Define paths
    source_dir = Path("/home/van/reward-project")
    backup_dir = Path("/home/van/Reward Project backup")
    
    # Exclude these directories
    exclude_dirs = {'node_modules', '.git', '__pycache__', '.next', 'dist', 'build'}
    
    print("=" * 50)
    print("Creating backup of Reward Project")
    print("=" * 50)
    print(f"Source: {source_dir}")
    print(f"Backup: {backup_dir}")
    print(f"Timestamp: {datetime.now().strftime('%Y%m%d_%H%M%S')}")
    print()
    
    # Check if source directory exists
    if not source_dir.exists():
        print(f"ERROR: Source directory does not exist: {source_dir}")
        sys.exit(1)
    
    # Create backup directory if it doesn't exist
    backup_dir.mkdir(parents=True, exist_ok=True)
    print(f"Backup directory ready: {backup_dir}")
    print()
    
    # Copy files
    print("Copying files (this may take a few minutes)...")
    copied_files = 0
    copied_dirs = 0
    
    for root, dirs, files in os.walk(source_dir):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        # Calculate relative path
        rel_path = os.path.relpath(root, source_dir)
        if rel_path == '.':
            dest_root = backup_dir
        else:
            dest_root = backup_dir / rel_path
        
        # Create destination directory
        dest_root.mkdir(parents=True, exist_ok=True)
        if rel_path != '.':
            copied_dirs += 1
        
        # Copy files
        for file in files:
            src_file = Path(root) / file
            dest_file = dest_root / file
            try:
                shutil.copy2(src_file, dest_file)
                copied_files += 1
                if copied_files % 100 == 0:
                    print(f"  Copied {copied_files} files...", end='\r')
            except Exception as e:
                print(f"\nWarning: Could not copy {src_file}: {e}")
    
    print()
    print()
    print("=" * 50)
    print("Backup completed successfully!")
    print("=" * 50)
    print(f"Backup location: {backup_dir}")
    print(f"Files copied: {copied_files}")
    print(f"Directories created: {copied_dirs}")
    print()
    print("Backup includes:")
    print("  - All source code files")
    print("  - Configuration files")
    print("  - Documentation")
    print()
    print("Excluded:")
    print("  - node_modules (can be reinstalled)")
    print("  - .git (to save space)")
    print("  - Other build/cache directories")
    print()
    print(f"To restore from backup, copy files back from:")
    print(f"  {backup_dir}")
    print()

if __name__ == "__main__":
    try:
        create_backup()
    except KeyboardInterrupt:
        print("\n\nBackup cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: Backup failed: {e}")
        sys.exit(1)

