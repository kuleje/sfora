// Quarterly status UI module
class UIQuarterly {
    constructor(state, csvHandler, logger) {
        this.state = state;
        this.csvHandler = csvHandler;
        this.log = logger;
        this.quarterlyStatus = new QuarterlyStatus();
    }

    // Render quarterly status interface in tab
    renderQuarterlyStatusInTab(container) {
        // Create the quarterly status interface
        const quarterlyContainer = document.createElement('div');
        quarterlyContainer.className = 'quarterly-status-container';
        
        // Create status management section
        const statusManagementSection = document.createElement('div');
        statusManagementSection.className = 'status-management';
        
        // Status title
        const statusTitle = document.createElement('h3');
        statusTitle.className = 'status-title';
        statusTitle.textContent = 'Quarterly Statuses';
        statusManagementSection.appendChild(statusTitle);
        
        // Existing statuses section
        const existingStatusesSection = document.createElement('div');
        existingStatusesSection.className = 'existing-statuses';
        existingStatusesSection.id = 'existing-statuses';
        
        // Get current statuses from quarterly status manager
        const currentStatuses = this.quarterlyStatus.generateQuarterSequence();
        
        // Render existing statuses
        currentStatuses.forEach((status, index) => {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'status-item';
            statusDiv.setAttribute('data-status-name', status.name);
            
            statusDiv.innerHTML = `
                <div class="status-info">
                    <span class="status-name" style="color: ${status.color}">${status.name}</span>
                    <span class="status-color-indicator" style="background-color: ${status.color}"></span>
                </div>
                <div class="status-controls">
                    ${status.name !== 'far future' ? `
                        <label for="tasks-count-${index}">Tasks:</label>
                        <input type="number" id="tasks-count-${index}" class="tasks-count-input" value="5" min="1" max="50" data-status="${status.name}" />
                        <button class="delete-status-btn" data-status="${status.name}">Delete</button>
                    ` : `
                        <span class="overflow-indicator">Overflow</span>
                    `}
                </div>
            `;
            
            existingStatusesSection.appendChild(statusDiv);
        });
        
        statusManagementSection.appendChild(existingStatusesSection);
        
        // Add new quarter section
        const addQuarterSection = document.createElement('div');
        addQuarterSection.className = 'add-status-section';
        addQuarterSection.innerHTML = `
            <button id="add-new-quarter-btn" class="add-new-status-btn">Add Next Quarter</button>
        `;
        
        statusManagementSection.appendChild(addQuarterSection);
        
        // Create apply section
        const applySection = document.createElement('div');
        applySection.className = 'apply-section';
        applySection.innerHTML = `
            <button id="apply-quarterly-btn" class="apply-quarterly-btn">Apply Quarterly Status</button>
        `;
        
        statusManagementSection.appendChild(applySection);
        
        // Create results section
        const resultsSection = document.createElement('div');
        resultsSection.className = 'quarterly-results';
        resultsSection.innerHTML = `
            <p class="quarterly-instructions">
                Configure the number of tasks for each status above, then click "Apply Quarterly Status" to distribute tasks.
                Tasks will be grouped by assignee and distributed based on their priority ranking.
            </p>
        `;
        
        quarterlyContainer.appendChild(statusManagementSection);
        quarterlyContainer.appendChild(resultsSection);
        container.appendChild(quarterlyContainer);
        
        // Add event listeners
        this.attachQuarterlyStatusEventListeners();
    }
    
    // Attach event listeners for quarterly status functionality
    attachQuarterlyStatusEventListeners() {
        const applyBtn = document.getElementById('apply-quarterly-btn');
        const addNewQuarterBtn = document.getElementById('add-new-quarter-btn');
        const existingStatusesSection = document.getElementById('existing-statuses');
        
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.applyQuarterlyStatus();
            });
        }
        
        if (addNewQuarterBtn) {
            addNewQuarterBtn.addEventListener('click', () => {
                this.addNextQuarter();
            });
        }
        
        // Add event listeners for delete buttons and task count inputs
        if (existingStatusesSection) {
            existingStatusesSection.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-status-btn')) {
                    const statusName = e.target.getAttribute('data-status');
                    this.deleteStatus(statusName);
                }
            });
            
            existingStatusesSection.addEventListener('change', (e) => {
                if (e.target.classList.contains('tasks-count-input')) {
                    // Auto-apply when task counts change
                    this.applyQuarterlyStatus();
                }
            });
        }
    }
    
    // Apply quarterly status to tasks
    applyQuarterlyStatus() {
        const resultsSection = document.querySelector('.quarterly-results');
        
        if (!resultsSection) return;
        
        // Get task counts from each status input
        const taskCounts = new Map();
        const taskCountInputs = document.querySelectorAll('.tasks-count-input');
        
        taskCountInputs.forEach(input => {
            const statusName = input.getAttribute('data-status');
            const count = parseInt(input.value) || 5;
            taskCounts.set(statusName, count);
        });
        
        // Prepare tasks data for distribution
        const tasks = [];
        let rank = 1;
        
        this.state.sortState.sortedGroups.forEach((groupId) => {
            const groupTasks = this.state.rankGroups.get(groupId);
            
            groupTasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
                
                tasks.push({
                    id: taskId,
                    name: task.data[this.state.columnMapping.name] || 'Unnamed task',
                    assignee: assignee,
                    rank: rank,
                    task: task
                });
            });
            
            rank++;
        });
        
        // Distribute tasks across statuses with custom task counts
        const distribution = this.quarterlyStatus.distributeTasksWithCustomCounts(tasks, taskCounts);
        
        // Render the distribution
        this.renderQuarterlyDistribution(resultsSection, distribution);
    }
    
    // Add next quarter
    addNextQuarter() {
        this.quarterlyStatus.addNextQuarter();
        this.refreshQuarterlyStatusTab();
    }
    
    // Delete quarter
    deleteStatus(statusName) {
        if (!confirm(`Are you sure you want to delete the quarter "${statusName}"?`)) {
            return;
        }
        
        const deleted = this.quarterlyStatus.deleteQuarter(statusName);
        
        if (deleted) {
            // Re-render the quarterly status tab
            this.refreshQuarterlyStatusTab();
        }
    }
    
    // Refresh the quarterly status tab
    refreshQuarterlyStatusTab() {
        const container = document.querySelector('.quarterly-status-container');
        if (container) {
            const parent = container.parentElement;
            container.remove();
            this.renderQuarterlyStatusInTab(parent);
        }
    }
    
    // Render quarterly distribution
    renderQuarterlyDistribution(container, distribution) {
        container.innerHTML = '';
        
        const distributionDiv = document.createElement('div');
        distributionDiv.className = 'quarterly-distribution';
        
        // Render each quarter
        distribution.forEach((quarterData, quarterName) => {
            const quarterDiv = document.createElement('div');
            quarterDiv.className = 'quarter-section';
            quarterDiv.style.borderLeft = `4px solid ${quarterData.color}`;
            
            const quarterHeader = document.createElement('div');
            quarterHeader.className = 'quarter-header';
            quarterHeader.innerHTML = `
                <h3 class="quarter-title" style="color: ${quarterData.color}">
                    ${quarterName}
                    <span class="quarter-count">(${quarterData.tasks.length} tasks)</span>
                </h3>
            `;
            
            quarterDiv.appendChild(quarterHeader);
            
            // Group tasks by assignee within this quarter
            const tasksByAssignee = new Map();
            quarterData.tasks.forEach(task => {
                const assignee = task.assignee;
                if (!tasksByAssignee.has(assignee)) {
                    tasksByAssignee.set(assignee, []);
                }
                tasksByAssignee.get(assignee).push(task);
            });
            
            // Sort assignees (Unassigned last)
            const sortedAssignees = Array.from(tasksByAssignee.keys()).sort((a, b) => {
                if (a === 'Unassigned') return 1;
                if (b === 'Unassigned') return -1;
                return a.localeCompare(b);
            });
            
            // Render tasks grouped by assignee
            sortedAssignees.forEach(assignee => {
                const assigneeDiv = document.createElement('div');
                assigneeDiv.className = 'assignee-group-quarterly';
                
                const assigneeHeader = document.createElement('div');
                assigneeHeader.className = 'assignee-header-quarterly';
                assigneeHeader.innerHTML = `
                    ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee}
                    <span class="assignee-count">(${tasksByAssignee.get(assignee).length} tasks)</span>
                `;
                
                assigneeDiv.appendChild(assigneeHeader);
                
                const tasksList = document.createElement('div');
                tasksList.className = 'tasks-list-quarterly';
                
                tasksByAssignee.get(assignee).forEach(task => {
                    const taskDiv = document.createElement('div');
                    taskDiv.className = 'task-item-quarterly';
                    taskDiv.innerHTML = `
                        <span class="task-rank">#${task.rank}</span>
                        <span class="task-name">${task.name}</span>
                        <span class="task-status" style="background-color: ${quarterData.color}">${quarterName}</span>
                    `;
                    tasksList.appendChild(taskDiv);
                });
                
                assigneeDiv.appendChild(tasksList);
                quarterDiv.appendChild(assigneeDiv);
            });
            
            distributionDiv.appendChild(quarterDiv);
        });
        
        container.appendChild(distributionDiv);
        
        // Add export button
        const exportDiv = document.createElement('div');
        exportDiv.className = 'quarterly-export';
        exportDiv.innerHTML = `
            <button id="export-quarterly-btn" class="export-quarterly-btn">Export with Quarterly Status</button>
        `;
        container.appendChild(exportDiv);
        
        // Add export event listener
        const exportBtn = document.getElementById('export-quarterly-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportQuarterlyStatus(distribution);
            });
        }
    }
    
    // Export quarterly status
    exportQuarterlyStatus(distribution) {
        const data = this.quarterlyStatus.exportQuarterlyData(distribution);
        const csv = this.csvHandler.generateCSVFromData(data);
        this.csvHandler.downloadCSV(csv, 'tasks_with_quarterly_status.csv');
    }
}

// Export for use in other modules
window.UIQuarterly = UIQuarterly;