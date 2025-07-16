// CSV parsing and data handling module
class CSVHandler {
    constructor(state, logger) {
        this.state = state;
        this.log = logger;
    }

    // Parse CSV file using Papa Parse
    parseCSV(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                this.log('No file selected.');
                reject(new Error('Please select a file first.'));
                return;
            }

            this.log('Parsing CSV file...');
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data.length > 0 && results.meta.fields.length > 0) {
                        this.log(`CSV parsed successfully. Found ${results.data.length} rows and ${results.meta.fields.length} columns.`);
                        this.state.rawData = results.data;
                        resolve({
                            data: results.data,
                            columns: results.meta.fields
                        });
                    } else {
                        this.log('CSV parsing failed or file is empty.');
                        reject(new Error('Could not parse CSV. Please ensure it is a valid CSV file with a header row.'));
                    }
                },
                error: (error) => {
                    this.log(`CSV parsing error: ${error.message}`);
                    reject(new Error(`An error occurred while parsing the CSV: ${error.message}`));
                }
            });
        });
    }

    // Auto-select default column mappings
    autoSelectDefaultColumns(columns) {
        const defaultMappings = {
            id: ['Task Custom ID', 'Task ID', 'ID', 'task_id', 'id'],
            name: ['Task Name', 'Name', 'Title', 'task_name', 'name', 'title'],
            description: ['Task Content', 'Description', 'Content', 'Details', 'task_content', 'description', 'content'],
            assignee: ['Assignee', 'Assigned to', 'Owner', 'Task Assignees', 'assignee', 'assigned_to', 'owner']
        };

        const mappings = {};

        // Find best match for each field
        Object.keys(defaultMappings).forEach(field => {
            for (const defaultName of defaultMappings[field]) {
                if (columns.includes(defaultName)) {
                    mappings[field] = defaultName;
                    break;
                }
            }
        });

        return mappings;
    }

    // Get preview data for a column
    getColumnPreview(column) {
        if (column && this.state.rawData.length > 0) {
            const firstValue = this.state.rawData[0][column] || '';
            return firstValue.length > 50 ? firstValue.substring(0, 50) + '...' : firstValue;
        }
        return '';
    }

    // Initialize tasks from CSV data
    initializeTasksFromCSV() {
        if (!this.state.columnMapping.name) {
            throw new Error('Please select a task name column.');
        }

        // Randomize order to avoid CSV sorting bias
        const shuffledData = [...this.state.rawData].sort(() => Math.random() - 0.5);
        this.state.allTasks = shuffledData.map((row, index) => ({ id: index, data: row }));

        // Initialize sorting state
        this.state.sortState = {
            sortedGroups: [],
            unSorted: this.state.allTasks.map(t => t.id),
            currentItem: null,
            searchBounds: { low: 0, high: 0 },
            done: false
        };

        // Initialize groups
        this.state.initializeGroups();
        this.state.actionHistory = [];

        // Move first item to sorted
        if (this.state.sortState.unSorted.length > 0) {
            const firstItem = this.state.sortState.unSorted.shift();
            const firstGroupId = this.state.taskToGroup.get(firstItem);
            this.state.sortState.sortedGroups.push(firstGroupId);
        }

        this.log('Tasks initialized from CSV data.');
    }

    // Parse assignee field (handles brackets and comma-separated values)
    parseAssignee(assigneeField) {
        if (!assigneeField) return '';
        
        // Remove brackets and parse comma-separated values
        const cleanField = assigneeField.replace(/[\[\]]/g, '').trim();
        
        if (!cleanField) return '';
        
        // Split by comma and get first assignee
        const assignees = cleanField.split(',').map(name => name.trim());
        return assignees[0] || '';
    }

    // Export tasks to CSV
    exportToCSV(includeUnsorted = false) {
        const sortedTasks = [];
        
        // Export all sorted tasks with their ranks
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const exportData = {
                    rank: rank,
                    status: 'ranked',
                    ...task.data,
                    comment: this.state.taskComments[taskId] || ''
                };
                sortedTasks.push(exportData);
            });
        });
        
        // Add removed tasks
        this.state.removedTasks.forEach(taskId => {
            const task = this.state.allTasks.find(t => t.id === taskId);
            if (task) {
                const exportData = {
                    rank: '',
                    status: 'removed',
                    ...task.data,
                    comment: this.state.taskComments[taskId] || ''
                };
                sortedTasks.push(exportData);
            }
        });

        // Add unsorted tasks if requested (for partial export)
        if (includeUnsorted) {
            // Add current item being sorted
            if (this.state.sortState.currentItem) {
                const task = this.state.allTasks.find(t => t.id === this.state.sortState.currentItem);
                sortedTasks.push({
                    rank: '',
                    status: 'in_progress',
                    ...task.data,
                    comment: this.state.taskComments[this.state.sortState.currentItem] || ''
                });
            }
            
            // Add remaining unsorted tasks
            this.state.sortState.unSorted.forEach(id => {
                const task = this.state.allTasks.find(t => t.id === id);
                sortedTasks.push({
                    rank: '',
                    status: 'unsorted',
                    ...task.data,
                    comment: this.state.taskComments[id] || ''
                });
            });
        }
        
        return Papa.unparse(sortedTasks);
    }

    // Download CSV file
    downloadCSV(csvContent, filename = 'sorted_tasks.csv') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Export for use in other modules
window.CSVHandler = CSVHandler;