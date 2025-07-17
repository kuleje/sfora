// UI rendering and display utilities module
class UIRenderer {
    constructor(state, csvHandler, logger) {
        this.state = state;
        this.csvHandler = csvHandler;
        this.log = logger;
        this.selectedDesign = 'tabbed'; // Default value
        this.rankingStyle = 'range'; // Default value
        this._loadPreferences();
    }

    _loadPreferences() {
        try {
            const savedDesign = localStorage.getItem('sfora.resultDesign');
            const savedRankingStyle = localStorage.getItem('sfora.rankingStyle');

            if (savedDesign) {
                this.selectedDesign = savedDesign;
            }
            if (savedRankingStyle) {
                this.rankingStyle = savedRankingStyle;
            }
        } catch (e) {
            console.error("Error loading preferences from localStorage:", e);
        }
    }

    // Display column selection UI
    displayColumnChoices(columns) {
        this.log('Displaying column choices...');
        
        const setupArea = document.getElementById('setup-area');
        const columnSelectionArea = document.getElementById('column-selection-area');
        const taskIdColumn = document.getElementById('task-id-column');
        const taskNameColumn = document.getElementById('task-name-column');
        const taskDescriptionColumn = document.getElementById('task-description-column');
        const taskAssigneeColumn = document.getElementById('task-assignee-column');
        
        setupArea.style.display = 'none';
        columnSelectionArea.style.display = 'block';
        
        // Populate dropdowns
        [taskIdColumn, taskNameColumn, taskDescriptionColumn, taskAssigneeColumn].forEach(select => {
            select.innerHTML = '<option value="">Select column...</option>';
            columns.forEach(column => {
                const option = document.createElement('option');
                option.value = column;
                option.textContent = column;
                select.appendChild(option);
            });
        });
        
        // Auto-select default columns
        const defaultMappings = this.csvHandler.autoSelectDefaultColumns(columns);
        Object.keys(defaultMappings).forEach(field => {
            const selectElement = document.getElementById(`task-${field}-column`);
            if (selectElement && defaultMappings[field]) {
                selectElement.value = defaultMappings[field];
                this.updatePreview(field);
            }
        });
    }

    // Update preview for column selection
    updatePreview(type) {
        const selectElement = document.getElementById(`task-${type}-column`);
        const previewElement = document.getElementById(`task-${type}-preview`);
        
        const column = selectElement.value;
        if (column) {
            const preview = this.csvHandler.getColumnPreview(column);
            previewElement.textContent = preview ? `Example: "${preview}"` : '';
            this.state.columnMapping[type] = column;
        } else {
            previewElement.textContent = '';
            this.state.columnMapping[type] = '';
        }
    }

    // Display task comparison UI
    displayComparison(task1Id, task2Id) {
        this.log(`displayComparison called with: ${task1Id}, ${task2Id}`);
        
        const task1 = this.state.getTask(task1Id);
        const task2 = this.state.getTask(task2Id);
        
        if (!task1 || !task2) {
            this.log(`Error: Task not found`);
            return;
        }

        const taskAElement = document.getElementById('task-a');
        const taskBElement = document.getElementById('task-b');
        const qrAElement = document.getElementById('qr-a');
        const qrBElement = document.getElementById('qr-b');

        // Clear previous content
        taskAElement.innerHTML = '';
        taskBElement.innerHTML = '';
        qrAElement.innerHTML = '';
        qrBElement.innerHTML = '';

        // Get group info
        const task1GroupId = this.state.getTaskGroupId(task1Id);
        const task2GroupId = this.state.getTaskGroupId(task2Id);
        const task1Group = this.state.getGroup(task1GroupId);
        const task2Group = this.state.getGroup(task2GroupId);

        // Display task content
        this.displayTaskContent(task1, taskAElement, task1Group);
        this.displayTaskContent(task2, taskBElement, task2Group);
        
        // Display QR codes
        this.displayTaskQR(task1, qrAElement);
        this.displayTaskQR(task2, qrBElement);
    }

    // Display individual task content
    displayTaskContent(task, element, groupTasks = null) {
        const name = task.data[this.state.columnMapping.name] || '';
        const description = task.data[this.state.columnMapping.description] || '';
        const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
        const taskId = task.id;
        const existingComment = this.state.taskComments[taskId] || '';
        const isGroup = groupTasks && groupTasks.length > 1;
        
        // Add group styling
        if (isGroup) {
            element.classList.add('task-group');
            element.setAttribute('data-group-size', groupTasks.length);
        } else {
            element.classList.remove('task-group');
            element.removeAttribute('data-group-size');
        }
        
        // Truncate description
        const truncatedDesc = description.length > 500 ? 
            description.substring(0, 500) + '...' : description;
        
        element.innerHTML = `
            ${isGroup ? `<div class="group-indicator">
                <span class="group-badge">${groupTasks.length} tasks</span>
                <button class="group-expand-btn" data-task-id="${taskId}">Show all</button>
            </div>` : ''}
            <div class="task-name">${name}</div>
            ${assignee ? `<div class="task-assignee">👤 ${assignee}</div>` : ''}
            <div class="task-description">${truncatedDesc}</div>
            ${isGroup ? `<div class="group-details collapsed" id="group-details-${taskId}">
                <div class="group-details-header">All tasks in this group:</div>
                <ul class="group-task-list">${groupTasks.map(id => {
                    const t = this.state.allTasks.find(task => task.id === id);
                    return `<li>${t.data[this.state.columnMapping.name] || 'Unnamed task'}</li>`;
                }).join('')}</ul>
            </div>` : ''}
            <div class="task-comment-section">
                <label for="comment-${taskId}" class="comment-label">Note:</label>
                <div class="comment-input-container">
                    <textarea id="comment-${taskId}" class="task-comment" placeholder="e.g., duplicate of task #123, low priority due to..." rows="2">${existingComment}</textarea>
                    <button id="save-comment-${taskId}" class="save-comment-btn" type="button">Save Note</button>
                </div>
                <div id="comment-status-${taskId}" class="comment-status"></div>
                <div class="task-actions">
                    <button id="remove-task-${taskId}" class="remove-task-btn" type="button">Remove from Sorting</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        this.attachTaskEventListeners(element, taskId);
    }

    // Attach event listeners to task elements
    attachTaskEventListeners(element, taskId) {
        const commentField = element.querySelector(`#comment-${taskId}`);
        const saveButton = element.querySelector(`#save-comment-${taskId}`);
        const statusDiv = element.querySelector(`#comment-status-${taskId}`);
        const removeButton = element.querySelector(`#remove-task-${taskId}`);
        const expandButton = element.querySelector('.group-expand-btn');
        
        // Auto-save comment on input
        commentField.addEventListener('input', () => {
            this.state.taskComments[taskId] = commentField.value;
            statusDiv.textContent = '';
            statusDiv.className = 'comment-status';
        });
        
        // Save button for visual confirmation
        saveButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            this.state.taskComments[taskId] = commentField.value;
            statusDiv.textContent = 'Note saved!';
            statusDiv.className = 'comment-status saved';
            
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'comment-status';
            }, 2000);
        });
        
        // Remove task button
        removeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            if (confirm('Remove this task from sorting? It will appear in a separate section in the final results.')) {
                // Emit custom event for removal
                const event = new CustomEvent('taskRemoved', { detail: { taskId } });
                document.dispatchEvent(event);
            }
        });
        
        // Group expand button
        if (expandButton) {
            expandButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleGroupDetails(taskId, expandButton);
            });
        }
        
        // Prevent task selection when clicking on interactive elements
        [commentField, saveButton].forEach(el => {
            el.addEventListener('click', (e) => e.stopPropagation());
        });
        
        commentField.addEventListener('focus', (e) => e.stopPropagation());
    }

    // Display QR code for task
    displayTaskQR(task, element) {
        const taskId = task.data[this.state.columnMapping.id] || '';
        
        if (taskId && this.state.taskUrlBaseValue && typeof qrcode !== 'undefined') {
            const taskUrl = this.state.taskUrlBaseValue + taskId;
            try {
                const qr = qrcode(0, 'M');
                qr.addData(taskUrl);
                qr.make();
                
                element.innerHTML = qr.createImgTag(4, 2);
                const linkText = document.createElement('div');
                linkText.className = 'qr-label';
                linkText.textContent = 'Scan for full details';
                element.appendChild(linkText);
            } catch (error) {
                console.log('QR generation failed:', error);
                this.displayTaskLink(taskId, element);
            }
        } else if (taskId && this.state.taskUrlBaseValue) {
            this.displayTaskLink(taskId, element);
        }
    }

    // Display clickable link fallback
    displayTaskLink(taskId, element) {
        const link = document.createElement('a');
        link.href = this.state.taskUrlBaseValue + taskId;
        link.target = '_blank';
        link.textContent = 'View full task';
        link.style.fontSize = '0.8em';
        link.style.color = '#4a90e2';
        element.appendChild(link);
    }

    // Toggle group details
    toggleGroupDetails(taskId, button) {
        const details = document.getElementById(`group-details-${taskId}`);
        if (details.classList.contains('collapsed')) {
            details.classList.remove('collapsed');
            button.textContent = 'Hide';
        } else {
            details.classList.add('collapsed');
            button.textContent = 'Show all';
        }
    }

    // Update progress bar
    updateProgress(progressInfo) {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        progressBar.style.width = `${progressInfo.progress}%`;
        
        // Show different messages based on estimation availability
        if (progressInfo.showEstimation) {
            progressText.textContent = `Sorted ${progressInfo.sortedTasks} of ${progressInfo.totalTasks} tasks (~${progressInfo.estimatedRemaining} comparisons left)`;
        } else {
            progressText.textContent = `Sorted ${progressInfo.sortedTasks} of ${progressInfo.totalTasks} tasks (calculating estimate...)`;
        }
    }

    // Display final results
    displayResults(groupByAssignee = false) {
        this.log('Displaying results...');
        
        const sortingArea = document.getElementById('sorting-area');
        const resultsArea = document.getElementById('results-area');
        const sortedResults = document.getElementById('sorted-results');
        
        sortingArea.style.display = 'none';
        resultsArea.style.display = 'block';
        
        sortedResults.innerHTML = '';
        
        // Get selected design dropdown
        const designSelect = document.getElementById('result-design-select');
        // Get selected ranking style dropdown
        const rankingStyleSelect = document.getElementById('ranking-style-select');
        const resultsOptionsDiv = document.getElementById('results-options');

        // Set initial values of dropdowns based on loaded preferences
        if (designSelect) {
            designSelect.value = this.selectedDesign;
        }
        if (rankingStyleSelect) {
            rankingStyleSelect.value = this.rankingStyle;
        }

        // Hide/show results-options div based on selected design
        if (resultsOptionsDiv) {
            if (this.selectedDesign === 'tabbed') {
                resultsOptionsDiv.style.display = 'none';
            } else {
                resultsOptionsDiv.style.display = 'block';
            }
        }

        // Render based on selected design
        this.renderWithDesign(this.selectedDesign, groupByAssignee);
        
        // Add event listener for design changes
        if (designSelect) {
            designSelect.addEventListener('change', () => {
                this.selectedDesign = designSelect.value;
                localStorage.setItem('sfora.resultDesign', this.selectedDesign);
                
                // Update visibility of results-options div
                if (resultsOptionsDiv) {
                    if (this.selectedDesign === 'tabbed') {
                        resultsOptionsDiv.style.display = 'none';
                    } else {
                        resultsOptionsDiv.style.display = 'block';
                    }
                }

                this.renderWithDesign(this.selectedDesign, groupByAssignee);
            });
        }

        // Add event listener for ranking style changes
        if (rankingStyleSelect) {
            rankingStyleSelect.addEventListener('change', () => {
                this.rankingStyle = rankingStyleSelect.value;
                localStorage.setItem('sfora.rankingStyle', this.rankingStyle);
                this.renderWithDesign(this.selectedDesign, groupByAssignee);
            });
        }
    }
    
    // Render results with selected design
    renderWithDesign(design, groupByAssignee) {
        const sortedResults = document.getElementById('sorted-results');
        sortedResults.innerHTML = '';
        
        switch (design) {
            case 'tabbed':
                this.renderTabbedInterface(groupByAssignee);
                break;
            case 'collapsible':
                this.renderCollapsibleSections(groupByAssignee);
                break;
            case 'split-view':
                this.renderSplitViewLayout(groupByAssignee);
                break;
            default:
                if (groupByAssignee) {
                    this.renderGroupedByAssignee();
                } else {
                    this.renderDefaultList();
                }
        }
    }
    
    // Helper method to get range display for tied tasks
    getRankRange(groupIndex, taskCount, rank) {
        const startRank = rank;

        switch (this.rankingStyle) {
            case 'range':
                if (taskCount === 1) {
                    return startRank.toString();
                } else {
                    const endRank = startRank + taskCount - 1;
                    return `${startRank}-${endRank}`;
                }
            case 'standard':
                return startRank.toString();
            case 'modified':
                // This requires a different approach to rank calculation, handled in the rendering logic
                return rank.toString();
            case 'ordinal':
                return this.getOrdinal(startRank);
            case 'fractional':
                if (taskCount === 1) {
                    return startRank.toString();
                } else {
                    const endRank = startRank + taskCount - 1;
                    const fractionalRank = (startRank + endRank) / 2;
                    return fractionalRank.toString();
                }
            default:
                return startRank.toString();
        }
    }

    getOrdinal(n) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    // Render default sorted list
    renderDefaultList() {
        const sortedResults = document.getElementById('sorted-results');
        const ol = document.createElement('ol');
        ol.className = 'sorted-list';
        
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
                const comment = this.state.taskComments[taskId] || '';
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
                    ${assignee ? `<span class="assignee-badge">${assignee}</span>` : ''}
                    ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                `;
                if (tasks.length > 1) {
                    li.innerHTML += `<span class="tie-indicator"> (tied with ${tasks.length - 1} other${tasks.length > 2 ? 's' : ''})</span>`;
                }
                ol.appendChild(li);
            });
        });
        
        sortedResults.appendChild(ol);
        this.renderRemovedTasks();
    }

    // Render grouped by assignee
    renderGroupedByAssignee() {
        const sortedResults = document.getElementById('sorted-results');
        const assigneeGroups = new Map();
        
        // Group tasks by assignee
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
                
                if (!assigneeGroups.has(assignee)) {
                    assigneeGroups.set(assignee, []);
                }
                
                assigneeGroups.get(assignee).push({
                    task,
                    rank,
                    tieCount: tasks.length
                });
            });
        });
        
        // Sort assignees (Unassigned last)
        const sortedAssignees = Array.from(assigneeGroups.keys()).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
        
        // Render each assignee group
        sortedAssignees.forEach(assignee => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'assignee-group';
            
            const header = document.createElement('h3');
            header.className = 'assignee-header';
            header.innerHTML = `
                ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee} 
                <span class="task-count">(${assigneeGroups.get(assignee).length} task${assigneeGroups.get(assignee).length !== 1 ? 's' : ''})</span>
            `;
            groupDiv.appendChild(header);
            
            const ol = document.createElement('ol');
            ol.className = 'assignee-task-list';
            
            assigneeGroups.get(assignee).forEach(({ task, rank, tieCount }) => {
                const comment = this.state.taskComments[task.id] || '';
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="rank-badge">#${rank}</span>
                    <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
                    ${tieCount > 1 ? `<span class="tie-indicator"> (tied with ${tieCount - 1} other${tieCount > 2 ? 's' : ''})</span>` : ''}
                    ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                `;
                ol.appendChild(li);
            });
            
            groupDiv.appendChild(ol);
            sortedResults.appendChild(groupDiv);
        });
        
        this.renderRemovedTasksGrouped();
    }

    // Render removed tasks section
    renderRemovedTasks() {
        const sortedResults = document.getElementById('sorted-results');
        
        if (this.state.removedTasks.size === 0) return;
        
        const removedSection = document.createElement('div');
        removedSection.className = 'removed-tasks-section';
        removedSection.innerHTML = `
            <h3 class="removed-tasks-header">🚫 Removed from Sorting (${this.state.removedTasks.size} task${this.state.removedTasks.size !== 1 ? 's' : ''})</h3>
        `;
        
        const removedList = document.createElement('ul');
        removedList.className = 'removed-tasks-list';
        
        this.state.removedTasks.forEach(taskId => {
            const task = this.state.allTasks.find(t => t.id === taskId);
            const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
            const comment = this.state.taskComments[taskId] || '';
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
                ${assignee ? `<span class="assignee-badge">${assignee}</span>` : ''}
                ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                <button class="restore-task-btn" data-task-id="${taskId}">Restore</button>
            `;
            removedList.appendChild(li);
        });
        
        removedSection.appendChild(removedList);
        sortedResults.appendChild(removedSection);
        
        // Add restore functionality
        removedSection.addEventListener('click', (e) => {
            if (e.target.classList.contains('restore-task-btn')) {
                const taskId = parseInt(e.target.getAttribute('data-task-id'));
                const event = new CustomEvent('taskRestored', { detail: { taskId } });
                document.dispatchEvent(event);
            }
        });
    }

    // Render removed tasks grouped by assignee
    renderRemovedTasksGrouped() {
        const sortedResults = document.getElementById('sorted-results');
        
        if (this.state.removedTasks.size === 0) return;
        
        // Group removed tasks by assignee
        const removedAssigneeGroups = new Map();
        
        this.state.removedTasks.forEach(taskId => {
            const task = this.state.allTasks.find(t => t.id === taskId);
            const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
            
            if (!removedAssigneeGroups.has(assignee)) {
                removedAssigneeGroups.set(assignee, []);
            }
            
            removedAssigneeGroups.get(assignee).push(task);
        });
        
        const removedSection = document.createElement('div');
        removedSection.className = 'removed-tasks-section';
        removedSection.innerHTML = `<h2 class="removed-tasks-title">🚫 Removed from Sorting</h2>`;
        
        // Sort removed assignees
        const sortedRemovedAssignees = Array.from(removedAssigneeGroups.keys()).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
        
        sortedRemovedAssignees.forEach(assignee => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'assignee-group removed-assignee-group';
            
            const header = document.createElement('h3');
            header.className = 'assignee-header removed-assignee-header';
            header.innerHTML = `
                ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee} 
                <span class="task-count">(${removedAssigneeGroups.get(assignee).length} removed task${removedAssigneeGroups.get(assignee).length !== 1 ? 's' : ''})</span>
            `;
            groupDiv.appendChild(header);
            
            const ul = document.createElement('ul');
            ul.className = 'assignee-task-list removed-task-list';
            
            removedAssigneeGroups.get(assignee).forEach(task => {
                const comment = this.state.taskComments[task.id] || '';
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="removed-badge">REMOVED</span>
                    <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
                    ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                    <button class="restore-task-btn" data-task-id="${task.id}">Restore</button>
                `;
                ul.appendChild(li);
            });
            
            groupDiv.appendChild(ul);
            removedSection.appendChild(groupDiv);
        });
        
        sortedResults.appendChild(removedSection);
        
        // Add restore functionality
        removedSection.addEventListener('click', (e) => {
            if (e.target.classList.contains('restore-task-btn')) {
                const taskId = parseInt(e.target.getAttribute('data-task-id'));
                const event = new CustomEvent('taskRestored', { detail: { taskId } });
                document.dispatchEvent(event);
            }
        });
    }

    // Render split view layout
    renderSplitViewLayout(groupByAssignee = false) {
        const sortedResults = document.getElementById('sorted-results');
        
        // Create main container
        const container = document.createElement('div');
        container.className = 'split-view-container';
        
        // Create main split view area
        const mainArea = document.createElement('div');
        mainArea.className = 'split-view-main';
        
        // Create left panel (task list)
        const leftPanel = document.createElement('div');
        leftPanel.className = 'left-panel';
        
        // Create right panel (task details)
        const rightPanel = document.createElement('div');
        rightPanel.className = 'right-panel';
        
        // Create resizer
        const resizer = document.createElement('div');
        resizer.className = 'panel-resizer';
        
        // Setup panels
        this.setupLeftPanel(leftPanel, groupByAssignee);
        this.setupRightPanel(rightPanel);
        
        // Add panels to main area
        mainArea.appendChild(leftPanel);
        mainArea.appendChild(resizer);
        mainArea.appendChild(rightPanel);
        
        // Add main area to container
        container.appendChild(mainArea);
        
        // Add removed tasks section if any exist
        if (this.state.removedTasks.size > 0) {
            const bottomPanel = document.createElement('div');
            bottomPanel.className = 'bottom-panel';
            this.setupBottomPanel(bottomPanel, groupByAssignee);
            container.appendChild(bottomPanel);
        }
        
        // Add container to results
        sortedResults.appendChild(container);
        
        // Setup resizer functionality
        this.setupResizer(resizer, leftPanel, rightPanel);
        
        // Store references for task selection
        this.selectedTaskId = null;
        this.leftPanel = leftPanel;
        this.rightPanel = rightPanel;
    }

    // Setup left panel with task list
    setupLeftPanel(leftPanel, groupByAssignee) {
        const header = document.createElement('div');
        header.className = 'split-view-header';
        header.textContent = groupByAssignee ? 'Tasks by Assignee' : 'Priority Order';
        leftPanel.appendChild(header);
        
        const taskList = document.createElement('div');
        taskList.className = 'task-list';
        
        if (groupByAssignee) {
            this.renderTaskListGrouped(taskList);
        } else {
            this.renderTaskListFlat(taskList);
        }
        
        leftPanel.appendChild(taskList);
    }

    // Setup right panel with task details
    setupRightPanel(rightPanel) {
        const header = document.createElement('div');
        header.className = 'split-view-header';
        header.textContent = 'Task Details';
        rightPanel.appendChild(header);
        
        const placeholder = document.createElement('div');
        placeholder.className = 'task-detail-placeholder';
        placeholder.textContent = 'Select a task from the list to view details';
        rightPanel.appendChild(placeholder);
    }

    // Setup bottom panel for removed tasks
    setupBottomPanel(bottomPanel, groupByAssignee) {
        const header = document.createElement('div');
        header.className = 'bottom-panel-header';
        header.innerHTML = `🚫 Removed from Sorting (${this.state.removedTasks.size} task${this.state.removedTasks.size !== 1 ? 's' : ''})`;
        bottomPanel.appendChild(header);
        
        const removedTaskList = document.createElement('div');
        removedTaskList.className = 'removed-task-list';
        
        this.state.removedTasks.forEach(taskId => {
            const task = this.state.allTasks.find(t => t.id === taskId);
            const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
            const comment = this.state.taskComments[taskId] || '';
            
            const taskItem = document.createElement('div');
            taskItem.className = 'task-list-item removed-task-item';
            taskItem.innerHTML = `
                <span class="removed-badge">REMOVED</span>
                <div class="task-list-item-content">
                    <div class="task-list-item-name">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                    ${assignee !== 'Unassigned' ? `<div class="task-list-item-assignee">👤 ${assignee}</div>` : ''}
                    ${comment ? `<div class="task-list-item-comment">${comment}</div>` : ''}
                </div>
                <button class="restore-task-btn" data-task-id="${taskId}">Restore</button>
            `;
            
            removedTaskList.appendChild(taskItem);
        });
        
        bottomPanel.appendChild(removedTaskList);
        
        // Add restore functionality
        bottomPanel.addEventListener('click', (e) => {
            if (e.target.classList.contains('restore-task-btn')) {
                const taskId = parseInt(e.target.getAttribute('data-task-id'));
                const event = new CustomEvent('taskRestored', { detail: { taskId } });
                document.dispatchEvent(event);
            }
        });
    }

    // Render flat task list
    renderTaskListFlat(taskList) {
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
                const comment = this.state.taskComments[taskId] || '';
                
                const taskItem = document.createElement('div');
                taskItem.className = 'task-list-item';
                taskItem.setAttribute('data-task-id', taskId);
                taskItem.innerHTML = `
                    <span class="task-list-item-rank">#${rank}</span>
                    <div class="task-list-item-content">
                        <div class="task-list-item-name">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                        ${assignee !== 'Unassigned' ? `<div class="task-list-item-assignee">👤 ${assignee}</div>` : ''}
                        ${comment ? `<div class="task-list-item-comment">${comment}</div>` : ''}
                    </div>
                `;
                
                taskItem.addEventListener('click', () => {
                    this.selectTask(taskId, tasks.length > 1 ? tasks : null);
                });
                
                taskList.appendChild(taskItem);
            });
        });
    }

    // Render grouped task list by assignee
    renderTaskListGrouped(taskList) {
        const assigneeGroups = new Map();
        
        // Group tasks by assignee
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
                
                if (!assigneeGroups.has(assignee)) {
                    assigneeGroups.set(assignee, []);
                }
                
                assigneeGroups.get(assignee).push({
                    task,
                    rank,
                    tieCount: tasks.length,
                    taskId
                });
            });
        });
        
        // Sort assignees (Unassigned last)
        const sortedAssignees = Array.from(assigneeGroups.keys()).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
        
        // Render each assignee group
        sortedAssignees.forEach(assignee => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'assignee-group-tasks';
            
            const header = document.createElement('div');
            header.className = 'assignee-group-header';
            header.innerHTML = `
                ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee} 
                <span class="task-count">(${assigneeGroups.get(assignee).length} task${assigneeGroups.get(assignee).length !== 1 ? 's' : ''})</span>
            `;
            groupDiv.appendChild(header);
            
            assigneeGroups.get(assignee).forEach(({ task, rank, tieCount, taskId }) => {
                const comment = this.state.taskComments[taskId] || '';
                const taskItem = document.createElement('div');
                taskItem.className = 'task-list-item';
                taskItem.setAttribute('data-task-id', taskId);
                taskItem.innerHTML = `
                    <span class="task-list-item-rank">#${rank}</span>
                    <div class="task-list-item-content">
                        <div class="task-list-item-name">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                        ${comment ? `<div class="task-list-item-comment">${comment}</div>` : ''}
                    </div>
                `;
                
                taskItem.addEventListener('click', () => {
                    const allTiedTasks = this.state.rankGroups.get(this.state.sortState.sortedGroups[rank - 1]);
                    this.selectTask(taskId, allTiedTasks.length > 1 ? allTiedTasks : null);
                });
                
                groupDiv.appendChild(taskItem);
            });
            
            taskList.appendChild(groupDiv);
        });
    }

    // Select a task and show its details
    selectTask(taskId, tiedTasks = null) {
        // Update selection in left panel
        this.leftPanel.querySelectorAll('.task-list-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const selectedItem = this.leftPanel.querySelector(`[data-task-id="${taskId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        // Update right panel with task details
        this.displayTaskDetails(taskId, tiedTasks);
        
        this.selectedTaskId = taskId;
    }

    // Display task details in right panel
    displayTaskDetails(taskId, tiedTasks = null) {
        const task = this.state.allTasks.find(t => t.id === taskId);
        if (!task) return;
        
        const name = task.data[this.state.columnMapping.name] || 'Unnamed task';
        const description = task.data[this.state.columnMapping.description] || '';
        const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
        const comment = this.state.taskComments[taskId] || '';
        
        // Find task rank
        let rank = null;
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            if (tasks.includes(taskId)) {
                rank = groupIndex + 1;
            }
        });
        
        const detailsHtml = `
            <div class="task-detail-view">
                ${rank ? `<span class="task-detail-rank">#${rank}</span>` : ''}
                <div class="task-detail-name">${name}</div>
                ${assignee !== 'Unassigned' ? `<div class="task-detail-assignee">👤 ${assignee}</div>` : ''}
                ${tiedTasks && tiedTasks.length > 1 ? `<div class="task-detail-ties">⚖️ Tied with ${tiedTasks.length - 1} other task${tiedTasks.length > 2 ? 's' : ''}</div>` : ''}
                ${description ? `<div class="task-detail-description">${description}</div>` : ''}
                <div class="task-detail-comment-section">
                    <label for="detail-comment-${taskId}" class="comment-label">Note:</label>
                    <div class="comment-input-container">
                        <textarea id="detail-comment-${taskId}" class="task-comment" placeholder="Add notes about this task..." rows="3">${comment}</textarea>
                        <button id="detail-save-comment-${taskId}" class="save-comment-btn" type="button">Save Note</button>
                    </div>
                    <div id="detail-comment-status-${taskId}" class="comment-status"></div>
                </div>
            </div>
        `;
        
        // Replace right panel content
        const header = this.rightPanel.querySelector('.split-view-header');
        this.rightPanel.innerHTML = '';
        this.rightPanel.appendChild(header);
        
        const detailContainer = document.createElement('div');
        detailContainer.innerHTML = detailsHtml;
        this.rightPanel.appendChild(detailContainer);
        
        // Add event listeners for comment functionality
        this.attachDetailEventListeners(taskId);
    }

    // Attach event listeners for task detail interactions
    attachDetailEventListeners(taskId) {
        const commentField = this.rightPanel.querySelector(`#detail-comment-${taskId}`);
        const saveButton = this.rightPanel.querySelector(`#detail-save-comment-${taskId}`);
        const statusDiv = this.rightPanel.querySelector(`#detail-comment-status-${taskId}`);
        
        if (!commentField || !saveButton || !statusDiv) return;
        
        // Auto-save comment on input
        commentField.addEventListener('input', () => {
            this.state.taskComments[taskId] = commentField.value;
            statusDiv.textContent = '';
            statusDiv.className = 'comment-status';
            
            // Update comment in left panel
            const leftTaskItem = this.leftPanel.querySelector(`[data-task-id="${taskId}"]`);
            if (leftTaskItem) {
                const commentElement = leftTaskItem.querySelector('.task-list-item-comment');
                if (commentElement) {
                    commentElement.textContent = commentField.value;
                    commentElement.style.display = commentField.value ? 'block' : 'none';
                } else if (commentField.value) {
                    const content = leftTaskItem.querySelector('.task-list-item-content');
                    const newComment = document.createElement('div');
                    newComment.className = 'task-list-item-comment';
                    newComment.textContent = commentField.value;
                    content.appendChild(newComment);
                }
            }
        });
        
        // Save button for visual confirmation
        saveButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            this.state.taskComments[taskId] = commentField.value;
            statusDiv.textContent = 'Note saved!';
            statusDiv.className = 'comment-status saved';
            
            setTimeout(() => {
                statusDiv.textContent = '';
                statusDiv.className = 'comment-status';
            }, 2000);
        });
    }

    // Setup resizer functionality
    setupResizer(resizer, leftPanel, rightPanel) {
        let isResizing = false;
        
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        });
        
        function handleMouseMove(e) {
            if (!isResizing) return;
            
            const container = leftPanel.parentElement;
            const containerRect = container.getBoundingClientRect();
            const mouseX = e.clientX - containerRect.left;
            const containerWidth = containerRect.width;
            
            const leftPercent = (mouseX / containerWidth) * 100;
            const rightPercent = 100 - leftPercent;
            
            // Constrain to reasonable limits
            if (leftPercent > 20 && leftPercent < 80) {
                leftPanel.style.flex = `0 0 ${leftPercent}%`;
                rightPanel.style.flex = `0 0 ${rightPercent - 1}%`; // Account for resizer width
            }
        }
        
        function handleMouseUp() {
            isResizing = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    }



    // Show debug controls
    showDebugControls() {
        const debugElements = ['debug-controls', 'debug-controls-sorting', 'debug-controls-results', 'debug-controls-main'];
        debugElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'block';
        });
    }

    // Render tabbed interface
    renderTabbedInterface(groupByAssignee) {
        const sortedResults = document.getElementById('sorted-results');
        
        // Create tab container
        const tabContainer = document.createElement('div');
        tabContainer.className = 'tab-container';
        
        // Create tab buttons
        const tabButtons = document.createElement('div');
        tabButtons.className = 'tab-buttons';
        
        const allTasksTab = document.createElement('button');
        allTasksTab.className = 'tab-button';
        allTasksTab.textContent = 'All Tasks';
        allTasksTab.setAttribute('data-tab', 'all-tasks');
        
        const byAssigneeTab = document.createElement('button');
        byAssigneeTab.className = 'tab-button';
        byAssigneeTab.textContent = 'By Assignee';
        byAssigneeTab.setAttribute('data-tab', 'by-assignee');
        
        const removedTasksTab = document.createElement('button');
        removedTasksTab.className = 'tab-button';
        removedTasksTab.textContent = `Removed Tasks (${this.state.removedTasks.size})`;
        removedTasksTab.setAttribute('data-tab', 'removed-tasks');
        
        // Set initial active tab based on groupByAssignee parameter
        if (groupByAssignee) {
            byAssigneeTab.classList.add('active');
        } else {
            allTasksTab.classList.add('active');
        }
        
        tabButtons.appendChild(allTasksTab);
        tabButtons.appendChild(byAssigneeTab);
        tabButtons.appendChild(removedTasksTab);
        
        // Create tab content area
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        
        // Assemble the tab container
        tabContainer.appendChild(tabButtons);
        tabContainer.appendChild(tabContent);
        sortedResults.appendChild(tabContainer);
        
        // Function to render content based on active tab
        const renderTabContent = (activeTab) => {
            tabContent.innerHTML = '';
            
            switch (activeTab) {
                case 'all-tasks':
                    this.renderDefaultListInTab(tabContent);
                    break;
                case 'by-assignee':
                    this.renderGroupedByAssigneeInTab(tabContent);
                    break;
                case 'removed-tasks':
                    this.renderRemovedTasksInTab(tabContent);
                    break;
            }
        };
        
        // Add event listeners for tab switching
        tabButtons.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-button')) {
                const targetTab = e.target.getAttribute('data-tab');
                
                // Update active tab button
                tabButtons.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');
                
                // Render content for selected tab
                renderTabContent(targetTab);
            }
        });
        
        // Render initial content
        if (groupByAssignee) {
            renderTabContent('by-assignee');
        } else {
            renderTabContent('all-tasks');
        }
    }
    
    // Helper method to render default list in tab
    renderDefaultListInTab(container) {
        const taskList = document.createElement('div');
        taskList.className = 'task-list-ranked';
        
        let rank = 1;
        let tiedTasksBuffer = [];

        const commitTiedTasks = () => {
            if (tiedTasksBuffer.length > 1) {
                const container = document.createElement('div');
                container.className = 'tied-tasks-container';
                tiedTasksBuffer.forEach(item => container.appendChild(item));
                taskList.appendChild(container);
            } else if (tiedTasksBuffer.length === 1) {
                taskList.appendChild(tiedTasksBuffer[0]);
            }
            tiedTasksBuffer = [];
        };

        this.state.sortState.sortedGroups.forEach((groupId) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rankRange = this.getRankRange(0, tasks.length, rank);
            
            tasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
                const comment = this.state.taskComments[taskId] || '';
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item-ranked';
                if (tasks.length > 1) {
                    taskItem.classList.add('tied');
                }
                taskItem.innerHTML = `
                    <span class="rank-range">${rankRange}</span>
                    <div class="task-content">
                        <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
                        <div class="task-meta">
                            <div class="task-comment-preview">${comment || ''}</div>
                            <span class="assignee-badge">${assignee ? `👤 ${assignee}` : ''}</span>
                        </div>
                    </div>
                `;
                tiedTasksBuffer.push(taskItem);
            });

            commitTiedTasks();

            if (this.rankingStyle === 'modified') {
                rank++;
            } else {
                rank += tasks.length;
            }
        });
        
        container.appendChild(taskList);
    }
    
    // Helper method to render grouped by assignee in tab
    renderGroupedByAssigneeInTab(container) {
        const assigneeGroups = new Map();
        
        // Group tasks by assignee
        let rank = 1;
        this.state.sortState.sortedGroups.forEach((groupId) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rankRange = this.getRankRange(0, tasks.length, rank);
            
            tasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
                
                if (!assigneeGroups.has(assignee)) {
                    assigneeGroups.set(assignee, []);
                }
                
                assigneeGroups.get(assignee).push({
                    task,
                    rankRange,
                    tieCount: tasks.length
                });
            });

            if (this.rankingStyle === 'modified') {
                rank++;
            } else {
                rank += tasks.length;
            }
        });
        
        // Sort assignees (Unassigned last)
        const sortedAssignees = Array.from(assigneeGroups.keys()).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
        
        // Render each assignee group
        sortedAssignees.forEach(assignee => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'assignee-group';
            
            const header = document.createElement('h3');
            header.className = 'assignee-header';
            header.innerHTML = `
                ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee} 
                <span class="task-count">(${assigneeGroups.get(assignee).length} task${assigneeGroups.get(assignee).length !== 1 ? 's' : ''})</span>
            `;
            groupDiv.appendChild(header);
            
            const taskList = document.createElement('div');
            taskList.className = 'assignee-task-list-ranked';

            let tiedTasksBuffer = [];
            let currentRankRange = null;

            const commitTiedTasks = () => {
                if (tiedTasksBuffer.length === 0) return;

                if (tiedTasksBuffer.length > 1) {
                    const container = document.createElement('div');
                    container.className = 'tied-tasks-container';
                    tiedTasksBuffer.forEach(item => container.appendChild(item));
                    taskList.appendChild(container);
                } else {
                    taskList.appendChild(tiedTasksBuffer[0]);
                }
                tiedTasksBuffer = [];
            };

            const tasksForAssignee = assigneeGroups.get(assignee);
            tasksForAssignee.forEach(({ task, rankRange, tieCount }, index) => {
                if (currentRankRange !== rankRange && tiedTasksBuffer.length > 0) {
                    commitTiedTasks();
                }
                currentRankRange = rankRange;

                const comment = this.state.taskComments[task.id] || '';
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item-ranked';
                if (tieCount > 1) {
                    taskItem.classList.add('tied');
                }
                taskItem.innerHTML = `
                    <span class="rank-range">${rankRange}</span>
                    <div class="task-content">
                        <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
                        ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                    </div>
                `;
                tiedTasksBuffer.push(taskItem);

                // Commit the last group
                if (index === tasksForAssignee.length - 1) {
                    commitTiedTasks();
                }
            });

            groupDiv.appendChild(taskList);
            container.appendChild(groupDiv);
        });
    }
    
    // Helper method to render removed tasks in tab
    renderRemovedTasksInTab(container) {
        if (this.state.removedTasks.size === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-tab-message';
            emptyMessage.innerHTML = `
                <p>No tasks have been removed from sorting.</p>
                <p class="empty-tab-hint">Tasks removed during the sorting process will appear here.</p>
            `;
            container.appendChild(emptyMessage);
            return;
        }
        
        // Group removed tasks by assignee
        const removedAssigneeGroups = new Map();
        
        this.state.removedTasks.forEach(taskId => {
            const task = this.state.allTasks.find(t => t.id === taskId);
            const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
            
            if (!removedAssigneeGroups.has(assignee)) {
                removedAssigneeGroups.set(assignee, []);
            }
            
            removedAssigneeGroups.get(assignee).push(task);
        });
        
        // Sort removed assignees
        const sortedRemovedAssignees = Array.from(removedAssigneeGroups.keys()).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
        
        sortedRemovedAssignees.forEach(assignee => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'assignee-group removed-assignee-group';
            
            const header = document.createElement('h3');
            header.className = 'assignee-header removed-assignee-header';
            header.innerHTML = `
                ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee} 
                <span class="task-count">(${removedAssigneeGroups.get(assignee).length} removed task${removedAssigneeGroups.get(assignee).length !== 1 ? 's' : ''})</span>
            `;
            groupDiv.appendChild(header);
            
            const ul = document.createElement('ul');
            ul.className = 'assignee-task-list removed-task-list';
            
            removedAssigneeGroups.get(assignee).forEach(task => {
                const comment = this.state.taskComments[task.id] || '';
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="removed-badge">REMOVED</span>
                    <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
                    ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                    <button class="restore-task-btn" data-task-id="${task.id}">Restore</button>
                `;
                ul.appendChild(li);
            });
            
            groupDiv.appendChild(ul);
            container.appendChild(groupDiv);
        });
        
        // Add restore functionality
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('restore-task-btn')) {
                const taskId = parseInt(e.target.getAttribute('data-task-id'));
                const event = new CustomEvent('taskRestored', { detail: { taskId } });
                document.dispatchEvent(event);
            }
        });
    }

    // Render split view layout design (placeholder implementation)
    renderSplitViewLayout(groupByAssignee = false) {
        // For now, fall back to default rendering
        // This could be implemented later with a side-by-side view
        if (groupByAssignee) {
            this.renderGroupedByAssignee();
        } else {
            this.renderDefaultList();
        }
    }

    // Render collapsible sections design
    renderCollapsibleSections(groupByAssignee = false) {
        const sortedResults = document.getElementById('sorted-results');
        
        // Store collapsed state to preserve user preferences
        if (!this.collapsedSections) {
            this.collapsedSections = new Set();
        }
        
        // Calculate counts
        const priorityTaskCount = this.state.sortState.sortedGroups.reduce((total, groupId) => {
            const tasks = this.state.rankGroups.get(groupId);
            return total + (tasks ? tasks.length : 0);
        }, 0);
        
        const removedTaskCount = this.state.removedTasks.size;
        
        // Create sections
        const sections = [];
        
        // Priority Rankings Section
        if (priorityTaskCount > 0) {
            const priorityPreview = this.getPriorityPreview();
            sections.push({
                id: 'priority-rankings',
                title: 'Priority Rankings',
                className: 'priority-rankings-section',
                count: priorityTaskCount,
                preview: priorityPreview,
                expanded: !groupByAssignee, // Expand by default when not grouping by assignee
                renderContent: () => this.renderPriorityRankingsContent()
            });
        }
        
        // By Assignee Section
        if (groupByAssignee && priorityTaskCount > 0) {
            const assigneePreview = this.getAssigneePreview();
            sections.push({
                id: 'by-assignee',
                title: 'By Assignee',
                className: 'by-assignee-section',
                count: priorityTaskCount,
                preview: assigneePreview,
                expanded: true, // Expand by default when grouping by assignee
                renderContent: () => this.renderByAssigneeContent()
            });
        }
        
        // Removed Tasks Section
        if (removedTaskCount > 0) {
            const removedPreview = this.getRemovedTasksPreview();
            sections.push({
                id: 'removed-tasks',
                title: 'Removed Tasks',
                className: 'removed-tasks-section',
                count: removedTaskCount,
                preview: removedPreview,
                expanded: false, // Collapsed by default
                renderContent: () => this.renderRemovedTasksContent(groupByAssignee)
            });
        }
        
        // Render all sections
        sections.forEach(section => {
            const sectionElement = this.createCollapsibleSection(section);
            sortedResults.appendChild(sectionElement);
        });
        
        // Attach event listeners for collapsible functionality
        this.attachCollapsibleEventListeners();
    }

    // Create a collapsible section element
    createCollapsibleSection(sectionConfig) {
        const { id, title, className, count, preview, expanded, renderContent } = sectionConfig;
        
        const container = document.createElement('div');
        container.className = `collapsible-container ${className}`;
        container.setAttribute('data-section-id', id);
        
        // Check if section should be collapsed based on user preference
        const isCollapsed = this.collapsedSections.has(id) ? true : !expanded;
        
        // Create header
        const header = document.createElement('div');
        header.className = `section-header ${isCollapsed ? 'collapsed' : ''}`;
        header.innerHTML = `
            <div class="section-title">
                <span class="expand-indicator">${isCollapsed ? '▶' : '▼'}</span>
                ${title}
            </div>
            <div class="section-info">
                <span class="section-count">${count}</span>
                ${preview ? `<span class="section-preview">${preview}</span>` : ''}
            </div>
        `;
        
        // Create content
        const content = document.createElement('div');
        content.className = `section-content ${isCollapsed ? 'collapsed' : ''}`;
        
        if (!isCollapsed) {
            // Render content immediately if expanded
            const contentElement = renderContent();
            content.appendChild(contentElement);
        }
        
        container.appendChild(header);
        container.appendChild(content);
        
        return container;
    }

    // Get priority preview text
    getPriorityPreview() {
        if (this.state.sortState.sortedGroups.length === 0) return '';
        
        const firstGroupId = this.state.sortState.sortedGroups[0];
        const firstTask = this.state.rankGroups.get(firstGroupId)?.[0];
        
        if (firstTask) {
            const task = this.state.getTask(firstTask);
            const taskName = task.data[this.state.columnMapping.name] || 'Unnamed task';
            return `Top: ${taskName.substring(0, 30)}${taskName.length > 30 ? '...' : ''}`;
        }
        
        return '';
    }

    // Get assignee preview text
    getAssigneePreview() {
        const assignees = new Set();
        
        this.state.sortState.sortedGroups.forEach(groupId => {
            const tasks = this.state.rankGroups.get(groupId);
            tasks?.forEach(taskId => {
                const task = this.state.getTask(taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
                assignees.add(assignee);
            });
        });
        
        const assigneeList = Array.from(assignees).slice(0, 3);
        return assigneeList.length > 0 ? assigneeList.join(', ') + (assignees.size > 3 ? '...' : '') : '';
    }

    // Get removed tasks preview text
    getRemovedTasksPreview() {
        if (this.state.removedTasks.size === 0) return '';
        
        const firstRemovedId = Array.from(this.state.removedTasks)[0];
        const firstRemovedTask = this.state.getTask(firstRemovedId);
        
        if (firstRemovedTask) {
            const taskName = firstRemovedTask.data[this.state.columnMapping.name] || 'Unnamed task';
            return `${taskName.substring(0, 30)}${taskName.length > 30 ? '...' : ''}`;
        }
        
        return '';
    }

    // Render priority rankings content
    renderPriorityRankingsContent() {
        const container = document.createElement('div');
        const ol = document.createElement('ol');
        ol.className = 'sorted-list';
        
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks?.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
                const comment = this.state.taskComments[taskId] || '';
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
                    ${assignee ? `<span class="assignee-badge">${assignee}</span>` : ''}
                    ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                `;
                if (tasks.length > 1) {
                    li.innerHTML += `<span class="tie-indicator"> (tied with ${tasks.length - 1} other${tasks.length > 2 ? 's' : ''})</span>`;
                }
                ol.appendChild(li);
            });
        });
        
        container.appendChild(ol);
        return container;
    }

    // Render by assignee content
    renderByAssigneeContent() {
        const container = document.createElement('div');
        const assigneeGroups = new Map();
        
        // Group tasks by assignee
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks?.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
                
                if (!assigneeGroups.has(assignee)) {
                    assigneeGroups.set(assignee, []);
                }
                
                assigneeGroups.get(assignee).push({
                    task,
                    rank,
                    tieCount: tasks.length
                });
            });
        });
        
        // Sort assignees (Unassigned last)
        const sortedAssignees = Array.from(assigneeGroups.keys()).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
        
        // Render each assignee group
        sortedAssignees.forEach(assignee => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'assignee-group';
            
            const header = document.createElement('h3');
            header.className = 'assignee-header';
            header.innerHTML = `
                ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee} 
                <span class="task-count">(${assigneeGroups.get(assignee).length} task${assigneeGroups.get(assignee).length !== 1 ? 's' : ''})</span>
            `;
            groupDiv.appendChild(header);
            
            const ol = document.createElement('ol');
            ol.className = 'assignee-task-list';
            
            assigneeGroups.get(assignee).forEach(({ task, rank, tieCount }) => {
                const comment = this.state.taskComments[task.id] || '';
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="rank-badge">#${rank}</span>
                    <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
                    ${tieCount > 1 ? `<span class="tie-indicator"> (tied with ${tieCount - 1} other${tieCount > 2 ? 's' : ''})</span>` : ''}
                    ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                `;
                ol.appendChild(li);
            });
            
            groupDiv.appendChild(ol);
            container.appendChild(groupDiv);
        });
        
        return container;
    }

    // Render removed tasks content
    renderRemovedTasksContent(groupByAssignee) {
        const container = document.createElement('div');
        
        if (groupByAssignee) {
            // Group removed tasks by assignee
            const removedAssigneeGroups = new Map();
            
            this.state.removedTasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
                
                if (!removedAssigneeGroups.has(assignee)) {
                    removedAssigneeGroups.set(assignee, []);
                }
                
                removedAssigneeGroups.get(assignee).push(task);
            });
            
            // Sort removed assignees
            const sortedRemovedAssignees = Array.from(removedAssigneeGroups.keys()).sort((a, b) => {
                if (a === 'Unassigned') return 1;
                if (b === 'Unassigned') return -1;
                return a.localeCompare(b);
            });
            
            sortedRemovedAssignees.forEach(assignee => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'assignee-group removed-assignee-group';
                
                const header = document.createElement('h3');
                header.className = 'assignee-header removed-assignee-header';
                header.innerHTML = `
                    ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee} 
                    <span class="task-count">(${removedAssigneeGroups.get(assignee).length} removed task${removedAssigneeGroups.get(assignee).length !== 1 ? 's' : ''})</span>
                `;
                groupDiv.appendChild(header);
                
                const ul = document.createElement('ul');
                ul.className = 'assignee-task-list removed-task-list';
                
                removedAssigneeGroups.get(assignee).forEach(task => {
                    const comment = this.state.taskComments[task.id] || '';
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span class="removed-badge">REMOVED</span>
                        <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
                        ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                        <button class="restore-task-btn" data-task-id="${task.id}">Restore</button>
                    `;
                    ul.appendChild(li);
                });
                
                groupDiv.appendChild(ul);
                container.appendChild(groupDiv);
            });
        } else {
            // Flat list of removed tasks
            const removedList = document.createElement('ul');
            removedList.className = 'removed-tasks-list';
            
            this.state.removedTasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
                const comment = this.state.taskComments[taskId] || '';
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
                    ${assignee ? `<span class="assignee-badge">${assignee}</span>` : ''}
                    ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                    <button class="restore-task-btn" data-task-id="${taskId}">Restore</button>
                `;
                removedList.appendChild(li);
            });
            
            container.appendChild(removedList);
        }
        
        // Add restore functionality
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('restore-task-btn')) {
                const taskId = parseInt(e.target.getAttribute('data-task-id'));
                const event = new CustomEvent('taskRestored', { detail: { taskId } });
                document.dispatchEvent(event);
            }
        });
        
        return container;
    }

    // Attach event listeners for collapsible functionality
    attachCollapsibleEventListeners() {
        const headers = document.querySelectorAll('.section-header');
        
        headers.forEach(header => {
            header.addEventListener('click', (e) => {
                const container = header.closest('.collapsible-container');
                const sectionId = container.getAttribute('data-section-id');
                const content = container.querySelector('.section-content');
                const indicator = header.querySelector('.expand-indicator');
                
                const isCurrentlyCollapsed = header.classList.contains('collapsed');
                
                if (isCurrentlyCollapsed) {
                    // Expand
                    header.classList.remove('collapsed');
                    content.classList.remove('collapsed');
                    indicator.textContent = '▼';
                    this.collapsedSections.delete(sectionId);
                    
                    // Lazy load content if not already loaded
                    if (content.children.length === 0) {
                        const sectionConfig = this.getSectionConfig(sectionId);
                        if (sectionConfig && sectionConfig.renderContent) {
                            const contentElement = sectionConfig.renderContent();
                            content.appendChild(contentElement);
                        }
                    }
                } else {
                    // Collapse
                    header.classList.add('collapsed');
                    content.classList.add('collapsed');
                    indicator.textContent = '▶';
                    this.collapsedSections.add(sectionId);
                }
            });
        });
    }

    // Get section configuration by ID (helper for lazy loading)
    getSectionConfig(sectionId) {
        switch (sectionId) {
            case 'priority-rankings':
                return {
                    renderContent: () => this.renderPriorityRankingsContent()
                };
            case 'by-assignee':
                return {
                    renderContent: () => this.renderByAssigneeContent()
                };
            case 'removed-tasks':
                return {
                    renderContent: () => this.renderRemovedTasksContent(false) // Assume flat list for lazy loading
                };
            default:
                return null;
        }
    }

    // Show/hide sections
    showSection(sectionId) {
        const sections = ['setup-area', 'column-selection-area', 'sorting-area', 'results-area'];
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = id === sectionId ? 'block' : 'none';
            }
        });
    }
}

// Export for use in other modules
window.UIRenderer = UIRenderer;