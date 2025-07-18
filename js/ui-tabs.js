// UI Tabs module - handles tabbed interface management
class UITabs {
    constructor(state, csvHandler, logger, uiQuarterly) {
        this.state = state;
        this.csvHandler = csvHandler;
        this.log = logger;
        this.uiQuarterly = uiQuarterly;
        this.rankingStyle = 'range'; // Default value
        this.lastSelectedTabKey = 'taskSorter_lastSelectedTab';
        
        // Initialize shared assignee color manager
        this.assigneeColorManager = new AssigneeColorManager();
    }

    // Set ranking style
    setRankingStyle(style) {
        this.rankingStyle = style;
    }

    // Save selected tab to localStorage
    saveSelectedTab(tabName) {
        try {
            localStorage.setItem(this.lastSelectedTabKey, tabName);
        } catch (error) {
            this.log(`Error saving selected tab: ${error.message}`);
        }
    }

    // Load selected tab from localStorage
    loadSelectedTab() {
        try {
            return localStorage.getItem(this.lastSelectedTabKey);
        } catch (error) {
            this.log(`Error loading selected tab: ${error.message}`);
            return null;
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

    // Render tabbed interface
    renderTabbedInterface(groupByAssignee) {
        const sortedResults = document.getElementById('sorted-results');
        sortedResults.innerHTML = '';
        
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
        
        const quarterlyStatusTab = document.createElement('button');
        quarterlyStatusTab.className = 'tab-button';
        quarterlyStatusTab.textContent = 'Quarterly Status';
        quarterlyStatusTab.setAttribute('data-tab', 'quarterly-status');
        
        const removedTasksTab = document.createElement('button');
        removedTasksTab.className = 'tab-button';
        removedTasksTab.textContent = `Removed Tasks (${this.state.removedTasks.size})`;
        removedTasksTab.setAttribute('data-tab', 'removed-tasks');
        
        // Set initial active tab based on persisted selection or groupByAssignee parameter
        const savedTab = this.loadSelectedTab();
        let initialTab = 'all-tasks';
        
        if (savedTab && [allTasksTab, byAssigneeTab, quarterlyStatusTab, removedTasksTab].find(tab => tab.getAttribute('data-tab') === savedTab)) {
            initialTab = savedTab;
        } else if (groupByAssignee) {
            initialTab = 'by-assignee';
        }
        
        // Set active tab button
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        const activeButton = [allTasksTab, byAssigneeTab, quarterlyStatusTab, removedTasksTab].find(tab => tab.getAttribute('data-tab') === initialTab);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        tabButtons.appendChild(allTasksTab);
        tabButtons.appendChild(byAssigneeTab);
        tabButtons.appendChild(quarterlyStatusTab);
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
                case 'quarterly-status':
                    this.uiQuarterly.renderQuarterlyStatusInTab(tabContent);
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
                
                // Save selected tab to localStorage
                this.saveSelectedTab(targetTab);
                
                // Render content for selected tab
                renderTabContent(targetTab);
            }
        });
        
        // Render initial content
        renderTabContent(initialTab);
    }

    // Helper method to render default list in tab
    renderDefaultListInTab(container) {
        if (this.state.sortState.sortedGroups.length === 0) {
            container.innerHTML = `
                <div class="empty-tab-message">
                    <p>No tasks have been sorted yet.</p>
                    <p class="empty-tab-hint">Complete the sorting process to see results here.</p>
                </div>
            `;
            return;
        }

        const taskList = document.createElement('div');
        taskList.className = 'task-list-ranked';
        
        let currentRank = 1;
        this.state.sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = this.state.rankGroups.get(groupId);
            const rank = currentRank;
            
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
                        <span class="rank-range">${this.getRankRange(0, tasks.length, rank)}</span>
                        <div class="task-content">
                            <div class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                            <div class="task-meta">
                                <div class="task-comment-preview">${comment || ''}</div>
                                ${assignee ? `<div class="assignee-badge">${assignee}</div>` : ''}
                            </div>
                        </div>
                    `;
                    tiedContainer.appendChild(taskDiv);
                });
                
                taskList.appendChild(tiedContainer);
            } else {
                // Single task
                const taskId = tasks[0];
                const task = this.state.allTasks.find(t => t.id === taskId);
                const assignee = this.csvHandler.parseAssignee(task.data[this.state.columnMapping.assignee]);
                const comment = this.state.taskComments[taskId] || '';
                
                const taskDiv = document.createElement('div');
                taskDiv.className = 'task-item-ranked';
                taskDiv.innerHTML = `
                    <span class="rank-range">${this.getRankRange(0, 1, rank)}</span>
                    <div class="task-content">
                        <div class="task-name-result">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                        <div class="task-meta">
                            <div class="task-comment-preview">${comment || ''}</div>
                            ${assignee ? `<div class="assignee-badge">${assignee}</div>` : ''}
                        </div>
                    </div>
                `;
                taskList.appendChild(taskDiv);
            }
            
            // Advance rank by number of tasks in this group
            currentRank += tasks.length;
        });
        
        container.appendChild(taskList);
    }

    // Helper method to render grouped by assignee in tab
    renderGroupedByAssigneeInTab(container) {
        if (this.state.sortState.sortedGroups.length === 0) {
            container.innerHTML = `
                <div class="empty-tab-message">
                    <p>No tasks have been sorted yet.</p>
                    <p class="empty-tab-hint">Complete the sorting process to see results here.</p>
                </div>
            `;
            return;
        }

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
            
            // Apply assignee color
            const assigneeColor = this.assigneeColorManager.getAssigneeColor(assignee);
            const textColor = this.assigneeColorManager.getTextColorForBackground(assigneeColor);
            header.style.backgroundColor = assigneeColor;
            header.style.color = textColor;
            
            header.innerHTML = `
                ${assignee === 'Unassigned' ? '❓' : '👤'} ${assignee} 
                <span class="task-count">(${assigneeGroups.get(assignee).length} task${assigneeGroups.get(assignee).length !== 1 ? 's' : ''})</span>
            `;
            groupDiv.appendChild(header);
            
            const ul = document.createElement('ul');
            ul.className = 'assignee-task-list';
            
            // Sort tasks within this assignee group by their global rank
            const sortedTasks = assigneeGroups.get(assignee).sort((a, b) => a.rank - b.rank);
            
            sortedTasks.forEach((item, localIndex) => {
                const localRank = localIndex + 1;
                
                // Find the group this task belongs to globally and check if it's tied
                const globalGroupId = this.state.sortState.sortedGroups.find(groupId => {
                    const tasks = this.state.rankGroups.get(groupId);
                    return tasks.includes(item.task.id);
                });
                
                const globalTasks = this.state.rankGroups.get(globalGroupId) || [];
                const isTied = globalTasks.length > 1;
                
                // Calculate global rank display using the same logic as the other tab
                let globalRankDisplay;
                const globalRankIndex = this.state.sortState.sortedGroups.indexOf(globalGroupId);
                let currentRank = 1;
                for (let i = 0; i < globalRankIndex; i++) {
                    const prevGroupId = this.state.sortState.sortedGroups[i];
                    const prevTasks = this.state.rankGroups.get(prevGroupId) || [];
                    currentRank += prevTasks.length;
                }
                globalRankDisplay = this.getRankRange(globalRankIndex, globalTasks.length, currentRank);
                
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="rank-badge-container">
                        <span class="rank-badge-local" title="Rank within ${assignee}">
                            ${localRank}
                        </span>
                        <span class="rank-badge-global ${isTied ? 'tied' : ''}" title="Rank within team">
                            ${globalRankDisplay}
                        </span>
                    </div>
                    <div class="task-content-assignee">
                        <div class="task-meta-assignee">
                            <div class="task-name-portion">${item.task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                            <div class="task-comment-preview">${item.comment || ''}</div>
                        </div>
                    </div>
                `;
                ul.appendChild(li);
            });
            
            groupDiv.appendChild(ul);
            container.appendChild(groupDiv);
        });
    }

    // Helper method to render removed tasks in tab
    renderRemovedTasksInTab(container) {
        // Always add back to sorting button first
        const backToSortingDiv = document.createElement('div');
        backToSortingDiv.className = 'back-to-sorting-section';
        
        // Check if sorting is complete (no more tasks to sort)
        const hasTasksToSort = this.state.sortState.unSorted.length > 0 || this.state.sortState.currentItem !== null;
        const sortingComplete = this.state.sortState.done && !hasTasksToSort;
        

        
        const buttonClass = sortingComplete ? 'back-to-sorting-btn disabled' : 'back-to-sorting-btn';
        const buttonText = sortingComplete ? '✓ Sorting Complete' : '← Back to Sorting';
        const hintText = sortingComplete ? 'All tasks have been sorted' : 'Continue sorting tasks or restore removed tasks below';
        
        backToSortingDiv.innerHTML = `
            <button class="${buttonClass}" id="back-to-sorting-btn" ${sortingComplete ? 'disabled' : ''}>
                ${buttonText}
            </button>
            <p class="back-to-sorting-hint">${hintText}</p>
        `;
        container.appendChild(backToSortingDiv);

        // If no removed tasks, show empty message and return
        if (this.state.removedTasks.size === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-tab-message';
            emptyMessage.innerHTML = `
                <p>No tasks have been removed from sorting.</p>
                <p class="empty-tab-hint">Tasks removed during sorting will appear here.</p>
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
            header.className = 'assignee-header';
            
            // Apply assignee color
            const assigneeColor = this.assigneeColorManager.getAssigneeColor(assignee);
            const textColor = this.assigneeColorManager.getTextColorForBackground(assigneeColor);
            header.style.backgroundColor = assigneeColor;
            header.style.color = textColor;
            
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
                    <div class="task-content-assignee">
                        <div class="task-meta-assignee">
                            <div class="task-name-portion">${task.data[this.state.columnMapping.name] || 'Unnamed task'}</div>
                            <div class="task-comment-preview">${comment || ''}</div>
                        </div>
                    </div>
                    <button class="restore-task-btn" data-task-id="${task.id}">Restore</button>
                `;
                ul.appendChild(li);
            });
            
            groupDiv.appendChild(ul);
            container.appendChild(groupDiv);
        });
        
        // Add restore functionality and back to sorting button
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('restore-task-btn')) {
                const taskId = parseInt(e.target.getAttribute('data-task-id'));
                const event = new CustomEvent('taskRestored', { detail: { taskId } });
                document.dispatchEvent(event);
            } else if (e.target.classList.contains('back-to-sorting-btn') && !e.target.disabled) {
                // Dispatch event to continue sorting from where we left off
                const event = new CustomEvent('backToSorting');
                document.dispatchEvent(event);
            }
        });
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
}

// Export for use in other modules
window.UITabs = UITabs;