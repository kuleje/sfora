// Task comparison display module
class UIComparison {
    constructor(state, csvHandler, logger) {
        this.state = state;
        this.csvHandler = csvHandler;
        this.log = logger;
    }

    // Display comparison between two tasks
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
        
        if (progressBar && progressText) {
            progressBar.style.width = `${progressInfo.progress}%`;
            
            // Show different messages based on estimation availability
            if (progressInfo.showEstimation) {
                progressText.textContent = `Sorted ${progressInfo.sortedTasks} of ${progressInfo.totalTasks} tasks (~${progressInfo.estimatedRemaining} comparisons left)`;
            } else {
                progressText.textContent = `Sorted ${progressInfo.sortedTasks} of ${progressInfo.totalTasks} tasks (calculating estimate...)`;
            }
        }
    }
}

// Export for use in other modules
window.UIComparison = UIComparison;