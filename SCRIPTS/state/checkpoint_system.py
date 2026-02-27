# PRISM Automation Toolkit - Checkpoint System
# Version: 1.0.0
# Created: 2026-01-23
#
# Save/restore checkpoints for work-in-progress recovery.
# Part of Toolkit 4: State Management

import sys
import json
import shutil
import hashlib
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import PATHS
from core.logger import setup_logger
from core.utils import timestamp, save_json


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class FileCheckpoint:
    """Checkpoint data for a single file."""
    filepath: str
    checksum: str
    size: int
    modified: str


@dataclass
class Checkpoint:
    """Complete checkpoint of work state."""
    checkpoint_id: str
    created: str
    session_id: str
    description: str
    files: List[FileCheckpoint] = field(default_factory=list)
    state_snapshot: Dict[str, Any] = field(default_factory=dict)
    notes: str = ""


# =============================================================================
# CHECKPOINT SYSTEM CLASS
# =============================================================================

class CheckpointSystem:
    """Save and restore checkpoints for work-in-progress recovery."""
    
    CHECKPOINT_DIR = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CHECKPOINTS")
    STATE_FILE = Path(r"C:\PRISM REBUILD (UPLOAD TO BOX OCCASSIONALLY)\CURRENT_STATE.json")
    MAX_CHECKPOINTS = 50
    
    def __init__(self):
        self.logger = setup_logger('checkpoint_system')
        self.CHECKPOINT_DIR.mkdir(exist_ok=True)
    
    def create(self, session_id: str, description: str, 
               files: List[Path] = None, notes: str = "") -> Checkpoint:
        """
        Create a new checkpoint.
        
        Args:
            session_id: Current session ID
            description: What this checkpoint captures
            files: List of files to include (checksums only)
            notes: Additional notes
            
        Returns:
            Created Checkpoint
        """
        checkpoint_id = f"CP_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        checkpoint_path = self.CHECKPOINT_DIR / checkpoint_id
        checkpoint_path.mkdir(exist_ok=True)
        
        checkpoint = Checkpoint(
            checkpoint_id=checkpoint_id,
            created=timestamp(),
            session_id=session_id,
            description=description,
            notes=notes
        )
        
        # Capture file checksums
        if files:
            for filepath in files:
                if filepath.exists():
                    fc = FileCheckpoint(
                        filepath=str(filepath),
                        checksum=self._calculate_checksum(filepath),
                        size=filepath.stat().st_size,
                        modified=datetime.fromtimestamp(filepath.stat().st_mtime).isoformat()
                    )
                    checkpoint.files.append(fc)
        
        # Capture state snapshot
        if self.STATE_FILE.exists():
            try:
                checkpoint.state_snapshot = json.loads(
                    self.STATE_FILE.read_text(encoding='utf-8')
                )
                # Also copy state file to checkpoint
                shutil.copy2(self.STATE_FILE, checkpoint_path / 'CURRENT_STATE.json')
            except:
                pass
        
        # Save checkpoint metadata
        self._save_checkpoint(checkpoint, checkpoint_path)
        
        # Cleanup old checkpoints
        self._cleanup_old_checkpoints()
        
        self.logger.info(f"Created checkpoint: {checkpoint_id}")
        return checkpoint
    
    def restore(self, checkpoint_id: str, restore_state: bool = True) -> bool:
        """
        Restore from a checkpoint.
        
        Args:
            checkpoint_id: ID of checkpoint to restore
            restore_state: Whether to restore CURRENT_STATE.json
            
        Returns:
            True if successful
        """
        checkpoint_path = self.CHECKPOINT_DIR / checkpoint_id
        
        if not checkpoint_path.exists():
            self.logger.error(f"Checkpoint not found: {checkpoint_id}")
            return False
        
        try:
            # Restore state file if requested
            if restore_state:
                state_backup = checkpoint_path / 'CURRENT_STATE.json'
                if state_backup.exists():
                    # Backup current state first
                    if self.STATE_FILE.exists():
                        backup_name = f"CURRENT_STATE_before_restore_{timestamp()}.json"
                        shutil.copy2(self.STATE_FILE, self.STATE_FILE.parent / backup_name)
                    
                    # Restore
                    shutil.copy2(state_backup, self.STATE_FILE)
                    self.logger.info(f"Restored state from {checkpoint_id}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error restoring checkpoint: {e}")
            return False
    
    def list_checkpoints(self, limit: int = 20) -> List[Dict]:
        """List available checkpoints."""
        checkpoints = []
        
        for cp_dir in sorted(self.CHECKPOINT_DIR.iterdir(), reverse=True):
            if cp_dir.is_dir() and cp_dir.name.startswith('CP_'):
                meta_file = cp_dir / 'checkpoint.json'
                if meta_file.exists():
                    try:
                        data = json.loads(meta_file.read_text(encoding='utf-8'))
                        checkpoints.append({
                            'id': data.get('checkpoint_id'),
                            'created': data.get('created'),
                            'session': data.get('session_id'),
                            'description': data.get('description'),
                            'files': len(data.get('files', []))
                        })
                    except:
                        pass
            
            if len(checkpoints) >= limit:
                break
        
        return checkpoints
    
    def get_checkpoint(self, checkpoint_id: str) -> Optional[Checkpoint]:
        """Load a checkpoint's metadata."""
        checkpoint_path = self.CHECKPOINT_DIR / checkpoint_id
        meta_file = checkpoint_path / 'checkpoint.json'
        
        if not meta_file.exists():
            return None
        
        try:
            data = json.loads(meta_file.read_text(encoding='utf-8'))
            return Checkpoint(
                checkpoint_id=data['checkpoint_id'],
                created=data['created'],
                session_id=data['session_id'],
                description=data['description'],
                files=[FileCheckpoint(**f) for f in data.get('files', [])],
                state_snapshot=data.get('state_snapshot', {}),
                notes=data.get('notes', '')
            )
        except Exception as e:
            self.logger.error(f"Error loading checkpoint: {e}")
            return None
    
    def delete(self, checkpoint_id: str) -> bool:
        """Delete a checkpoint."""
        checkpoint_path = self.CHECKPOINT_DIR / checkpoint_id
        
        if not checkpoint_path.exists():
            return False
        
        try:
            shutil.rmtree(checkpoint_path)
            self.logger.info(f"Deleted checkpoint: {checkpoint_id}")
            return True
        except Exception as e:
            self.logger.error(f"Error deleting checkpoint: {e}")
            return False
    
    def verify(self, checkpoint_id: str) -> Dict[str, List[str]]:
        """
        Verify files against checkpoint.
        
        Returns:
            Dict with 'changed', 'missing', 'ok' lists
        """
        checkpoint = self.get_checkpoint(checkpoint_id)
        if not checkpoint:
            return {'error': ['Checkpoint not found']}
        
        result = {'changed': [], 'missing': [], 'ok': []}
        
        for fc in checkpoint.files:
            filepath = Path(fc.filepath)
            
            if not filepath.exists():
                result['missing'].append(fc.filepath)
            else:
                current_checksum = self._calculate_checksum(filepath)
                if current_checksum != fc.checksum:
                    result['changed'].append(fc.filepath)
                else:
                    result['ok'].append(fc.filepath)
        
        return result
    
    def _calculate_checksum(self, filepath: Path) -> str:
        """Calculate MD5 checksum of a file."""
        hash_md5 = hashlib.md5()
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    def _save_checkpoint(self, checkpoint: Checkpoint, checkpoint_path: Path):
        """Save checkpoint metadata."""
        data = {
            'checkpoint_id': checkpoint.checkpoint_id,
            'created': checkpoint.created,
            'session_id': checkpoint.session_id,
            'description': checkpoint.description,
            'files': [
                {
                    'filepath': f.filepath,
                    'checksum': f.checksum,
                    'size': f.size,
                    'modified': f.modified
                }
                for f in checkpoint.files
            ],
            'state_snapshot': checkpoint.state_snapshot,
            'notes': checkpoint.notes
        }
        save_json(data, checkpoint_path / 'checkpoint.json')
    
    def _cleanup_old_checkpoints(self):
        """Remove old checkpoints beyond MAX_CHECKPOINTS."""
        checkpoints = sorted(
            [d for d in self.CHECKPOINT_DIR.iterdir() if d.is_dir() and d.name.startswith('CP_')],
            reverse=True
        )
        
        for old_cp in checkpoints[self.MAX_CHECKPOINTS:]:
            try:
                shutil.rmtree(old_cp)
                self.logger.info(f"Removed old checkpoint: {old_cp.name}")
            except:
                pass
    
    def quick_save(self, session_id: str) -> str:
        """Quick save current state."""
        cp = self.create(session_id, f"Quick save from {session_id}")
        return cp.checkpoint_id


# =============================================================================
# CLI INTERFACE
# =============================================================================

def main():
    """CLI for checkpoint system."""
    import argparse
    
    parser = argparse.ArgumentParser(description='PRISM Checkpoint System')
    parser.add_argument('action', choices=['list', 'create', 'restore', 'verify', 'delete'])
    parser.add_argument('--id', type=str, help='Checkpoint ID')
    parser.add_argument('--session', type=str, help='Session ID')
    parser.add_argument('--desc', type=str, default='Manual checkpoint')
    
    args = parser.parse_args()
    
    system = CheckpointSystem()
    
    if args.action == 'list':
        checkpoints = system.list_checkpoints()
        print(f"{'ID':<25} {'Created':<20} {'Session':<15} {'Description'}")
        print("-" * 80)
        for cp in checkpoints:
            print(f"{cp['id']:<25} {cp['created'][:19]:<20} {cp['session']:<15} {cp['description'][:30]}")
    
    elif args.action == 'create' and args.session:
        cp = system.create(args.session, args.desc)
        print(f"Created checkpoint: {cp.checkpoint_id}")
    
    elif args.action == 'restore' and args.id:
        if system.restore(args.id):
            print(f"Restored from: {args.id}")
        else:
            print("Restore failed")
    
    elif args.action == 'verify' and args.id:
        result = system.verify(args.id)
        print(f"OK: {len(result.get('ok', []))} files")
        print(f"Changed: {len(result.get('changed', []))} files")
        print(f"Missing: {len(result.get('missing', []))} files")
    
    elif args.action == 'delete' and args.id:
        if system.delete(args.id):
            print(f"Deleted: {args.id}")


if __name__ == "__main__":
    main()
