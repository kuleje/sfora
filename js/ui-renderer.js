// UI rendering and display utilities module
class UIRenderer {
    constructor(state, csvHandler, logger) {
        this.state = state;
        this.csvHandler = csvHandler;
        this.log = logger;
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
        
        if (groupByAssignee) {
            this.renderGroupedByAssignee();
        } else {
            this.renderDefaultList();
        }
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

    // Show debug controls
    showDebugControls() {
        const debugElements = ['debug-controls', 'debug-controls-sorting', 'debug-controls-results', 'debug-controls-main'];
        debugElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'block';
        });
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