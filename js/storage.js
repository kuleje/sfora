// Storage and state persistence module
class StorageManager {
    constructor(state, logger) {
        this.state = state;
        this.log = logger;
        this.storageKey = 'taskSorterState';
    }

    // Save state to localStorage
    saveState() {
        try {
            const serializedState = this.state.getSerializableState();
            localStorage.setItem(this.storageKey, JSON.stringify(serializedState));
            return true;
        } catch (error) {
            this.log(`Error saving state: ${error.message}`);
            return false;
        }
    }

    // Load state from localStorage
    loadState() {
        try {
            this.log('Checking for saved state...');
            const savedState = localStorage.getItem(this.storageKey);
            
            if (!savedState) {
                this.log('No saved state found.');
                return null;
            }

            this.log('Saved state found. Loading...');
            const parsedState = JSON.parse(savedState);
            this.state.loadSerializedState(parsedState);
            
            return parsedState;
        } catch (error) {
            this.log(`Error loading state: ${error.message}`);
            return null;
        }
    }

    // Clear saved state
    clearState() {
        try {
            localStorage.removeItem(this.storageKey);
            this.log('Saved state cleared.');
            return true;
        } catch (error) {
            this.log(`Error clearing state: ${error.message}`);
            return false;
        }
    }

    // Check if saved state exists
    hasSavedState() {
        return localStorage.getItem(this.storageKey) !== null;
    }

    // Get storage info
    getStorageInfo() {
        const savedState = localStorage.getItem(this.storageKey);
        if (!savedState) {
            return { exists: false, size: 0 };
        }

        return {
            exists: true,
            size: savedState.length,
            sizeKB: Math.round(savedState.length / 1024 * 100) / 100
        };
    }

    // Auto-save functionality
    enableAutoSave(intervalMs = 5000) {
        this.autoSaveInterval = setInterval(() => {
            this.saveState();
        }, intervalMs);
    }

    // Disable auto-save
    disableAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    // Export state as JSON file
    exportState() {
        try {
            const serializedState = this.state.getSerializableState();
            const dataStr = JSON.stringify(serializedState, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `task-sorter-state-${new Date().toISOString().slice(0, 10)}.json`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            return true;
        } catch (error) {
            this.log(`Error exporting state: ${error.message}`);
            return false;
        }
    }

    // Import state from JSON file
    importState(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('No file provided'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedState = JSON.parse(e.target.result);
                    this.state.loadSerializedState(importedState);
                    this.saveState(); // Save to localStorage
                    resolve(importedState);
                } catch (error) {
                    reject(new Error(`Error importing state: ${error.message}`));
                }
            };
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    }

    // Backup current state before major operations
    createBackup() {
        const backupKey = `${this.storageKey}_backup_${Date.now()}`;
        const currentState = localStorage.getItem(this.storageKey);
        
        if (currentState) {
            localStorage.setItem(backupKey, currentState);
            this.log('State backup created');
            return backupKey;
        }
        
        return null;
    }

    // Restore from backup
    restoreFromBackup(backupKey) {
        try {
            const backupState = localStorage.getItem(backupKey);
            if (backupState) {
                localStorage.setItem(this.storageKey, backupState);
                const parsedState = JSON.parse(backupState);
                this.state.loadSerializedState(parsedState);
                this.log('State restored from backup');
                return true;
            }
            return false;
        } catch (error) {
            this.log(`Error restoring from backup: ${error.message}`);
            return false;
        }
    }

    // List available backups
    listBackups() {
        const backups = [];
        const backupPrefix = `${this.storageKey}_backup_`;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(backupPrefix)) {
                const timestamp = key.substring(backupPrefix.length);
                backups.push({
                    key: key,
                    timestamp: parseInt(timestamp),
                    date: new Date(parseInt(timestamp))
                });
            }
        }
        
        return backups.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Clean old backups (keep only last N)
    cleanOldBackups(keepCount = 5) {
        const backups = this.listBackups();
        const toRemove = backups.slice(keepCount);
        
        toRemove.forEach(backup => {
            localStorage.removeItem(backup.key);
        });
        
        this.log(`Cleaned ${toRemove.length} old backups`);
        return toRemove.length;
    }

    // Get storage usage statistics
    getStorageStats() {
        const stats = {
            totalKeys: 0,
            totalSize: 0,
            appKeys: 0,
            appSize: 0,
            backupKeys: 0,
            backupSize: 0
        };

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            
            stats.totalKeys++;
            stats.totalSize += key.length + value.length;
            
            if (key === this.storageKey) {
                stats.appKeys++;
                stats.appSize += key.length + value.length;
            } else if (key.startsWith(`${this.storageKey}_backup_`)) {
                stats.backupKeys++;
                stats.backupSize += key.length + value.length;
            }
        }

        return stats;
    }

    // Validate stored state
    validateState(state = null) {
        try {
            const stateToValidate = state || JSON.parse(localStorage.getItem(this.storageKey));
            
            if (!stateToValidate) {
                return { valid: false, error: 'No state to validate' };
            }

            // Check required fields
            const requiredFields = ['allTasks', 'sortState', 'columnMapping'];
            for (const field of requiredFields) {
                if (!stateToValidate.hasOwnProperty(field)) {
                    return { valid: false, error: `Missing required field: ${field}` };
                }
            }

            // Validate data types
            if (!Array.isArray(stateToValidate.allTasks)) {
                return { valid: false, error: 'allTasks must be an array' };
            }

            if (typeof stateToValidate.sortState !== 'object') {
                return { valid: false, error: 'sortState must be an object' };
            }

            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // Repair corrupted state
    repairState() {
        try {
            const validation = this.validateState();
            if (validation.valid) {
                return { repaired: false, message: 'State is already valid' };
            }

            // Try to restore from backup
            const backups = this.listBackups();
            for (const backup of backups) {
                const backupValidation = this.validateState(JSON.parse(localStorage.getItem(backup.key)));
                if (backupValidation.valid) {
                    this.restoreFromBackup(backup.key);
                    return { repaired: true, message: `Restored from backup: ${backup.date.toISOString()}` };
                }
            }

            // If no valid backup, reset to initial state
            this.clearState();
            this.state.reset();
            return { repaired: true, message: 'Reset to initial state' };
        } catch (error) {
            return { repaired: false, error: error.message };
        }
    }
}

// Export for use in other modules
window.StorageManager = StorageManager;