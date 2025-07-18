// Quarterly status management module
class QuarterlyStatus {
    constructor() {
        this.currentDate = new Date();
        this.currentYear = this.currentDate.getFullYear();
        this.currentQuarter = this.getCurrentQuarter();
        this.defaultQuarters = 4;
        this.defaultTasksPerQuarter = 5;
        
        // Define quarter colors using Notion color scheme
        this.quarterColors = {
            'q1': '#a4c2f4', // Quarter 1 - Light blue
            'q2': '#1bbc9c', // Quarter 2 - Teal
            'q3': '#f9d900', // Quarter 3 - Yellow
            'q4': '#e8912d', // Quarter 4 - Orange
            'far future': '#d3d3d3', // Far Future - Light gray
            'task proposal': '#f06ab0', // Task proposal - Pink
            'recurring tasks': '#6813e0', // Recurring tasks - Purple
            'in progress': '#22fdeb', // In progress - Cyan
            'abandoned': '#667684', // Abandoned/discarded - Dark gray
            'done': '#e25d5d', // Done (To Inspection) - Red
            'closed': '#71bb66' // Closed in quarter - Green
        };
        
        // Track deleted quarters to allow recreation
        this.deletedQuarters = new Set();
    }
    
    getCurrentQuarter() {
        const month = this.currentDate.getMonth() + 1; // getMonth() returns 0-11
        return Math.ceil(month / 3);
    }
    
    getQuarterName(quarter, year) {
        return `q${quarter} - ${year}`;
    }
    
    getNextQuarter(quarter, year) {
        if (quarter === 4) {
            return { quarter: 1, year: year + 1 };
        } else {
            return { quarter: quarter + 1, year: year };
        }
    }
    
    generateQuarterSequence(numberOfQuarters = this.defaultQuarters) {
        const quarters = [];
        let currentQ = this.currentQuarter;
        let currentY = this.currentYear;
        let quartersChecked = 0;
        
        // Generate quarters, but don't auto-fill beyond the intended sequence
        while (quartersChecked < numberOfQuarters) {
            const quarterName = this.getQuarterName(currentQ, currentY);
            
            // Only add if not deleted
            if (!this.deletedQuarters.has(quarterName)) {
                quarters.push({
                    name: quarterName,
                    quarter: currentQ,
                    year: currentY,
                    color: this.quarterColors[`q${currentQ}`],
                    type: 'quarter'
                });
            }
            
            quartersChecked++;
            const next = this.getNextQuarter(currentQ, currentY);
            currentQ = next.quarter;
            currentY = next.year;
        }
        
        // Add "far future" as the final catch-all
        quarters.push({
            name: 'far future',
            quarter: null,
            year: null,
            color: this.quarterColors['far future'],
            type: 'far_future'
        });
        
        return quarters;
    }
    
    distributeTasksAcrossQuarters(tasks, tasksPerQuarter = this.defaultTasksPerQuarter, numberOfQuarters = this.defaultQuarters) {
        const quarters = this.generateQuarterSequence(numberOfQuarters);
        const distribution = new Map();
        
        // Initialize distribution map
        quarters.forEach(quarter => {
            distribution.set(quarter.name, {
                ...quarter,
                tasks: []
            });
        });
        
        // Group tasks by assignee first
        const tasksByAssignee = new Map();
        tasks.forEach(task => {
            const assignee = task.assignee || 'Unassigned';
            if (!tasksByAssignee.has(assignee)) {
                tasksByAssignee.set(assignee, []);
            }
            tasksByAssignee.get(assignee).push(task);
        });
        
        // Distribute tasks for each assignee
        tasksByAssignee.forEach((assigneeTasks, assignee) => {
            this.distributeTasksForAssignee(assigneeTasks, distribution, tasksPerQuarter, numberOfQuarters);
        });
        
        return distribution;
    }
    
    distributeTasksWithCustomCounts(tasks, taskCounts) {
        const quarters = this.generateQuarterSequence();
        const distribution = new Map();
        
        // Initialize distribution map
        quarters.forEach(quarter => {
            distribution.set(quarter.name, {
                ...quarter,
                tasks: []
            });
        });
        
        // Group tasks by assignee first
        const tasksByAssignee = new Map();
        tasks.forEach(task => {
            const assignee = task.assignee || 'Unassigned';
            if (!tasksByAssignee.has(assignee)) {
                tasksByAssignee.set(assignee, []);
            }
            tasksByAssignee.get(assignee).push(task);
        });
        
        // Distribute tasks for each assignee
        tasksByAssignee.forEach((assigneeTasks, assignee) => {
            this.distributeTasksForAssigneeWithCustomCounts(assigneeTasks, distribution, taskCounts);
        });
        
        return distribution;
    }
    
    distributeTasksForAssigneeWithCustomCounts(tasks, distribution, taskCounts) {
        const quarters = this.generateQuarterSequence();
        let taskIndex = 0;
        
        // Get the statuses in order (excluding "far future")
        const statusSequence = quarters.slice(0, -1); // Remove "far future"
        
        for (let quarterIndex = 0; quarterIndex < statusSequence.length; quarterIndex++) {
            const quarter = statusSequence[quarterIndex];
            const quarterData = distribution.get(quarter.name);
            const tasksForThisQuarter = taskCounts.get(quarter.name) || 5;
            
            // Determine how many tasks to assign to this quarter
            let tasksToAssign = tasksForThisQuarter;
            
            // Handle tie-breaking: if we hit a tied group, assign the whole group to the later quarter
            let endIndex = Math.min(taskIndex + tasksToAssign, tasks.length);
            
            // Check if we're breaking a tie group
            if (endIndex < tasks.length && taskIndex > 0) {
                const currentTask = tasks[endIndex - 1];
                const nextTask = tasks[endIndex];
                
                // If tasks have the same rank (tied), move the boundary
                if (currentTask.rank === nextTask.rank) {
                    // Move all tied tasks to the next quarter
                    while (endIndex > taskIndex && tasks[endIndex - 1].rank === nextTask.rank) {
                        endIndex--;
                    }
                }
            }
            
            // Assign tasks to this quarter
            for (let i = taskIndex; i < endIndex; i++) {
                quarterData.tasks.push(tasks[i]);
            }
            
            taskIndex = endIndex;
            
            // If we've assigned all tasks, break
            if (taskIndex >= tasks.length) {
                break;
            }
        }
        
        // Assign remaining tasks to "far future"
        const farFutureData = distribution.get('far future');
        for (let i = taskIndex; i < tasks.length; i++) {
            farFutureData.tasks.push(tasks[i]);
        }
    }
    
    distributeTasksForAssignee(tasks, distribution, tasksPerQuarter, numberOfQuarters) {
        const quarters = this.generateQuarterSequence(numberOfQuarters);
        let taskIndex = 0;
        
        for (let quarterIndex = 0; quarterIndex < quarters.length - 1; quarterIndex++) {
            const quarter = quarters[quarterIndex];
            const quarterData = distribution.get(quarter.name);
            
            // Determine how many tasks to assign to this quarter
            let tasksToAssign = tasksPerQuarter;
            const remainingTasks = tasks.length - taskIndex;
            const remainingQuarters = quarters.length - 1 - quarterIndex; // -1 to exclude "far future"
            
            // If we're in the last regular quarter, assign all remaining tasks that fit
            if (quarterIndex === quarters.length - 2) {
                tasksToAssign = remainingTasks;
            }
            
            // Handle tie-breaking: if we hit a tied group, assign the whole group to the later quarter
            let endIndex = Math.min(taskIndex + tasksToAssign, tasks.length);
            
            // Check if we're breaking a tie group
            if (endIndex < tasks.length && taskIndex > 0) {
                const currentTask = tasks[endIndex - 1];
                const nextTask = tasks[endIndex];
                
                // If tasks have the same rank (tied), move the boundary
                if (currentTask.rank === nextTask.rank) {
                    // Move all tied tasks to the next quarter
                    while (endIndex > taskIndex && tasks[endIndex - 1].rank === nextTask.rank) {
                        endIndex--;
                    }
                }
            }
            
            // Assign tasks to this quarter
            for (let i = taskIndex; i < endIndex; i++) {
                quarterData.tasks.push(tasks[i]);
            }
            
            taskIndex = endIndex;
            
            // If we've assigned all tasks, break
            if (taskIndex >= tasks.length) {
                break;
            }
        }
        
        // Assign remaining tasks to "far future"
        const farFutureData = distribution.get('far future');
        for (let i = taskIndex; i < tasks.length; i++) {
            farFutureData.tasks.push(tasks[i]);
        }
    }
    
    getQuarterColor(quarterName) {
        // Handle special status names
        if (this.quarterColors[quarterName]) {
            return this.quarterColors[quarterName];
        }
        
        // Handle quarter names like "q1 - 2024"
        const match = quarterName.match(/q(\d+)/);
        if (match) {
            const quarter = match[1];
            return this.quarterColors[`q${quarter}`];
        }
        
        return '#333333'; // default color
    }
    
    // Get appropriate text color based on background color
    getTextColor(backgroundColor) {
        // Light backgrounds that need dark text
        const lightColors = [
            '#a4c2f4', // Q1 - Light blue
            '#f9d900', // Q3 - Yellow
            '#d3d3d3', // Far Future - Light gray
            '#f06ab0', // Task proposal - Pink
            '#22fdeb'  // In progress - Cyan
        ];
        
        // Check if this is a light color that needs dark text
        if (lightColors.includes(backgroundColor.toLowerCase())) {
            return '#000000'; // Black text
        }
        
        return '#ffffff'; // White text for dark backgrounds
    }
    
    addQuarter(currentQuarters) {
        // Find the last regular quarter (before "far future")
        let lastQuarter = null;
        let lastYear = null;
        
        for (let i = 0; i < currentQuarters.length; i++) {
            const quarter = currentQuarters[i];
            if (quarter.name === 'far future') {
                break;
            }
            lastQuarter = quarter.quarter;
            lastYear = quarter.year;
        }
        
        if (lastQuarter && lastYear) {
            const next = this.getNextQuarter(lastQuarter, lastYear);
            const newQuarter = {
                name: this.getQuarterName(next.quarter, next.year),
                quarter: next.quarter,
                year: next.year,
                color: this.quarterColors[`q${next.quarter}`],
                tasks: []
            };
            
            // Insert before "far future"
            currentQuarters.splice(currentQuarters.length - 1, 0, newQuarter);
            return newQuarter;
        }
        
        return null;
    }
    
    exportQuarterlyData(distribution) {
        const data = [];
        
        distribution.forEach((quarterData, quarterName) => {
            quarterData.tasks.forEach(task => {
                data.push({
                    rank: task.rank,
                    quarter_status: quarterName,
                    assignee: task.assignee,
                    task_name: task.name,
                    task_id: task.id,
                    ...task.task.data
                });
            });
        });
        
        return data;
    }
    
    // Add next quarter in sequence
    addNextQuarter() {
        const currentQuarterName = this.getQuarterName(this.currentQuarter, this.currentYear);
        
        // First, try to recreate deleted quarters (except current quarter)
        // Find the first deleted quarter that's not the current quarter
        const currentSequence = this.generateQuarterSequence(this.defaultQuarters);
        
        // Check if there are any deleted quarters we should recreate
        let recreatedQuarter = null;
        let quarterToCheck = this.currentQuarter;
        let yearToCheck = this.currentYear;
        
        // Look through potential quarters to find deleted ones to recreate
        for (let i = 0; i < 20; i++) { // Check up to 20 quarters ahead
            const quarterName = this.getQuarterName(quarterToCheck, yearToCheck);
            
            // Skip current quarter - we don't recreate it
            if (quarterName !== currentQuarterName && this.deletedQuarters.has(quarterName)) {
                // Found a deleted quarter to recreate
                this.deletedQuarters.delete(quarterName);
                recreatedQuarter = quarterName;
                break;
            }
            
            const next = this.getNextQuarter(quarterToCheck, yearToCheck);
            quarterToCheck = next.quarter;
            yearToCheck = next.year;
        }
        
        // If no deleted quarter to recreate, increase the default quarters count
        if (!recreatedQuarter) {
            this.defaultQuarters += 1;
        }
        
        return recreatedQuarter;
    }
    
    // Delete a quarter
    deleteQuarter(statusName) {
        // Check if it's a quarter status
        const match = statusName.match(/^q(\d+) - (\d+)$/);
        if (match) {
            // Mark as deleted (allow deletion of any quarter, including current)
            this.deletedQuarters.add(statusName);
            return true;
        }
        return false;
    }
    
}

// Export for use in other modules
window.QuarterlyStatus = QuarterlyStatus;