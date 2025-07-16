// Sorting algorithm and comparison logic module
class SortingEngine {
    constructor(state, logger) {
        this.state = state;
        this.log = logger;
    }

    // Continue the binary insertion sort
    continueSort() {
        this.log('Continuing sort...');
        
        if (this.state.sortState.unSorted.length === 0 && this.state.sortState.currentItem === null) {
            this.state.sortState.done = true;
            this.log('Sort complete.');
            return { done: true };
        }

        if (!this.state.sortState.currentItem) {
            this.state.sortState.currentItem = this.state.sortState.unSorted.shift();
            this.state.sortState.searchBounds.low = 0;
            this.state.sortState.searchBounds.high = this.state.sortState.sortedGroups.length - 1;
            this.log(`New item to sort: ${this.state.sortState.currentItem}`);
        }

        const { low, high } = this.state.sortState.searchBounds;

        if (low > high) {
            this.log(`Placing item ${this.state.sortState.currentItem} at index ${low}`);
            const currentGroupId = this.state.taskToGroup.get(this.state.sortState.currentItem);
            this.state.sortState.sortedGroups.splice(low, 0, currentGroupId);
            this.state.sortState.currentItem = null;
            return { done: false, needsComparison: false };
        } else {
            const mid = Math.floor((low + high) / 2);
            const itemA_id = this.state.sortState.currentItem;
            const midGroupId = this.state.sortState.sortedGroups[mid];
            
            if (!midGroupId || !this.state.rankGroups.has(midGroupId)) {
                this.log(`Error: Invalid group ${midGroupId} at index ${mid}`);
                return { done: false, needsComparison: false, error: 'Invalid group' };
            }
            
            const itemB_id = this.state.rankGroups.get(midGroupId)[0];
            this.log(`Comparing item ${itemA_id} with item ${itemB_id} (from group ${midGroupId})`);
            
            return { 
                done: false, 
                needsComparison: true, 
                comparison: { taskA: itemA_id, taskB: itemB_id } 
            };
        }
    }

    // Record the user's choice and update sort state
    recordChoice(choice) {
        const { low, high } = this.state.sortState.searchBounds;
        const mid = Math.floor((low + high) / 2);
        
        // Save state before making changes for undo
        const beforeState = {
            sortState: JSON.parse(JSON.stringify(this.state.sortState)),
            rankGroups: new Map(this.state.rankGroups),
            taskToGroup: new Map(this.state.taskToGroup),
            choice: choice
        };

        if (choice === 'A') { // currentItem is more important
            this.state.sortState.searchBounds.high = mid - 1;
            this.state.addToHistory(beforeState);
            return this.continueSort();
        } else if (choice === 'B') { // currentItem is less important
            this.state.sortState.searchBounds.low = mid + 1;
            this.state.addToHistory(beforeState);
            return this.continueSort();
        } else if (choice === 'Equal') { // tasks are equal priority
            const midGroupId = this.state.sortState.sortedGroups[mid];
            const existingTaskId = this.state.rankGroups.get(midGroupId)[0];
            this.handleEqualRank(this.state.sortState.currentItem, existingTaskId, mid);
            this.state.addToHistory(beforeState);
            return this.continueSort();
        }
    }

    // Handle equal rank (merge groups)
    handleEqualRank(currentTaskId, existingTaskId, insertIndex) {
        this.log(`Marking tasks ${currentTaskId} and ${existingTaskId} as equal rank`);
        
        this.state.mergeGroups(currentTaskId, existingTaskId);
        this.state.sortState.currentItem = null;
    }

    // Calculate progress information
    calculateProgress() {
        // Calculate active tasks (excluding removed ones)
        const activeTasks = this.state.allTasks.length - this.state.removedTasks.size;
        const sortedCount = this.state.sortState.sortedGroups.length;
        const totalSortedTasks = this.state.sortState.sortedGroups.reduce((count, groupId) => 
            count + this.state.rankGroups.get(groupId).length, 0);
        const progress = activeTasks > 0 ? (totalSortedTasks / activeTasks) * 100 : 0;
        
        // Calculate remaining tasks
        const remainingTasks = this.state.sortState.unSorted.length + (this.state.sortState.currentItem ? 1 : 0);
        
        // Determine if we should show estimation or calibration message
        const totalChoicesMade = this.state.actionHistory.filter(action => 
            action.choice === 'A' || action.choice === 'B' || action.choice === 'Equal').length;
        
        let estimatedRemaining;
        let showEstimation = true;
        
        // Show "calculating..." for first few comparisons or when we have very few sorted items
        if (totalChoicesMade < 3 || sortedCount < 3) {
            showEstimation = false;
            estimatedRemaining = 0;
        } else {
            // Use actual comparison data for better estimation
            const avgComparisonsPerTask = totalChoicesMade / Math.max(1, totalSortedTasks);
            
            // Adjust for binary search efficiency (gets more efficient as sorted list grows)
            const efficiencyFactor = Math.log2(sortedCount + 1) / Math.max(1, avgComparisonsPerTask);
            const adjustedComparisons = Math.max(1, Math.ceil(Math.log2(sortedCount + 1) * efficiencyFactor));
            
            estimatedRemaining = remainingTasks * adjustedComparisons;
        }
        
        return {
            progress: Math.round(progress),
            sortedTasks: totalSortedTasks,
            totalTasks: activeTasks,
            estimatedRemaining: estimatedRemaining,
            showEstimation: showEstimation,
            totalChoicesMade: totalChoicesMade
        };
    }

    // Undo last choice
    undoLastChoice() {
        const lastState = this.state.undoLastAction();
        if (!lastState) {
            this.log('No actions to undo');
            return null;
        }
        
        if (lastState.action === 'remove') {
            this.log(`Undoing remove task: ${lastState.taskId}`);
        } else if (lastState.choice) {
            this.log(`Undoing last choice: ${lastState.choice}`);
        } else {
            this.log('Undoing last action');
        }
        
        return lastState;
    }

    // Check if undo is available
    canUndo() {
        return this.state.actionHistory.length > 0;
    }

    // Get undo button text
    getUndoButtonText() {
        if (this.canUndo()) {
            const lastAction = this.state.actionHistory[this.state.actionHistory.length - 1];
            if (lastAction.action === 'remove') {
                return `Undo Remove Task (${this.state.actionHistory.length})`;
            } else if (lastAction.choice) {
                return `Undo Last Choice (${this.state.actionHistory.length})`;
            }
            return `Undo Last Action (${this.state.actionHistory.length})`;
        }
        return 'Undo Last Choice';
    }

    // Remove task from sorting process
    removeTaskFromSorting(taskId) {
        this.log(`Removing task ${taskId} from sorting`);
        
        // Save state before removing for undo
        const beforeState = {
            sortState: JSON.parse(JSON.stringify(this.state.sortState)),
            rankGroups: new Map(this.state.rankGroups),
            taskToGroup: new Map(this.state.taskToGroup),
            removedTasks: new Set(this.state.removedTasks),
            action: 'remove',
            taskId: taskId
        };
        
        this.state.removeTaskFromSorting(taskId);
        this.state.addToHistory(beforeState);
        
        // Check if sorting is complete
        if (this.state.sortState.unSorted.length === 0 && this.state.sortState.currentItem === null) {
            this.state.sortState.done = true;
            return { done: true };
        }
        
        return this.continueSort();
    }

    // Restore task to sorting
    restoreTaskToSorting(taskId) {
        this.log(`Restoring task ${taskId} to sorting`);
        this.state.restoreTaskToSorting(taskId);
        
        // Mark sorting as not done since we added a task back
        this.state.sortState.done = false;
        
        return { restored: true };
    }

    // Get current comparison data
    getCurrentComparison() {
        if (!this.state.sortState.currentItem) {
            return null;
        }

        const { low, high } = this.state.sortState.searchBounds;
        if (low > high) {
            return null;
        }

        const mid = Math.floor((low + high) / 2);
        const taskA_id = this.state.sortState.currentItem;
        const midGroupId = this.state.sortState.sortedGroups[mid];
        const taskB_id = this.state.rankGroups.get(midGroupId)[0];

        return {
            taskA: taskA_id,
            taskB: taskB_id,
            taskAGroup: this.state.rankGroups.get(this.state.taskToGroup.get(taskA_id)),
            taskBGroup: this.state.rankGroups.get(midGroupId)
        };
    }

    // Check if sorting is complete
    isSortingComplete() {
        return this.state.sortState.done;
    }

    // Get sorted results
    getSortedResults() {
        const results = [];
        
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                results.push({
                    task: task,
                    rank: rank,
                    groupSize: tasks.length,
                    comment: this.state.taskComments[taskId] || ''
                });
            });
        });
        
        return results;
    }

    // Get removed tasks
    getRemovedTasks() {
        const results = [];
        
        this.state.removedTasks.forEach(taskId => {
            const task = this.state.allTasks.find(t => t.id === taskId);
            results.push({
                task: task,
                comment: this.state.taskComments[taskId] || ''
            });
        });
        
        return results;
    }
}

// Export for use in other modules
window.SortingEngine = SortingEngine;