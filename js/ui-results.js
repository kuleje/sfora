// UI Results module - handles results display and different layout designs
class UIResults {
    constructor(state, csvHandler, logger) {
        this.state = state;
        this.csvHandler = csvHandler;
        this.log = logger;
        this.rankingStyle = 'range'; // Default value
    }

    // Set ranking style
    setRankingStyle(style) {
        this.rankingStyle = style;
    }

    // Render results with selected design
    renderWithDesign(design, groupByAssignee) {
        const sortedResults = document.getElementById('sorted-results');
        sortedResults.innerHTML = '';
        
        switch (design) {
            case 'tabbed':
                // Will be handled by UITabs
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
                    task: task,
                    rank: rank,
                    comment: this.state.taskComments[taskId] || ''
                });
            });
        });
        
        // Sort assignees (Unassigned last)
        const sortedAssignees = Array.from(assigneeGroups.keys()).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
        
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
            
            const ul = document.createElement('ul');
            ul.className = 'assignee-task-list';
            
            assigneeGroups.get(assignee).forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="rank-badge">${item.rank}</span>
                    <span class="task-name-result">${item.task.data[this.state.columnMapping.name] || 'Unnamed task'}</span>
                    ${item.comment ? `<div class="task-comment-preview">${item.comment}</div>` : ''}
                `;
                ul.appendChild(li);
            });
            
            groupDiv.appendChild(ul);
            sortedResults.appendChild(groupDiv);
        });
        
        // Add removed tasks section if any exist
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
        
        const splitViewContainer = document.createElement('div');
        splitViewContainer.className = 'split-view-container';
        
        const mainArea = document.createElement('div');
        mainArea.className = 'split-view-main';
        
        const leftPanel = document.createElement('div');
        leftPanel.className = 'left-panel';
        leftPanel.innerHTML = '<div class="split-view-header">📋 Task List</div>';
        
        const rightPanel = document.createElement('div');
        rightPanel.className = 'right-panel';
        rightPanel.innerHTML = '<div class="task-detail-placeholder">Click a task to view details</div>';
        
        const resizer = document.createElement('div');
        resizer.className = 'panel-resizer';
        
        // Build task list for left panel
        this.buildTaskList(leftPanel, groupByAssignee);
        
        mainArea.appendChild(leftPanel);
        mainArea.appendChild(resizer);
        mainArea.appendChild(rightPanel);
        
        splitViewContainer.appendChild(mainArea);
        
        // Add removed tasks at bottom if any
        if (this.state.removedTasks.size > 0) {
            const bottomPanel = document.createElement('div');
            bottomPanel.className = 'bottom-panel';
            bottomPanel.innerHTML = '<div class="bottom-panel-header">🚫 Removed Tasks</div>';
            
            const removedList = document.createElement('div');
            this.state.removedTasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
                const comment = this.state.taskComments[taskId] || '';
                
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task-list-item';
                taskDiv.innerHTML = `
                    <span class="removed-badge">REMOVED</span>
                    <div class="task-list-item-content">
                        <div class="task-list-item-name">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                        ${assignee ? `<div class="task-list-item-assignee">${assignee}</div>` : ''}
                        ${comment ? `<div class="task-list-item-comment">${comment}</div>` : ''}
                    </div>
                    <button class="restore-task-btn" data-task-id="${taskId}">Restore</button>
                `;
                removedList.appendChild(taskDiv);
            });
            
            bottomPanel.appendChild(removedList);
            splitViewContainer.appendChild(bottomPanel);
        }
        
        sortedResults.appendChild(splitViewContainer);
        
        // Attach event listeners for split view
        this.attachSplitViewEventListeners(leftPanel, rightPanel);
    }

    // Build task list for split view
    buildTaskList(container, groupByAssignee) {
        if (groupByAssignee) {
            this.buildGroupedTaskList(container);
        } else {
            this.buildSimpleTaskList(container);
        }
    }

    // Build simple task list
    buildSimpleTaskList(container) {
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
                const comment = this.state.taskComments[taskId] || '';
                
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task-list-item';
                taskDiv.setAttribute('data-task-id', taskId);
                taskDiv.innerHTML = `
                    <span class="task-list-item-rank">${rank}</span>
                    <div class="task-list-item-content">
                        <div class="task-list-item-name">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                        ${assignee ? `<div class="task-list-item-assignee">${assignee}</div>` : ''}
                        ${comment ? `<div class="task-list-item-comment">${comment}</div>` : ''}
                    </div>
                `;
                container.appendChild(taskDiv);
            });
        });
    }

    // Build grouped task list
    buildGroupedTaskList(container) {
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
                    task: task,
                    rank: rank,
                    comment: this.state.taskComments[taskId] || ''
                });
            });
        });
        
        // Sort assignees
        const sortedAssignees = Array.from(assigneeGroups.keys()).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
        
        sortedAssignees.forEach(assignee => {
            const header = document.createElement('div');
            header.className = 'assignee-group-header';
            header.innerHTML = `
                ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee} 
                <span class="task-count">(${assigneeGroups.get(assignee).length})</span>
            `;
            container.appendChild(header);
            
            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'assignee-group-tasks';
            
            assigneeGroups.get(assignee).forEach(item => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task-list-item';
                taskDiv.setAttribute('data-task-id', item.task.id);
                taskDiv.innerHTML = `
                    <span class="task-list-item-rank">${item.rank}</span>
                    <div class="task-list-item-content">
                        <div class="task-list-item-name">${item.task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                        ${item.comment ? `<div class="task-list-item-comment">${item.comment}</div>` : ''}
                    </div>
                `;
                tasksContainer.appendChild(taskDiv);
            });
            
            container.appendChild(tasksContainer);
        });
    }

    // Attach split view event listeners
    attachSplitViewEventListeners(leftPanel, rightPanel) {
        leftPanel.addEventListener('click', (e) => {
            const taskItem = e.target.closest('.task-list-item');
            if (taskItem) {
                // Remove previous selection
                leftPanel.querySelectorAll('.task-list-item').forEach(item => {
                    item.classList.remove('selected');
                });
                
                // Add selection to clicked item
                taskItem.classList.add('selected');
                
                // Show task details
                const taskId = parseInt(taskItem.getAttribute('data-task-id'));
                this.showTaskDetails(taskId, rightPanel);
            }
        });
        
        // Handle restore buttons
        leftPanel.addEventListener('click', (e) => {
            if (e.target.classList.contains('restore-task-btn')) {
                const taskId = parseInt(e.target.getAttribute('data-task-id'));
                const event = new CustomEvent('taskRestored', { detail: { taskId } });
                document.dispatchEvent(event);
            }
        });
    }

    // Show task details in right panel
    showTaskDetails(taskId, rightPanel) {
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

    // Render collapsible sections
    renderCollapsibleSections(groupByAssignee = false) {
        const sortedResults = document.getElementById('sorted-results');
        
        // Create sections
        const sections = [
            {
                id: 'priority-rankings',
                title: 'Priority Rankings',
                icon: '📊',
                content: () => this.renderPriorityRankingsContent(),
                preview: () => this.getPriorityPreview()
            },
            {
                id: 'by-assignee',
                title: 'By Assignee',
                icon: '👤',
                content: () => this.renderByAssigneeContent(),
                preview: () => this.getAssigneePreview()
            }
        ];
        
        if (this.state.removedTasks.size > 0) {
            sections.push({
                id: 'removed-tasks',
                title: 'Removed Tasks',
                icon: '🚫',
                content: () => this.renderRemovedTasksContent(groupByAssignee),
                preview: () => this.getRemovedTasksPreview()
            });
        }
        
        // Render all sections
        sections.forEach(sectionConfig => {
            const sectionElement = this.createCollapsibleSection(sectionConfig);
            sortedResults.appendChild(sectionElement);
        });
        
        this.attachCollapsibleEventListeners();
    }

    // Create a collapsible section element
    createCollapsibleSection(sectionConfig) {
        const section = document.createElement('div');
        section.className = `collapsible-container ${sectionConfig.id}-section`;
        section.setAttribute('data-section-id', sectionConfig.id);
        
        // Check if section should be collapsed based on user preference
        const isCollapsed = localStorage.getItem(`sfora.section.${sectionConfig.id}.collapsed`) === 'true';
        
        const header = document.createElement('div');
        header.className = `section-header ${isCollapsed ? 'collapsed' : ''}`;
        header.innerHTML = `
            <h3 class="section-title">
                <span class="expand-indicator">${isCollapsed ? '▶' : '▼'}</span>
                ${sectionConfig.icon} ${sectionConfig.title}
            </h3>
            <div class="section-info">
                <span class="section-count">${this.getSectionCount(sectionConfig.id)}</span>
                <span class="section-preview">${sectionConfig.preview()}</span>
            </div>
        `;
        
        const content = document.createElement('div');
        content.className = `section-content ${isCollapsed ? 'collapsed' : ''}`;
        
        // Lazy load content only if not collapsed
        if (!isCollapsed) {
            content.appendChild(sectionConfig.content());
        }
        
        section.appendChild(header);
        section.appendChild(content);
        
        return section;
    }

    // Get section count
    getSectionCount(sectionId) {
        switch (sectionId) {
            case 'priority-rankings':
                return this.state.sortState.sortedGroups.length;
            case 'by-assignee':
                const assigneeGroups = new Map();
                this.state.sortState.sortedGroups.forEach((groupId) => {
                    const tasks = this.state.rankGroups.get(groupId);
                    tasks.forEach(taskId => {
                        const task = this.state.allTasks.find(t => t.id === taskId);
                        const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
                        assigneeGroups.set(assignee, true);
                    });
                });
                return assigneeGroups.size;
            case 'removed-tasks':
                return this.state.removedTasks.size;
            default:
                return 0;
        }
    }

    // Get priority preview
    getPriorityPreview() {
        if (this.state.sortState.sortedGroups.length === 0) return '';
        
        const firstGroupId = this.state.sortState.sortedGroups[0];
        const firstTasks = this.state.rankGroups.get(firstGroupId);
        if (!firstTasks || firstTasks.length === 0) return '';
        
        const firstTask = this.state.allTasks.find(t => t.id === firstTasks[0]);
        const taskName = firstTask.data[this.state.columnMapping.name] || 'Unnamed task';
        return `Top: ${taskName.substring(0, 30)}${taskName.length > 30 ? '...' : ''}`;
    }

    // Get assignee preview
    getAssigneePreview() {
        const assigneeGroups = new Map();
        this.state.sortState.sortedGroups.forEach((groupId) => {
            const tasks = this.state.rankGroups.get(groupId);
            tasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
                if (!assigneeGroups.has(assignee)) {
                    assigneeGroups.set(assignee, 0);
                }
                assigneeGroups.set(assignee, assigneeGroups.get(assignee) + 1);
            });
        });
        
        const sortedAssignees = Array.from(assigneeGroups.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        return sortedAssignees.map(([name, count]) => `${name}: ${count}`).join(', ');
    }

    // Get removed tasks preview
    getRemovedTasksPreview() {
        if (this.state.removedTasks.size === 0) return '';
        
        const firstRemovedId = Array.from(this.state.removedTasks)[0];
        const firstRemovedTask = this.state.allTasks.find(t => t.id === firstRemovedId);
        const taskName = firstRemovedTask.data[this.state.columnMapping.name] || 'Unnamed task';
        return `${taskName.substring(0, 30)}${taskName.length > 30 ? '...' : ''}`;
    }

    // Render priority rankings content
    renderPriorityRankingsContent() {
        const container = document.createElement('div');
        container.className = 'task-list-ranked';
        
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            if (tasks.length > 1) {
                // Handle tied tasks
                const tiedContainer = document.createElement('div');
                tiedContainer.className = 'tied-tasks-container';
                
                tasks.forEach(taskId => {
                    const task = this.state.allTasks.find(t => t.id === taskId);
                    const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
                    const comment = this.state.taskComments[taskId] || '';
                    
                    const taskDiv = document.createElement('div');
                    taskDiv.className = 'task-item-ranked tied';
                    taskDiv.innerHTML = `
                        <span class="rank-range">${this.getRankRange(groupIndex, tasks.length, rank)}</span>
                        <div class="task-content">
                            <div class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                            <div class="task-meta">
                                ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                                ${assignee ? `<div class="assignee-badge">${assignee}</div>` : ''}
                            </div>
                        </div>
                    `;
                    tiedContainer.appendChild(taskDiv);
                });
                
                container.appendChild(tiedContainer);
            } else {
                // Single task
                const taskId = tasks[0];
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
                const comment = this.state.taskComments[taskId] || '';
                
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task-item-ranked';
                taskDiv.innerHTML = `
                    <span class="rank-range">${this.getRankRange(groupIndex, 1, rank)}</span>
                    <div class="task-content">
                        <div class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                        <div class="task-meta">
                            ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                            ${assignee ? `<div class="assignee-badge">${assignee}</div>` : ''}
                        </div>
                    </div>
                `;
                container.appendChild(taskDiv);
            }
        });
        
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
            
            tasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]) || 'Unassigned';
                
                if (!assigneeGroups.has(assignee)) {
                    assigneeGroups.set(assignee, []);
                }
                
                assigneeGroups.get(assignee).push({
                    task: task,
                    rank: rank,
                    comment: this.state.taskComments[taskId] || ''
                });
            });
        });
        
        // Sort assignees
        const sortedAssignees = Array.from(assigneeGroups.keys()).sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
        
        sortedAssignees.forEach(assignee => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'assignee-group';
            
            const header = document.createElement('h4');
            header.className = 'assignee-header';
            header.innerHTML = `
                ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee} 
                <span class="task-count">(${assigneeGroups.get(assignee).length})</span>
            `;
            groupDiv.appendChild(header);
            
            const taskList = document.createElement('div');
            taskList.className = 'assignee-task-list-ranked';
            
            assigneeGroups.get(assignee).forEach(item => {
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task-item-ranked';
                taskDiv.innerHTML = `
                    <span class="rank-range">${item.rank}</span>
                    <div class="task-content">
                        <div class="task-name-result">${item.task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                        ${item.comment ? `<div class="task-comment-preview">${item.comment}</div>` : ''}
                    </div>
                `;
                taskList.appendChild(taskDiv);
            });
            
            groupDiv.appendChild(taskList);
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
            
            // Sort assignees
            const sortedAssignees = Array.from(removedAssigneeGroups.keys()).sort((a, b) => {
                if (a === 'Unassigned') return 1;
                if (b === 'Unassigned') return -1;
                return a.localeCompare(b);
            });
            
            sortedAssignees.forEach(assignee => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'assignee-group';
                
                const header = document.createElement('h4');
                header.className = 'assignee-header';
                header.innerHTML = `
                    ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee} 
                    <span class="task-count">(${removedAssigneeGroups.get(assignee).length})</span>
                `;
                groupDiv.appendChild(header);
                
                const taskList = document.createElement('div');
                taskList.className = 'assignee-task-list-ranked';
                
                removedAssigneeGroups.get(assignee).forEach(task => {
                    const comment = this.state.taskComments[task.id] || '';
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
                    taskList.appendChild(taskDiv);
                });
                
                groupDiv.appendChild(taskList);
                container.appendChild(groupDiv);
            });
        } else {
            // Simple list of removed tasks
            this.state.removedTasks.forEach(taskId => {
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
                const comment = this.state.taskComments[taskId] || '';
                
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task-item-ranked';
                taskDiv.innerHTML = `
                    <span class="removed-badge">REMOVED</span>
                    <div class="task-content">
                        <div class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                        <div class="task-meta">
                            ${comment ? `<div class="task-comment-preview">${comment}</div>` : ''}
                            ${assignee ? `<div class="assignee-badge">${assignee}</div>` : ''}
                        </div>
                    </div>
                    <button class="restore-task-btn" data-task-id="${taskId}">Restore</button>
                `;
                container.appendChild(taskDiv);
            });
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

    // Attach collapsible event listeners
    attachCollapsibleEventListeners() {
        const headers = document.querySelectorAll('.section-header');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const section = header.parentElement;
                const sectionId = section.getAttribute('data-section-id');
                const content = section.querySelector('.section-content');
                const indicator = header.querySelector('.expand-indicator');
                
                const isCollapsed = header.classList.contains('collapsed');
                
                if (isCollapsed) {
                    // Expand
                    header.classList.remove('collapsed');
                    content.classList.remove('collapsed');
                    indicator.textContent = '▼';
                    
                    // Lazy load content if empty
                    if (content.children.length === 0) {
                        const sectionConfig = this.getSectionConfig(sectionId);
                        if (sectionConfig && sectionConfig.content) {
                            content.appendChild(sectionConfig.content());
                        }
                    }
                    
                    localStorage.setItem(`sfora.section.${sectionId}.collapsed`, 'false');
                } else {
                    // Collapse
                    header.classList.add('collapsed');
                    content.classList.add('collapsed');
                    indicator.textContent = '▶';
                    localStorage.setItem(`sfora.section.${sectionId}.collapsed`, 'true');
                }
            });
        });
    }

    // Get section configuration by ID (helper for lazy loading)
    getSectionConfig(sectionId) {
        const configs = {
            'priority-rankings': {
                content: () => this.renderPriorityRankingsContent()
            },
            'by-assignee': {
                content: () => this.renderByAssigneeContent()
            },
            'removed-tasks': {
                content: () => this.renderRemovedTasksContent(false)
            }
        };
        
        return configs[sectionId];
    }

    // Show/hide sections
    showSection(sectionId) {
        const section = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (section) {
            const header = section.querySelector('.section-header');
            const content = section.querySelector('.section-content');
            const indicator = header.querySelector('.expand-indicator');
            
            header.classList.remove('collapsed');
            content.classList.remove('collapsed');
            indicator.textContent = '▼';
            
            // Lazy load content if empty
            if (content.children.length === 0) {
                const sectionConfig = this.getSectionConfig(sectionId);
                if (sectionConfig && sectionConfig.content) {
                    content.appendChild(sectionConfig.content());
                }
            }
            
            localStorage.setItem(`sfora.section.${sectionId}.collapsed`, 'false');
        }
    }
}

// Export for use in other modules
window.UIResults = UIResults;