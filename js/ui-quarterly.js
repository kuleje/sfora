// Quarterly status UI module
class UIQuarterly {
    constructor(state, csvHandler, logger) {
        this.state = state;
        this.csvHandler = csvHandler;
        this.log = logger;
        this.quarterlyStatus = new QuarterlyStatus();
        this.collapsedStateKey = 'taskSorter_collapsedQuarters';
        this.collapsedAssigneeStateKey = 'taskSorter_collapsedAssignees';
        this.groupingModeKey = 'taskSorter_quarterlyGroupingMode';
        
        // Initialize shared assignee color manager
        this.assigneeColorManager = new AssigneeColorManager();
    }

    // Save collapsed state to localStorage
    saveCollapsedState(collapsedQuarters) {
        try {
            localStorage.setItem(this.collapsedStateKey, JSON.stringify(collapsedQuarters));
        } catch (error) {
            this.log(`Error saving collapsed state: ${error.message}`);
        }
    }

    // Load collapsed state from localStorage
    loadCollapsedState() {
        try {
            const saved = localStorage.getItem(this.collapsedStateKey);
            return saved ? JSON.parse(saved) : []; // Default to empty array (all expanded)
        } catch (error) {
            this.log(`Error loading collapsed state: ${error.message}`);
            return [];
        }
    }

    // Toggle collapsed state of a quarter
    toggleQuarterCollapsed(quarterName) {
        const collapsedQuarters = this.loadCollapsedState();
        const index = collapsedQuarters.indexOf(quarterName);
        
        if (index === -1) {
            collapsedQuarters.push(quarterName);
        } else {
            collapsedQuarters.splice(index, 1);
        }
        
        this.saveCollapsedState(collapsedQuarters);
        return !collapsedQuarters.includes(quarterName);
    }

    // Check if a quarter is collapsed
    isQuarterCollapsed(quarterName) {
        const collapsedQuarters = this.loadCollapsedState();
        return collapsedQuarters.includes(quarterName);
    }

    // Save collapsed assignee state to localStorage
    saveCollapsedAssigneeState(collapsedAssignees) {
        try {
            localStorage.setItem(this.collapsedAssigneeStateKey, JSON.stringify(collapsedAssignees));
        } catch (error) {
            this.log(`Error saving collapsed assignee state: ${error.message}`);
        }
    }

    // Load collapsed assignee state from localStorage
    loadCollapsedAssigneeState() {
        try {
            const saved = localStorage.getItem(this.collapsedAssigneeStateKey);
            return saved ? JSON.parse(saved) : []; // Default to empty array (all expanded)
        } catch (error) {
            this.log(`Error loading collapsed assignee state: ${error.message}`);
            return [];
        }
    }

    // Toggle collapsed state of an assignee group
    toggleAssigneeCollapsed(quarterName, assigneeName) {
        const collapsedAssignees = this.loadCollapsedAssigneeState();
        const key = `${quarterName}:${assigneeName}`;
        const index = collapsedAssignees.indexOf(key);
        
        if (index === -1) {
            collapsedAssignees.push(key);
        } else {
            collapsedAssignees.splice(index, 1);
        }
        
        this.saveCollapsedAssigneeState(collapsedAssignees);
        return !collapsedAssignees.includes(key);
    }

    // Check if an assignee group is collapsed
    isAssigneeCollapsed(quarterName, assigneeName) {
        const collapsedAssignees = this.loadCollapsedAssigneeState();
        const key = `${quarterName}:${assigneeName}`;
        return collapsedAssignees.includes(key);
    }

    // Save grouping mode to localStorage
    saveGroupingMode(mode) {
        try {
            localStorage.setItem(this.groupingModeKey, mode);
        } catch (error) {
            this.log(`Error saving grouping mode: ${error.message}`);
        }
    }

    // Load grouping mode from localStorage
    loadGroupingMode() {
        try {
            return localStorage.getItem(this.groupingModeKey) || 'quarter-assignee';
        } catch (error) {
            this.log(`Error loading grouping mode: ${error.message}`);
            return 'quarter-assignee';
        }
    }

    // Get color for assignee using shared color manager
    getAssigneeColor(assigneeName) {
        return this.assigneeColorManager.getAssigneeColor(assigneeName);
    }

    // Get text color (light/dark) based on background color using shared color manager
    getTextColorForBackground(backgroundColor) {
        return this.assigneeColorManager.getTextColorForBackground(backgroundColor);
    }

    // Render quarterly status interface in tab
    renderQuarterlyStatusInTab(container) {
        // Create the quarterly status interface
        const quarterlyContainer = document.createElement('div');
        quarterlyContainer.className = 'quarterly-status-container';
        
        // Create status management section
        const statusManagementSection = document.createElement('div');
        statusManagementSection.className = 'status-management';
        
        // Status title with info icon
        const statusTitle = document.createElement('h3');
        statusTitle.className = 'status-title';
        statusTitle.innerHTML = `
            Quarterly Statuses 
            <span class="info-icon" id="quarterly-info-icon" title="Click for information about how quarters work">ℹ️</span>
        `;
        statusManagementSection.appendChild(statusTitle);
        
        // Info panel (hidden by default)
        const infoPanel = document.createElement('div');
        infoPanel.className = 'quarterly-info-panel';
        infoPanel.id = 'quarterly-info-panel';
        infoPanel.style.display = 'none';
        infoPanel.innerHTML = `
            <div class="info-panel-content">
                <h4>How Quarterly Distribution Works</h4>
                <div class="info-section">
                    <h5>📅 Quarter Generation</h5>
                    <p>Quarters start from the current quarter (auto-detected from today's date) and generate a sequence of upcoming quarters. The system always includes a "far future" bucket for overflow tasks.</p>
                </div>
                <div class="info-section">
                    <h5>🎯 Task Distribution Rules</h5>
                    <ul>
                        <li><strong>Assignee Grouping:</strong> Tasks are first grouped by assignee to ensure balanced distribution</li>
                        <li><strong>Priority Order:</strong> Within each assignee group, tasks are distributed in their priority ranking order</li>
                        <li><strong>Tie-Breaking:</strong> If tied tasks would span a quarter boundary, the entire tied group moves to the later quarter</li>
                        <li><strong>Custom Counts:</strong> Each quarter can have different task counts (default: 5 tasks per quarter)</li>
                        <li><strong>Overflow:</strong> Tasks that don't fit in regular quarters go to "far future"</li>
                    </ul>
                </div>
                <div class="info-section">
                    <h5>⚙️ Quarter Management</h5>
                    <ul>
                        <li><strong>Adding Quarters:</strong> Click "Add Next Quarter" to first recreate any deleted quarters (except the current one), then add future quarters in chronological order</li>
                        <li><strong>Deleting Quarters:</strong> Any quarter can be deleted, but the current quarter won't be automatically recreated when adding new ones (in case your plans start from the upcoming quarter)</li>
                        <li><strong>Task Counts:</strong> Adjust the number of tasks per quarter (default: 5 tasks)</li>
                        <li><strong>Grouping Views:</strong> Switch between "Quarter → Assignee" and "Assignee → Quarter" perspectives</li>
                    </ul>
                </div>
                <div class="info-section">
                    <h5>💾 Session Data</h5>
                    <p>Quarter configurations are not persisted between browser sessions. To restart with default settings, simply refresh the browser tab.</p>
                </div>
            </div>
        `;
        statusManagementSection.appendChild(infoPanel);
        
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
            
            const textColor = this.quarterlyStatus.getTextColor(status.color);
            statusDiv.innerHTML = `
                <div class="status-info">
                    <span class="status-name status-name-colored" style="background-color: ${status.color}; color: ${textColor}">${status.name}</span>
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
        
        // Add grouping toggle
        const groupingToggle = document.createElement('div');
        groupingToggle.className = 'grouping-toggle';
        const currentMode = this.loadGroupingMode();
        groupingToggle.innerHTML = `
            <div class="grouping-toggle-header">
                <span class="grouping-toggle-label">Group by:</span>
                <div class="grouping-toggle-buttons">
                    <button class="grouping-toggle-btn ${currentMode === 'quarter-assignee' ? 'active' : ''}" data-mode="quarter-assignee">
                        Quarter → Assignee
                    </button>
                    <button class="grouping-toggle-btn ${currentMode === 'assignee-quarter' ? 'active' : ''}" data-mode="assignee-quarter">
                        Assignee → Quarter
                    </button>
                </div>
            </div>
        `;
        
        resultsSection.appendChild(groupingToggle);
        
        const instructionsDiv = document.createElement('div');
        instructionsDiv.className = 'quarterly-instructions';
        instructionsDiv.innerHTML = `
            <p>Configure the number of tasks for each status above, then click "Apply Quarterly Status" to distribute tasks.
            Tasks will be grouped by assignee and distributed based on their priority ranking.</p>
        `;
        resultsSection.appendChild(instructionsDiv);
        
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
        const groupingToggle = document.querySelector('.grouping-toggle');
        
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
        
        // Add event listener for grouping toggle
        if (groupingToggle) {
            groupingToggle.addEventListener('click', (e) => {
                if (e.target.classList.contains('grouping-toggle-btn')) {
                    const mode = e.target.getAttribute('data-mode');
                    this.saveGroupingMode(mode);
                    
                    // Update button states
                    groupingToggle.querySelectorAll('.grouping-toggle-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    e.target.classList.add('active');
                    
                    // Re-render the results if they exist
                    this.applyQuarterlyStatus();
                }
            });
        }
        
        // Add event listener for info icon
        const infoIcon = document.getElementById('quarterly-info-icon');
        const infoPanel = document.getElementById('quarterly-info-panel');
        if (infoIcon && infoPanel) {
            infoIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                const isVisible = infoPanel.style.display !== 'none';
                infoPanel.style.display = isVisible ? 'none' : 'block';
                
                // Smooth animation
                if (!isVisible) {
                    infoPanel.style.opacity = '0';
                    infoPanel.style.transform = 'translateY(-10px)';
                    
                    setTimeout(() => {
                        infoPanel.style.opacity = '1';
                        infoPanel.style.transform = 'translateY(0)';
                    }, 10);
                }
            });
            
            // Close info panel when clicking outside
            document.addEventListener('click', (e) => {
                if (!infoPanel.contains(e.target) && !infoIcon.contains(e.target)) {
                    infoPanel.style.display = 'none';
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
        // Find and preserve the grouping toggle
        const existingToggle = container.querySelector('.grouping-toggle');
        const existingInstructions = container.querySelector('.quarterly-instructions');
        
        // Clear only the distribution and export sections
        const existingDistribution = container.querySelector('.quarterly-distribution');
        const existingExport = container.querySelector('.quarterly-export');
        
        if (existingDistribution) {
            existingDistribution.remove();
        }
        if (existingExport) {
            existingExport.remove();
        }
        
        const distributionDiv = document.createElement('div');
        distributionDiv.className = 'quarterly-distribution';
        
        const groupingMode = this.loadGroupingMode();
        
        if (groupingMode === 'assignee-quarter') {
            this.renderAssigneeQuarterDistribution(distributionDiv, distribution);
        } else {
            this.renderQuarterAssigneeDistribution(distributionDiv, distribution);
        }
        
        // Insert the distribution after the instructions
        if (existingInstructions) {
            existingInstructions.insertAdjacentElement('afterend', distributionDiv);
        } else {
            container.appendChild(distributionDiv);
        }
        
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
    
    // Render Quarter → Assignee distribution (original layout)
    renderQuarterAssigneeDistribution(distributionDiv, distribution) {
        // Render each quarter
        distribution.forEach((quarterData, quarterName) => {
            const quarterDiv = document.createElement('div');
            quarterDiv.className = 'quarter-section';
            quarterDiv.style.borderLeft = `4px solid ${quarterData.color}`;
            
            const quarterHeader = document.createElement('div');
            quarterHeader.className = 'quarter-header';
            const textColor = this.quarterlyStatus.getTextColor(quarterData.color);
            const isCollapsed = this.isQuarterCollapsed(quarterName);
            const chevronIcon = isCollapsed ? '▶' : '▼';
            
            quarterHeader.innerHTML = `
                <h3 class="quarter-title quarter-title-colored quarter-title-clickable" style="background-color: ${quarterData.color}; color: ${textColor}" data-quarter="${quarterName}">
                    <span class="quarter-chevron" style="transform: rotate(${isCollapsed ? '-90deg' : '0deg'})">${chevronIcon}</span>
                    ${quarterName.toUpperCase()}
                    <span class="quarter-count">(${quarterData.tasks.length} tasks)</span>
                </h3>
            `;
            
            quarterDiv.appendChild(quarterHeader);
            
            // Create content container for tasks
            const quarterContent = document.createElement('div');
            quarterContent.className = 'quarter-content';
            if (isCollapsed) {
                quarterContent.style.height = '0px';
                quarterContent.style.opacity = '0';
            }
            
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
                
                const isAssigneeCollapsed = this.isAssigneeCollapsed(quarterName, assignee);
                const chevronIcon = isAssigneeCollapsed ? '▶' : '▼';
                const assigneeColor = this.getAssigneeColor(assignee);
                const textColor = this.getTextColorForBackground(assigneeColor);
                
                const assigneeHeader = document.createElement('div');
                assigneeHeader.className = 'assignee-header-quarterly assignee-header-clickable';
                assigneeHeader.setAttribute('data-quarter', quarterName);
                assigneeHeader.setAttribute('data-assignee', assignee);
                assigneeHeader.style.backgroundColor = assigneeColor;
                assigneeHeader.style.color = textColor;
                assigneeHeader.innerHTML = `
                    <span class="assignee-chevron" style="transform: rotate(${isAssigneeCollapsed ? '-90deg' : '0deg'})">${chevronIcon}</span>
                    ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee}
                    <span class="assignee-count">(${tasksByAssignee.get(assignee).length} tasks)</span>
                `;
                
                assigneeDiv.appendChild(assigneeHeader);
                
                const tasksList = document.createElement('div');
                tasksList.className = 'tasks-list-quarterly';
                if (isAssigneeCollapsed) {
                    tasksList.style.height = '0px';
                    tasksList.style.opacity = '0';
                }
                
                tasksByAssignee.get(assignee).forEach(task => {
                    const taskDiv = document.createElement('div');
                    taskDiv.className = 'task-item-quarterly';
                    
                    // Find the global group this task belongs to and check if it's tied
                    const globalGroupId = this.state.sortState.sortedGroups.find(groupId => {
                        const tasks = this.state.rankGroups.get(groupId);
                        return tasks.includes(task.id);
                    });
                    
                    const globalTasks = this.state.rankGroups.get(globalGroupId) || [];
                    const isTied = globalTasks.length > 1;
                    const tiedClass = isTied ? ' tied' : '';
                    
                    // Calculate rank display using the same logic as other tabs
                    const globalRankIndex = this.state.sortState.sortedGroups.indexOf(globalGroupId);
                    let currentRank = 1;
                    for (let i = 0; i < globalRankIndex; i++) {
                        const prevGroupId = this.state.sortState.sortedGroups[i];
                        const prevTasks = this.state.rankGroups.get(prevGroupId) || [];
                        currentRank += prevTasks.length;
                    }
                    
                    // Get the ranking style from the UI renderer
                    const rankingStyle = window.uiRenderer ? window.uiRenderer.rankingStyle : 'range';
                    let rankDisplay;
                    
                    switch (rankingStyle) {
                        case 'range':
                            if (globalTasks.length === 1) {
                                rankDisplay = currentRank.toString();
                            } else {
                                const endRank = currentRank + globalTasks.length - 1;
                                rankDisplay = `${currentRank}-${endRank}`;
                            }
                            break;
                        case 'standard':
                            rankDisplay = currentRank.toString();
                            break;
                        case 'modified':
                            rankDisplay = currentRank.toString();
                            break;
                        case 'ordinal':
                            const getOrdinal = (n) => {
                                const s = ["th", "st", "nd", "rd"];
                                const v = n % 100;
                                return n + (s[(v - 20) % 10] || s[v] || s[0]);
                            };
                            rankDisplay = getOrdinal(currentRank);
                            break;
                        case 'fractional':
                            if (globalTasks.length === 1) {
                                rankDisplay = currentRank.toString();
                            } else {
                                const endRank = currentRank + globalTasks.length - 1;
                                const fractionalRank = (currentRank + endRank) / 2;
                                rankDisplay = fractionalRank.toString();
                            }
                            break;
                        default:
                            rankDisplay = currentRank.toString();
                    }
                    
                    taskDiv.innerHTML = `
                        <span class="task-rank${tiedClass}">${rankDisplay}</span>
                        <span class="task-name">${task.name}</span>
                    `;
                    tasksList.appendChild(taskDiv);
                });
                
                assigneeDiv.appendChild(tasksList);
                quarterContent.appendChild(assigneeDiv);
            });
            
            quarterDiv.appendChild(quarterContent);
            distributionDiv.appendChild(quarterDiv);
        });
        
        // Add click event listeners for collapsible quarters and assignees
        this.addCollapsibleEventListeners(distributionDiv);
    }
    
    // Add collapsible event listeners (shared between both rendering modes)
    addCollapsibleEventListeners(distributionDiv) {
        distributionDiv.addEventListener('click', (e) => {
            // Handle quarter collapsing
            if (e.target.classList.contains('quarter-title-clickable') || e.target.closest('.quarter-title-clickable')) {
                const quarterTitle = e.target.closest('.quarter-title-clickable') || e.target;
                const quarterName = quarterTitle.getAttribute('data-quarter');
                const quarterContent = quarterTitle.closest('.quarter-section').querySelector('.quarter-content');
                const chevron = quarterTitle.querySelector('.quarter-chevron');
                
                // Toggle collapsed state
                const isExpanded = this.toggleQuarterCollapsed(quarterName);
                
                // Animate the collapse/expand
                if (isExpanded) {
                    // Expanding
                    quarterContent.style.height = 'auto';
                    const targetHeight = quarterContent.scrollHeight;
                    quarterContent.style.height = '0px';
                    quarterContent.style.opacity = '0';
                    
                    // Force reflow
                    quarterContent.offsetHeight;
                    
                    // Animate to target height
                    quarterContent.style.height = targetHeight + 'px';
                    quarterContent.style.opacity = '1';
                    chevron.textContent = '▼';
                    chevron.style.transform = 'rotate(0deg)';
                    
                    // Clean up after animation
                    setTimeout(() => {
                        quarterContent.style.height = 'auto';
                    }, 300);
                } else {
                    // Collapsing
                    const currentHeight = quarterContent.scrollHeight;
                    quarterContent.style.height = currentHeight + 'px';
                    
                    // Force reflow
                    quarterContent.offsetHeight;
                    
                    // Animate to collapsed
                    quarterContent.style.height = '0px';
                    quarterContent.style.opacity = '0';
                    chevron.textContent = '▶';
                    chevron.style.transform = 'rotate(-90deg)';
                }
            }
            // Handle assignee group collapsing
            else if (e.target.classList.contains('assignee-header-clickable') || e.target.closest('.assignee-header-clickable')) {
                const assigneeHeader = e.target.closest('.assignee-header-clickable') || e.target;
                const quarterName = assigneeHeader.getAttribute('data-quarter');
                const assigneeName = assigneeHeader.getAttribute('data-assignee');
                const tasksList = assigneeHeader.nextElementSibling;
                const chevron = assigneeHeader.querySelector('.assignee-chevron');
                
                // Toggle collapsed state
                const isExpanded = this.toggleAssigneeCollapsed(quarterName, assigneeName);
                
                // Animate the collapse/expand
                if (isExpanded) {
                    // Expanding
                    tasksList.style.height = 'auto';
                    const targetHeight = tasksList.scrollHeight;
                    tasksList.style.height = '0px';
                    tasksList.style.opacity = '0';
                    
                    // Force reflow
                    tasksList.offsetHeight;
                    
                    // Animate to target height
                    tasksList.style.height = targetHeight + 'px';
                    tasksList.style.opacity = '1';
                    chevron.textContent = '▼';
                    chevron.style.transform = 'rotate(0deg)';
                    
                    // Clean up after animation
                    setTimeout(() => {
                        tasksList.style.height = 'auto';
                    }, 300);
                } else {
                    // Collapsing
                    const currentHeight = tasksList.scrollHeight;
                    tasksList.style.height = currentHeight + 'px';
                    
                    // Force reflow
                    tasksList.offsetHeight;
                    
                    // Animate to collapsed
                    tasksList.style.height = '0px';
                    tasksList.style.opacity = '0';
                    chevron.textContent = '▶';
                    chevron.style.transform = 'rotate(-90deg)';
                }
            }
        });
    }
    
    // Render Assignee → Quarter distribution (new layout)
    renderAssigneeQuarterDistribution(distributionDiv, distribution) {
        // First, collect all tasks by assignee across all quarters
        const tasksByAssignee = new Map();
        
        distribution.forEach((quarterData, quarterName) => {
            quarterData.tasks.forEach(task => {
                const assignee = task.assignee;
                if (!tasksByAssignee.has(assignee)) {
                    tasksByAssignee.set(assignee, new Map());
                }
                if (!tasksByAssignee.get(assignee).has(quarterName)) {
                    tasksByAssignee.get(assignee).set(quarterName, []);
                }
                tasksByAssignee.get(assignee).get(quarterName).push({
                    ...task,
                    quarterData: quarterData
                });
            });
        });
        
        // Sort assignees (Unassigned last)
        const sortedAssignees = Array.from(tasksByAssignee.keys()).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
        
        // Render each assignee
        sortedAssignees.forEach(assignee => {
            const assigneeDiv = document.createElement('div');
            assigneeDiv.className = 'quarter-section'; // Use same styling as quarters
            
            const assigneeColor = this.getAssigneeColor(assignee);
            const textColor = this.getTextColorForBackground(assigneeColor);
            assigneeDiv.style.borderLeft = `4px solid ${assigneeColor}`;
            
            const isAssigneeCollapsed = this.isAssigneeCollapsed('assignee-view', assignee);
            const chevronIcon = isAssigneeCollapsed ? '▶' : '▼';
            
            const assigneeHeader = document.createElement('div');
            assigneeHeader.className = 'quarter-header';
            assigneeHeader.innerHTML = `
                <h3 class="quarter-title quarter-title-colored quarter-title-clickable" style="background-color: ${assigneeColor}; color: ${textColor}" data-quarter="assignee-view" data-assignee="${assignee}">
                    <span class="quarter-chevron" style="transform: rotate(${isAssigneeCollapsed ? '-90deg' : '0deg'})">${chevronIcon}</span>
                    ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee}
                    <span class="quarter-count">(${Array.from(tasksByAssignee.get(assignee).values()).flat().length} tasks)</span>
                </h3>
            `;
            
            assigneeDiv.appendChild(assigneeHeader);
            
            // Create content container
            const assigneeContent = document.createElement('div');
            assigneeContent.className = 'quarter-content';
            if (isAssigneeCollapsed) {
                assigneeContent.style.height = '0px';
                assigneeContent.style.opacity = '0';
            }
            
            // Render quarters within this assignee
            const assigneeQuarters = tasksByAssignee.get(assignee);
            Array.from(assigneeQuarters.keys()).forEach(quarterName => {
                const quarterTasks = assigneeQuarters.get(quarterName);
                const quarterData = quarterTasks[0].quarterData;
                
                const isQuarterCollapsed = this.isQuarterCollapsed(assignee, quarterName);
                const quarterChevronIcon = isQuarterCollapsed ? '▶' : '▼';
                
                const quarterGroupDiv = document.createElement('div');
                quarterGroupDiv.className = 'assignee-group-quarterly';
                
                const quarterSubHeader = document.createElement('div');
                quarterSubHeader.className = 'assignee-header-quarterly assignee-header-clickable';
                quarterSubHeader.setAttribute('data-quarter', assignee);
                quarterSubHeader.setAttribute('data-assignee', quarterName);
                quarterSubHeader.innerHTML = `
                    <span class="assignee-chevron" style="transform: rotate(${isQuarterCollapsed ? '-90deg' : '0deg'})">${quarterChevronIcon}</span>
                    <span class="status-name-colored" style="background-color: ${quarterData.color}; color: ${this.quarterlyStatus.getTextColor(quarterData.color)}">${quarterName.toUpperCase()}</span>
                    <span class="assignee-count">(${quarterTasks.length} tasks)</span>
                `;
                
                quarterGroupDiv.appendChild(quarterSubHeader);
                
                const tasksList = document.createElement('div');
                tasksList.className = 'tasks-list-quarterly';
                if (isQuarterCollapsed) {
                    tasksList.style.height = '0px';
                    tasksList.style.opacity = '0';
                }
                
                quarterTasks.forEach(task => {
                    const taskDiv = document.createElement('div');
                    taskDiv.className = 'task-item-quarterly';
                    
                    // Find the global group this task belongs to and check if it's tied
                    const globalGroupId = this.state.sortState.sortedGroups.find(groupId => {
                        const tasks = this.state.rankGroups.get(groupId);
                        return tasks.includes(task.id);
                    });
                    
                    const globalTasks = this.state.rankGroups.get(globalGroupId) || [];
                    const isTied = globalTasks.length > 1;
                    const tiedClass = isTied ? ' tied' : '';
                    
                    // Calculate rank display
                    const globalRankIndex = this.state.sortState.sortedGroups.indexOf(globalGroupId);
                    let currentRank = 1;
                    for (let i = 0; i < globalRankIndex; i++) {
                        const prevGroupId = this.state.sortState.sortedGroups[i];
                        const prevTasks = this.state.rankGroups.get(prevGroupId) || [];
                        currentRank += prevTasks.length;
                    }
                    
                    const rankingStyle = window.uiRenderer ? window.uiRenderer.rankingStyle : 'range';
                    let rankDisplay;
                    
                    switch (rankingStyle) {
                        case 'range':
                            if (globalTasks.length === 1) {
                                rankDisplay = currentRank.toString();
                            } else {
                                const endRank = currentRank + globalTasks.length - 1;
                                rankDisplay = `${currentRank}-${endRank}`;
                            }
                            break;
                        case 'standard':
                            rankDisplay = currentRank.toString();
                            break;
                        case 'modified':
                            rankDisplay = currentRank.toString();
                            break;
                        case 'ordinal':
                            const getOrdinal = (n) => {
                                const s = ["th", "st", "nd", "rd"];
                                const v = n % 100;
                                return n + (s[(v - 20) % 10] || s[v] || s[0]);
                            };
                            rankDisplay = getOrdinal(currentRank);
                            break;
                        case 'fractional':
                            if (globalTasks.length === 1) {
                                rankDisplay = currentRank.toString();
                            } else {
                                const endRank = currentRank + globalTasks.length - 1;
                                const fractionalRank = (currentRank + endRank) / 2;
                                rankDisplay = fractionalRank.toString();
                            }
                            break;
                        default:
                            rankDisplay = currentRank.toString();
                    }
                    
                    taskDiv.innerHTML = `
                        <span class="task-rank${tiedClass}">${rankDisplay}</span>
                        <span class="task-name">${task.name}</span>
                    `;
                    tasksList.appendChild(taskDiv);
                });
                
                quarterGroupDiv.appendChild(tasksList);
                assigneeContent.appendChild(quarterGroupDiv);
            });
            
            assigneeDiv.appendChild(assigneeContent);
            distributionDiv.appendChild(assigneeDiv);
        });
        
        // Add click event listeners for collapsible assignees and quarters
        this.addCollapsibleEventListeners(distributionDiv);
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