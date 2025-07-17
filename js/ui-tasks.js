// UI Tasks module - handles individual task display and interaction
class UITasks {
    constructor(state, csvHandler, logger) {
        this.state = state;
        this.csvHandler = csvHandler;
        this.log = logger;
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

    // Render task for split view
    renderTaskForSplitView(task, rank, assignee = null, comment = '') {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-list-item';
        taskDiv.setAttribute('data-task-id', task.id);
        
        taskDiv.innerHTML = `
            <span class="task-list-item-rank">${rank}</span>
            <div class="task-list-item-content">
                <div class="task-list-item-name">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                ${assignee ? `<div class="task-list-item-assignee">${assignee}</div>` : ''}
                ${comment ? `<div class="task-list-item-comment">${comment}</div>` : ''}
            </div>
        `;
        
        return taskDiv;
    }

    // Render task details for split view right panel
    renderTaskDetails(taskId, rightPanel) {
        const task = this.state.allTasks.find(t => t.id === taskId);
        if (!task) return;
        
        const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
        const comment = this.state.taskComments[taskId] || '';
        
        // Find rank
        let rank = 0;
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            if (tasks.includes(taskId)) {
                rank = groupIndex + 1;
            }
        });
        
        // Check for ties
        const groupId = this.state.getTaskGroupId(taskId);
        const groupTasks = this.state.rankGroups.get(groupId);
        const hasTies = groupTasks && groupTasks.length > 1;
        
        rightPanel.innerHTML = `
            <div class="task-detail-view">
                <div class="task-detail-rank">Rank ${rank}</div>
                <div class="task-detail-name">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                ${assignee ? `<div class="task-detail-assignee">${assignee}</div>` : ''}
                ${task.data[this.state.columnMapping.description] ? `<div class="task-detail-description">${task.data[this.state.columnMapping.description]}</div>` : ''}
                ${hasTies ? `<div class="task-detail-ties">⚖️ Tied with ${groupTasks.length - 1} other task${groupTasks.length > 2 ? 's' : ''}</div>` : ''}
                <div class="task-detail-comment-section">
                    <label for="detail-comment-${taskId}" class="comment-label">Note:</label>
                    <textarea id="detail-comment-${taskId}" class="task-comment" placeholder="Add a note about this task...">${comment}</textarea>
                </div>
            </div>
        `;
        
        // Add comment functionality
        const commentField = rightPanel.querySelector(`#detail-comment-${taskId}`);
        if (commentField) {
            commentField.addEventListener('input', () => {
                this.state.taskComments[taskId] = commentField.value;
            });
        }
    }

    // Render task for list display
    renderTaskForList(task, rank, assignee = null, comment = '', hasTies = false, tieCount = 0) {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
            ${assignee ? `<span class="assignee-badge">${assignee}</span>` : ''}
            ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
        `;
        
        if (hasTies) {
            li.innerHTML += `<span class="tie-indicator"> (tied with ${tieCount} other${tieCount > 1 ? 's' : ''})</span>`;
        }
        
        return li;
    }

    // Render task for ranked display
    renderTaskForRankedList(task, rank, assignee = null, comment = '', rankRange = null) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item-ranked';
        
        taskDiv.innerHTML = `
            <span class="rank-range">${rankRange || rank}</span>
            <div class="task-content">
                <div class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                <div class="task-meta">
                    ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                    ${assignee ? `<div class="assignee-badge">${assignee}</div>` : ''}
                </div>
            </div>
        `;
        
        return taskDiv;
    }

    // Render removed task item
    renderRemovedTask(task, assignee = null, comment = '') {
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
            ${assignee ? `<span class="assignee-badge">${assignee}</span>` : ''}
            ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
            <button class="restore-task-btn" data-task-id="${task.id}">Restore</button>
        `;
        
        return li;
    }

    // Render removed task with rank badge
    renderRemovedTaskRanked(task, comment = '') {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task-item-ranked';
        
        taskDiv.innerHTML = `
            <span class="removed-badge">REMOVED</span>
            <div class="task-content">
                <div class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
            </div>
            <button class="restore-task-btn" data-task-id="${task.id}">Restore</button>
        `;
        
        return taskDiv;
    }

    // Attach restore functionality to container
    attachRestoreEventListeners(container) {
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('restore-task-btn')) {
                const taskId = parseInt(e.target.getAttribute('data-task-id'));
                const event = new CustomEvent('taskRestored', { detail: { taskId } });
                document.dispatchEvent(event);
            }
        });
    }

    // Build task list for different display modes
    buildTaskList(tasks, displayMode = 'simple') {
        const fragment = document.createDocumentFragment();
        
        switch (displayMode) {
            case 'simple':
                tasks.forEach(taskInfo => {
                    const taskElement = this.renderTaskForList(
                        taskInfo.task, 
                        taskInfo.rank, 
                        taskInfo.assignee, 
                        taskInfo.comment,
                        taskInfo.hasTies,
                        taskInfo.tieCount
                    );
                    fragment.appendChild(taskElement);
                });
                break;
                
            case 'ranked':
                tasks.forEach(taskInfo => {
                    const taskElement = this.renderTaskForRankedList(
                        taskInfo.task, 
                        taskInfo.rank, 
                        taskInfo.assignee, 
                        taskInfo.comment,
                        taskInfo.rankRange
                    );
                    fragment.appendChild(taskElement);
                });
                break;
                
            case 'split-view':
                tasks.forEach(taskInfo => {
                    const taskElement = this.renderTaskForSplitView(
                        taskInfo.task, 
                        taskInfo.rank, 
                        taskInfo.assignee, 
                        taskInfo.comment
                    );
                    fragment.appendChild(taskElement);
                });
                break;
        }
        
        return fragment;
    }

    // Build removed task list
    buildRemovedTaskList(removedTasks, displayMode = 'simple') {
        const fragment = document.createDocumentFragment();
        
        removedTasks.forEach(taskId => {
            const task = this.state.allTasks.find(t => t.id === taskId);
            const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
            const comment = this.state.taskComments[taskId] || '';
            
            let taskElement;
            if (displayMode === 'ranked') {
                taskElement = this.renderRemovedTaskRanked(task, comment);
            } else {
                taskElement = this.renderRemovedTask(task, assignee, comment);
            }
            
            fragment.appendChild(taskElement);
        });
        
        return fragment;
    }

    // Get task display information
    getTaskDisplayInfo(taskId) {
        const task = this.state.allTasks.find(t => t.id === taskId);
        if (!task) return null;
        
        const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
        const comment = this.state.taskComments[taskId] || '';
        
        // Find rank
        let rank = 0;
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            if (tasks.includes(taskId)) {
                rank = groupIndex + 1;
            }
        });
        
        // Check for ties
        const groupId = this.state.getTaskGroupId(taskId);
        const groupTasks = this.state.rankGroups.get(groupId);
        const hasTies = groupTasks && groupTasks.length > 1;
        const tieCount = hasTies ? groupTasks.length - 1 : 0;
        
        return {
            task,
            rank,
            assignee,
            comment,
            hasTies,
            tieCount,
            groupTasks
        };
    }
}

// Export for use in other modules
window.UITasks = UITasks;