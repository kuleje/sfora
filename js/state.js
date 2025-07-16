// State management module for task sorting application
class AppState {
    constructor() {
        this.allTasks = [];
        this.sortState = {};
        this.rankGroups = new Map();
        this.taskToGroup = new Map();
        this.columnMapping = { id: '', name: '', description: '', assignee: '' };
        this.taskUrlBaseValue = 'https://app.clickup.com/t/4540126/';
        this.rawData = [];
        this.taskComments = {};
        this.removedTasks = new Set();
        this.debugMode = false;
        this.actionHistory = [];
    }

    // Initialize groups for all tasks
    initializeGroups() {
        this.rankGroups.clear();
        this.taskToGroup.clear();
        this.allTasks.forEach(task => {
            const groupId = `single_${task.id}`;
            this.rankGroups.set(groupId, [task.id]);
            this.taskToGroup.set(task.id, groupId);
        });
    }

    // Get task by ID
    getTask(taskId) {
        return this.allTasks.find(t => t.id === taskId);
    }

    // Get group by ID
    getGroup(groupId) {
        return this.rankGroups.get(groupId);
    }

    // Get group ID for task
    getTaskGroupId(taskId) {
        return this.taskToGroup.get(taskId);
    }

    // Calculate rank for task
    calculateRank(taskId) {
        const groupId = this.taskToGroup.get(taskId);
        const groupIndex = this.sortState.sortedGroups.indexOf(groupId);
        return groupIndex + 1;
    }

    // Merge two groups (for equal rank)
    mergeGroups(currentTaskId, existingTaskId) {
        const currentGroupId = this.taskToGroup.get(currentTaskId);
        const existingGroupId = this.taskToGroup.get(existingTaskId);
        
        const mergedTasks = [...this.rankGroups.get(currentGroupId), ...this.rankGroups.get(existingGroupId)];
        const newGroupId = `merged_${Date.now()}`;
        
        // Create new merged group
        this.rankGroups.set(newGroupId, mergedTasks);
        
        // Update task-to-group mapping
        mergedTasks.forEach(taskId => {
            this.taskToGroup.set(taskId, newGroupId);
        });
        
        // Clean up old groups
        this.rankGroups.delete(currentGroupId);
        this.rankGroups.delete(existingGroupId);
        
        // Replace the existing group in sortedGroups
        const existingGroupIndex = this.sortState.sortedGroups.indexOf(existingGroupId);
        this.sortState.sortedGroups[existingGroupIndex] = newGroupId;
        
        return newGroupId;
    }

    // Remove task from sorting
    removeTaskFromSorting(taskId) {
        this.removedTasks.add(taskId);
        
        // Remove from current item if it's being sorted
        if (this.sortState.currentItem === taskId) {
            this.sortState.currentItem = null;
        }
        
        // Remove from unsorted list
        const unSortedIndex = this.sortState.unSorted.indexOf(taskId);
        if (unSortedIndex > -1) {
            this.sortState.unSorted.splice(unSortedIndex, 1);
        }
        
        // Remove from groups
        const groupId = this.taskToGroup.get(taskId);
        if (groupId && this.rankGroups.has(groupId)) {
            const group = this.rankGroups.get(groupId);
            const taskIndex = group.indexOf(taskId);
            if (taskIndex > -1) {
                group.splice(taskIndex, 1);
            }
            
            // If group is now empty, remove it entirely
            if (group.length === 0) {
                this.rankGroups.delete(groupId);
                const sortedIndex = this.sortState.sortedGroups.indexOf(groupId);
                if (sortedIndex > -1) {
                    this.sortState.sortedGroups.splice(sortedIndex, 1);
                }
            }
            
            this.taskToGroup.delete(taskId);
        }
    }

    // Restore task to sorting
    restoreTaskToSorting(taskId) {
        this.removedTasks.delete(taskId);
        this.sortState.unSorted.push(taskId);
        
        // Recreate individual group
        const groupId = `single_${taskId}`;
        this.rankGroups.set(groupId, [taskId]);
        this.taskToGroup.set(taskId, groupId);
    }

    // Add action to history for undo
    addToHistory(beforeState) {
        this.actionHistory.push({
            sortState: JSON.parse(JSON.stringify(beforeState.sortState)),
            rankGroups: new Map(beforeState.rankGroups),
            taskToGroup: new Map(beforeState.taskToGroup),
            choice: beforeState.choice,
            timestamp: Date.now()
        });
    }

    // Undo last action
    undoLastAction() {
        if (this.actionHistory.length === 0) {
            return null;
        }
        
        const lastState = this.actionHistory.pop();
        this.sortState = lastState.sortState;
        this.rankGroups = lastState.rankGroups;
        this.taskToGroup = lastState.taskToGroup;
        
        return lastState;
    }

    // Reset state
    reset() {
        this.allTasks = [];
        this.sortState = {};
        this.rankGroups.clear();
        this.taskToGroup.clear();
        this.columnMapping = { id: '', name: '', description: '', assignee: '' };
        this.taskUrlBaseValue = 'https://app.clickup.com/t/4540126/';
        this.rawData = [];
        this.taskComments = {};
        this.removedTasks = new Set();
        this.actionHistory = [];
    }

    // Get state for serialization
    getSerializableState() {
        return {
            allTasks: this.allTasks,
            sortState: this.sortState,
            columnMapping: this.columnMapping,
            taskUrlBase: this.taskUrlBaseValue,
            rawData: this.rawData,
            taskComments: this.taskComments,
            removedTasks: Array.from(this.removedTasks),
            rankGroups: Array.from(this.rankGroups.entries()),
            taskToGroup: Array.from(this.taskToGroup.entries()),
            actionHistory: this.actionHistory
        };
    }

    // Load state from serialized data
    loadSerializedState(state) {
        this.allTasks = state.allTasks;
        this.sortState = state.sortState;
        this.columnMapping = state.columnMapping || { id: '', name: '', description: '', assignee: '' };
        this.taskUrlBaseValue = state.taskUrlBase || 'https://app.clickup.com/t/4540126/';
        this.rawData = state.rawData;
        this.taskComments = state.taskComments || {};
        this.removedTasks = new Set(state.removedTasks || []);
        this.actionHistory = state.actionHistory || [];
        
        // Load rank groups
        if (state.rankGroups && state.taskToGroup) {
            this.rankGroups = new Map(state.rankGroups);
            this.taskToGroup = new Map(state.taskToGroup);
        } else {
            // Initialize groups if not saved (backwards compatibility)
            this.initializeGroups();
        }
    }
}

// Create global state instance
const appState = new AppState();

// Export for use in other modules
window.appState = appState;