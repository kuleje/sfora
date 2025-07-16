// Debug utilities module
class DebugUtils {
    constructor(state, csvHandler, logger) {
        this.state = state;
        this.csvHandler = csvHandler;
        this.log = logger;
        this.debugMode = false;
    }

    // Check if debug mode is enabled
    checkDebugMode() {
        const urlParams = new URLSearchParams(window.location.search);
        this.debugMode = urlParams.get('debug') === 'true' || urlParams.get('debug') === 'True';
        
        if (this.debugMode) {
            this.log('Debug mode enabled');
            this.state.debugMode = true;
            return true;
        }
        
        return false;
    }

    // Apply random ranks for testing
    applyRandomRanks() {
        this.log('Applying random ranks for testing...');
        
        if (!this.state.allTasks || this.state.allTasks.length === 0) {
            alert('No tasks loaded. Please load a CSV file first.');
            return false;
        }
        
        // Reset state
        this.state.sortState = {
            sortedGroups: [],
            unSorted: [],
            currentItem: null,
            searchBounds: { low: 0, high: 0 },
            done: true
        };
        
        this.state.rankGroups.clear();
        this.state.taskToGroup.clear();
        this.state.removedTasks.clear();
        this.state.actionHistory = [];
        
        const shuffledTasks = [...this.state.allTasks].sort(() => Math.random() - 0.5);
        
        // Randomly remove 10-20% of tasks
        const removePercentage = 0.1 + Math.random() * 0.1;
        const removeCount = Math.max(1, Math.floor(shuffledTasks.length * removePercentage));
        
        this.log(`Removing ${removeCount} tasks out of ${shuffledTasks.length} total (${(removePercentage * 100).toFixed(1)}%)`);
        
        for (let i = 0; i < removeCount; i++) {
            this.state.removedTasks.add(shuffledTasks[i].id);
        }
        
        // Get remaining tasks for ranking
        const tasksToRank = shuffledTasks.filter(task => !this.state.removedTasks.has(task.id));
        
        // Create some groups (ties) - about 20% of tasks will be in groups
        const groupCount = Math.floor(tasksToRank.length * 0.2);
        const groupedTasks = new Set();
        
        // Create 2-4 groups with 2-3 tasks each
        for (let g = 0; g < Math.min(groupCount, 4); g++) {
            const groupSize = 2 + Math.floor(Math.random() * 2);
            const availableTasks = tasksToRank.filter(task => !groupedTasks.has(task.id));
            
            if (availableTasks.length < groupSize) break;
            
            const groupId = `debug_group_${g}`;
            const groupTaskIds = [];
            
            // Select random tasks for this group
            for (let i = 0; i < groupSize; i++) {
                const randomIndex = Math.floor(Math.random() * availableTasks.length);
                const task = availableTasks.splice(randomIndex, 1)[0];
                groupTaskIds.push(task.id);
                groupedTasks.add(task.id);
                this.state.taskToGroup.set(task.id, groupId);
            }
            
            this.state.rankGroups.set(groupId, groupTaskIds);
            this.state.sortState.sortedGroups.push(groupId);
        }
        
        // Create individual groups for remaining tasks
        const remainingTasks = tasksToRank.filter(task => !groupedTasks.has(task.id));
        remainingTasks.forEach(task => {
            const groupId = `single_${task.id}`;
            this.state.rankGroups.set(groupId, [task.id]);
            this.state.taskToGroup.set(task.id, groupId);
            this.state.sortState.sortedGroups.push(groupId);
        });
        
        // Shuffle the final order
        this.state.sortState.sortedGroups.sort(() => Math.random() - 0.5);
        
        // Add random comments
        this.addRandomComments();
        
        this.log(`Random ranking applied: ${this.state.sortState.sortedGroups.length} groups, ${this.state.removedTasks.size} removed tasks`);
        
        return true;
    }

    // Add random comments to tasks
    addRandomComments() {
        const commentExamples = [
            'High priority due to client requirements',
            'Blocked by external dependency',
            'Quick win - low effort, high impact',
            'Duplicate of another task',
            'Needs more investigation',
            'Critical bug fix',
            'Nice to have feature',
            'Requires design review',
            'Technical debt cleanup',
            'User requested enhancement',
            'Waiting for stakeholder approval',
            'Performance optimization needed',
            'Security vulnerability fix',
            'Mobile compatibility issue',
            'API integration required'
        ];
        
        this.state.allTasks.forEach(task => {
            if (Math.random() < 0.3) { // 30% chance of having a comment
                const randomComment = commentExamples[Math.floor(Math.random() * commentExamples.length)];
                this.state.taskComments[task.id] = randomComment;
            }
        });
    }

    // Generate debug report
    generateDebugReport() {
        const report = {
            timestamp: new Date().toISOString(),
            debugMode: this.debugMode,
            state: {
                totalTasks: this.state.allTasks.length,
                sortedGroups: this.state.sortState.sortedGroups.length,
                removedTasks: this.state.removedTasks.size,
                actionHistory: this.state.actionHistory.length,
                comments: Object.keys(this.state.taskComments).length
            },
            groups: {
                singleTaskGroups: 0,
                multiTaskGroups: 0,
                largestGroup: 0
            },
            sorting: {
                isDone: this.state.sortState.done,
                currentItem: this.state.sortState.currentItem,
                unsortedCount: this.state.sortState.unSorted.length,
                searchBounds: this.state.sortState.searchBounds
            },
            columns: this.state.columnMapping
        };

        // Analyze groups
        this.state.rankGroups.forEach(group => {
            if (group.length === 1) {
                report.groups.singleTaskGroups++;
            } else {
                report.groups.multiTaskGroups++;
            }
            if (group.length > report.groups.largestGroup) {
                report.groups.largestGroup = group.length;
            }
        });

        return report;
    }

    // Print debug report to console
    printDebugReport() {
        const report = this.generateDebugReport();
        console.group('🐛 Debug Report');
        console.log('Timestamp:', report.timestamp);
        console.log('Debug Mode:', report.debugMode);
        console.group('State');
        console.table(report.state);
        console.groupEnd();
        console.group('Groups');
        console.table(report.groups);
        console.groupEnd();
        console.group('Sorting');
        console.table(report.sorting);
        console.groupEnd();
        console.group('Column Mapping');
        console.table(report.columns);
        console.groupEnd();
        console.groupEnd();
        
        return report;
    }

    // Export debug report as JSON
    exportDebugReport() {
        const report = this.generateDebugReport();
        const dataStr = JSON.stringify(report, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `debug-report-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.log('Debug report exported');
    }

    // Validate state consistency
    validateStateConsistency() {
        const issues = [];
        
        // Check if all tasks in groups exist
        this.state.rankGroups.forEach((taskIds, groupId) => {
            taskIds.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                if (!task) {
                    issues.push(`Task ${taskId} in group ${groupId} does not exist`);
                }
            });
        });
        
        // Check if all tasks have group mappings
        this.state.allTasks.forEach(task => {
            if (!this.state.removedTasks.has(task.id)) {
                const groupId = this.state.taskToGroup.get(task.id);
                if (!groupId) {
                    issues.push(`Task ${task.id} has no group mapping`);
                } else if (!this.state.rankGroups.has(groupId)) {
                    issues.push(`Task ${task.id} mapped to non-existent group ${groupId}`);
                }
            }
        });
        
        // Check if sorted groups contain valid group IDs
        this.state.sortState.sortedGroups.forEach(groupId => {
            if (!this.state.rankGroups.has(groupId)) {
                issues.push(`Sorted groups contains invalid group ID: ${groupId}`);
            }
        });
        
        if (issues.length === 0) {
            this.log('✅ State consistency check passed');
        } else {
            this.log('❌ State consistency issues found:');
            issues.forEach(issue => this.log(`  - ${issue}`));
        }
        
        return issues;
    }

    // Performance timing utilities
    startTiming(label) {
        const key = `debug_timer_${label}`;
        performance.mark(`${key}_start`);
    }

    endTiming(label) {
        const key = `debug_timer_${label}`;
        performance.mark(`${key}_end`);
        performance.measure(key, `${key}_start`, `${key}_end`);
        
        const measure = performance.getEntriesByName(key)[0];
        this.log(`⏱️ ${label}: ${measure.duration.toFixed(2)}ms`);
        
        return measure.duration;
    }

    // Memory usage tracking
    getMemoryUsage() {
        if (performance.memory) {
            return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
        }
        return null;
    }

    // Log memory usage
    logMemoryUsage(label = 'Memory Usage') {
        const memory = this.getMemoryUsage();
        if (memory) {
            this.log(`🧠 ${label}: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB used`);
        }
    }

    // Create test data
    createTestData(count = 20) {
        const testTasks = [];
        const priorities = ['High', 'Medium', 'Low'];
        const assignees = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
        const types = ['Bug', 'Feature', 'Enhancement', 'Task'];
        
        for (let i = 0; i < count; i++) {
            testTasks.push({
                'Task ID': `TEST-${i + 1}`,
                'Task Name': `Test Task ${i + 1}`,
                'Task Content': `This is a test task description for task ${i + 1}. It contains enough content to test the display and sorting functionality.`,
                'Assignee': assignees[Math.floor(Math.random() * assignees.length)],
                'Priority': priorities[Math.floor(Math.random() * priorities.length)],
                'Type': types[Math.floor(Math.random() * types.length)]
            });
        }
        
        this.state.rawData = testTasks;
        this.state.columnMapping = {
            id: 'Task ID',
            name: 'Task Name',
            description: 'Task Content',
            assignee: 'Assignee'
        };
        
        this.log(`Created ${count} test tasks`);
        return testTasks;
    }

    // Enable debug mode programmatically
    enableDebugMode() {
        this.debugMode = true;
        this.state.debugMode = true;
        this.log('Debug mode enabled programmatically');
    }

    // Disable debug mode
    disableDebugMode() {
        this.debugMode = false;
        this.state.debugMode = false;
        this.log('Debug mode disabled');
    }
}

// Export for use in other modules
window.DebugUtils = DebugUtils;