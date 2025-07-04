document.addEventListener("DOMContentLoaded", function() {
    const statusLog = document.getElementById('status-log');

    function log(message) {
        statusLog.innerHTML = `<strong>Status:</strong> ${message}`;
        console.log(message);
    }

    const csvFileInput = document.getElementById('csv-file');
    const loadCsvButton = document.getElementById('load-csv-button');
    const setupArea = document.getElementById('setup-area');
    const columnSelectionArea = document.getElementById('column-selection-area');
    const taskIdColumn = document.getElementById('task-id-column');
    const taskNameColumn = document.getElementById('task-name-column');
    const taskDescriptionColumn = document.getElementById('task-description-column');
    const taskAssigneeColumn = document.getElementById('task-assignee-column');
    const taskUrlBase = document.getElementById('task-url-base');
    const taskIdPreview = document.getElementById('task-id-preview');
    const taskNamePreview = document.getElementById('task-name-preview');
    const taskDescriptionPreview = document.getElementById('task-description-preview');
    const taskAssigneePreview = document.getElementById('task-assignee-preview');
    const startSortingButton = document.getElementById('start-sorting-button');
    const sortingArea = document.getElementById('sorting-area');
    const resultsArea = document.getElementById('results-area');
    const taskAElement = document.getElementById('task-a');
    const taskBElement = document.getElementById('task-b');
    const qrAElement = document.getElementById('qr-a');
    const qrBElement = document.getElementById('qr-b');
    const sortedResults = document.getElementById('sorted-results');
    const groupByAssigneeCheckbox = document.getElementById('group-by-assignee');
    const exportCsvButton = document.getElementById('export-csv');
    const restartButton = document.getElementById('restart');
    const restartSortingButton = document.getElementById('restart-sorting');
    const undoButton = document.getElementById('undo-button');
    const exportPartialButton = document.getElementById('export-partial');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    let allTasks = [];
    let sortState = {};
    let rankGroups = new Map(); // Map of groupId -> array of taskIds
    let taskToGroup = new Map(); // Map of taskId -> groupId
    let columnMapping = { id: '', name: '', description: '', assignee: '' };
    let taskUrlBaseValue = 'https://app.clickup.com/t/4540126/';
    let rawData = [];
    let taskComments = {};
    let actionHistory = []; // Track actions for undo functionality // Store comments for each task comparison

    function loadState() {
        log('Checking for saved state...');
        const savedState = localStorage.getItem('taskSorterState');
        if (savedState) {
            log('Saved state found. Loading...');
            const state = JSON.parse(savedState);
            allTasks = state.allTasks;
            sortState = state.sortState;
            columnMapping = state.columnMapping || { id: '', name: '', description: '', assignee: '' };
            taskUrlBaseValue = state.taskUrlBase || 'https://app.clickup.com/t/4540126/';
            rawData = state.rawData;
            taskComments = state.taskComments || {};
            
            // Load rank groups
            if (state.rankGroups && state.taskToGroup) {
                rankGroups = new Map(state.rankGroups);
                taskToGroup = new Map(state.taskToGroup);
            } else {
                // Initialize groups if not saved (backwards compatibility)
                rankGroups.clear();
                taskToGroup.clear();
                if (allTasks.length > 0) {
                    allTasks.forEach(task => {
                        const groupId = `single_${task.id}`;
                        rankGroups.set(groupId, [task.id]);
                        taskToGroup.set(task.id, groupId);
                    });
                }
            }
            
            // Load action history
            actionHistory = state.actionHistory || [];

            if (allTasks.length > 0) {
                setupArea.style.display = 'none';
                if (!sortState.done) {
                    sortingArea.style.display = 'block';
                    log('Resuming sort...');
                    continueSort();
                } else {
                    sortingArea.style.display = 'none';
                    log('Displaying results from saved state...');
                    displayResults();
                }
            }
        } else {
            log('No saved state found.');
        }
    }

    function saveState() {
        const state = { 
            allTasks, 
            sortState, 
            columnMapping, 
            taskUrlBase: taskUrlBaseValue, 
            rawData, 
            taskComments,
            rankGroups: Array.from(rankGroups.entries()),
            taskToGroup: Array.from(taskToGroup.entries()),
            actionHistory: actionHistory
        };
        localStorage.setItem('taskSorterState', JSON.stringify(state));
    }

    function parseCSV(file) {
        if (!file) {
            log('No file selected.');
            alert('Please select a file first.');
            return;
        }
        log('Parsing CSV file...');
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data.length > 0 && results.meta.fields.length > 0) {
                    log(`CSV parsed successfully. Found ${results.data.length} rows and ${results.meta.fields.length} columns.`);
                    rawData = results.data;
                    displayColumnChoices(results.meta.fields);
                } else {
                    log('CSV parsing failed or file is empty.');
                    alert('Could not parse CSV. Please ensure it is a valid CSV file with a header row.');
                }
            },
            error: (error) => {
                log(`CSV parsing error: ${error.message}`);
                alert(`An error occurred while parsing the CSV: ${error.message}`);
            }
        });
    }

    function displayColumnChoices(columns) {
        log('Displaying column choices...');
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
        
        // Add change event listeners for previews
        taskIdColumn.addEventListener('change', () => updatePreview('id'));
        taskNameColumn.addEventListener('change', () => updatePreview('name'));
        taskDescriptionColumn.addEventListener('change', () => updatePreview('description'));
        taskAssigneeColumn.addEventListener('change', () => updatePreview('assignee'));
        
        // Auto-select default columns if they exist
        autoSelectDefaultColumns(columns);
    }
    
    function updatePreview(type) {
        const selectElement = type === 'id' ? taskIdColumn : 
                             type === 'name' ? taskNameColumn : 
                             type === 'description' ? taskDescriptionColumn : taskAssigneeColumn;
        const previewElement = type === 'id' ? taskIdPreview : 
                              type === 'name' ? taskNamePreview : 
                              type === 'description' ? taskDescriptionPreview : taskAssigneePreview;
        
        const column = selectElement.value;
        if (column && rawData.length > 0) {
            const firstValue = rawData[0][column] || '';
            const preview = firstValue.length > 50 ? firstValue.substring(0, 50) + '...' : firstValue;
            previewElement.textContent = `Example: "${preview}"`;
            columnMapping[type] = column;
        } else {
            previewElement.textContent = '';
            columnMapping[type] = '';
        }
    }
    
    function autoSelectDefaultColumns(columns) {
        const defaultMappings = {
            id: ['Task Custom ID', 'Task ID', 'ID', 'task_id', 'id'],
            name: ['Task Name', 'Name', 'Title', 'task_name', 'name', 'title'],
            description: ['Task Content', 'Description', 'Content', 'Details', 'task_content', 'description', 'content'],
            assignee: ['Assignee', 'Assigned to', 'Owner', 'Task Assignees', 'assignee', 'assigned_to', 'owner']
        };
        
        // Auto-select Task ID
        for (const defaultName of defaultMappings.id) {
            if (columns.includes(defaultName)) {
                taskIdColumn.value = defaultName;
                updatePreview('id');
                break;
            }
        }
        
        // Auto-select Task Name
        for (const defaultName of defaultMappings.name) {
            if (columns.includes(defaultName)) {
                taskNameColumn.value = defaultName;
                updatePreview('name');
                break;
            }
        }
        
        // Auto-select Task Description
        for (const defaultName of defaultMappings.description) {
            if (columns.includes(defaultName)) {
                taskDescriptionColumn.value = defaultName;
                updatePreview('description');
                break;
            }
        }
        
        // Auto-select Task Assignee
        for (const defaultName of defaultMappings.assignee) {
            if (columns.includes(defaultName)) {
                taskAssigneeColumn.value = defaultName;
                updatePreview('assignee');
                break;
            }
        }
    }

    function initializeSort() {
        log('Initializing sort...');
        if (!columnMapping.name) {
            log('No task name column selected.');
            alert('Please select a task name column.');
            return;
        }
        
        // Save task URL base
        taskUrlBaseValue = document.getElementById('task-url-base').value;
        // Randomize order to avoid CSV sorting bias
        const shuffledData = [...rawData].sort(() => Math.random() - 0.5);
        allTasks = shuffledData.map((row, index) => ({ id: index, data: row }));
        columnSelectionArea.style.display = 'none';
        sortingArea.style.display = 'block';
        
        sortState = {
            sortedGroups: [], // Array of groupIds in sorted order
            unSorted: allTasks.map(t => t.id),
            currentItem: null,
            searchBounds: { low: 0, high: 0 },
            done: false
        };
        
        // Initialize each task as its own group
        rankGroups.clear();
        taskToGroup.clear();
        actionHistory = []; // Clear undo history
        allTasks.forEach(task => {
            const groupId = `single_${task.id}`;
            rankGroups.set(groupId, [task.id]);
            taskToGroup.set(task.id, groupId);
        });

        if (sortState.unSorted.length > 0) {
            const firstItem = sortState.unSorted.shift();
            const firstGroupId = taskToGroup.get(firstItem);
            sortState.sortedGroups.push(firstGroupId);
        }
        
        log('Starting sort...');
        continueSort();
    }

    function continueSort() {
        log('Continuing sort...');
        if (sortState.unSorted.length === 0 && sortState.currentItem === null) {
            sortState.done = true;
            log('Sort complete.');
            displayResults();
            saveState();
            return;
        }

        if (!sortState.currentItem) {
            sortState.currentItem = sortState.unSorted.shift();
            sortState.searchBounds.low = 0;
            sortState.searchBounds.high = sortState.sortedGroups.length - 1;
            log(`New item to sort: ${sortState.currentItem}`);
        }

        const { low, high } = sortState.searchBounds;

        if (low > high) {
            log(`Placing item ${sortState.currentItem} at index ${low}`);
            const currentGroupId = taskToGroup.get(sortState.currentItem);
            sortState.sortedGroups.splice(low, 0, currentGroupId);
            sortState.currentItem = null;
            saveState();
            continueSort();
        } else {
            const mid = Math.floor((low + high) / 2);
            const itemA_id = sortState.currentItem;
            const midGroupId = sortState.sortedGroups[mid];
            
            if (!midGroupId || !rankGroups.has(midGroupId)) {
                log(`Error: Invalid group ${midGroupId} at index ${mid}`);
                log(`Available groups: ${Array.from(rankGroups.keys()).join(', ')}`);
                log(`SortedGroups: ${sortState.sortedGroups.join(', ')}`);
                return;
            }
            
            const itemB_id = rankGroups.get(midGroupId)[0]; // Get first task from the group
            log(`Comparing item ${itemA_id} with item ${itemB_id} (from group ${midGroupId})`);
            displayComparison(itemA_id, itemB_id);
        }
    }

    function displayComparison(task1Id, task2Id) {
        log(`displayComparison called with: ${task1Id}, ${task2Id}`);
        const task1 = allTasks.find(t => t.id === task1Id);
        const task2 = allTasks.find(t => t.id === task2Id);
        
        if (!task1) {
            log(`Error: Task1 not found with ID ${task1Id}`);
            return;
        }
        if (!task2) {
            log(`Error: Task2 not found with ID ${task2Id}`);
            return;
        }

        // Clear previous content
        taskAElement.innerHTML = '';
        taskBElement.innerHTML = '';
        qrAElement.innerHTML = '';
        qrBElement.innerHTML = '';

        // Get group info for both tasks
        const task1GroupId = taskToGroup.get(task1Id);
        const task2GroupId = taskToGroup.get(task2Id);
        const task1Group = rankGroups.get(task1GroupId);
        const task2Group = rankGroups.get(task2GroupId);

        // Display both tasks with group indicators
        displayTaskContent(task1, taskAElement, task1Group);
        displayTaskContent(task2, taskBElement, task2Group);
        
        // Display QR codes below
        displayTaskQR(task1, qrAElement);
        displayTaskQR(task2, qrBElement);

        taskAElement.onclick = () => recordChoice('A');
        taskBElement.onclick = () => recordChoice('B');
        
        // Add equal rank button event listener
        const equalRankButton = document.getElementById('equal-rank-button');
        equalRankButton.onclick = () => recordChoice('Equal');
        updateProgress();
    }
    
    function parseAssignee(assigneeField) {
        if (!assigneeField) return '';
        
        // Remove brackets and parse comma-separated values
        const cleanField = assigneeField.replace(/[\[\]]/g, '').trim();
        
        if (!cleanField) return '';
        
        // Split by comma and get first assignee
        const assignees = cleanField.split(',').map(name => name.trim());
        return assignees[0] || '';
    }
    
    function displayTaskContent(task, element, groupTasks = null) {
        const name = task.data[columnMapping.name] || '';
        const description = task.data[columnMapping.description] || '';
        const assignee = parseAssignee(task.data[columnMapping.assignee]);
        const taskId = task.id;
        const existingComment = taskComments[taskId] || '';
        const isGroup = groupTasks && groupTasks.length > 1;
        
        // Add group styling if this is a group
        if (isGroup) {
            element.classList.add('task-group');
            element.setAttribute('data-group-size', groupTasks.length);
        } else {
            element.classList.remove('task-group');
            element.removeAttribute('data-group-size');
        }
        
        // Truncate description to 500 characters
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
                    const t = allTasks.find(task => task.id === id);
                    return `<li>${t.data[columnMapping.name] || 'Unnamed task'}</li>`;
                }).join('')}</ul>
            </div>` : ''}
            <div class="task-comment-section">
                <label for="comment-${taskId}" class="comment-label">Note:</label>
                <textarea id="comment-${taskId}" class="task-comment" placeholder="e.g., duplicate of task #123, low priority due to..." rows="2">${existingComment}</textarea>
            </div>
        `;
        
        // Add event listener to save comment when it changes
        const commentField = element.querySelector(`#comment-${taskId}`);
        commentField.addEventListener('input', function() {
            taskComments[taskId] = this.value;
            saveState();
        });
        
        // Prevent task selection when clicking on comment field
        commentField.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // Add event listener for group expand button if it exists
        const expandButton = element.querySelector('.group-expand-btn');
        if (expandButton) {
            expandButton.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering task selection
                toggleGroupDetails(taskId, this);
            });
        }
        commentField.addEventListener('focus', function(e) {
            e.stopPropagation();
        });
    }
    
    function displayTaskQR(task, element) {
        const taskId = task.data[columnMapping.id] || '';
        
        // Generate QR code if task ID exists and qrcode library is available
        if (taskId && taskUrlBaseValue && typeof qrcode !== 'undefined') {
            const taskUrl = taskUrlBaseValue + taskId;
            try {
                const qr = qrcode(0, 'M');
                qr.addData(taskUrl);
                qr.make();
                
                element.innerHTML = qr.createImgTag(4, 2); // cellSize=4, margin=2 (bigger QR code)
                const linkText = document.createElement('div');
                linkText.className = 'qr-label';
                linkText.textContent = 'Scan for full details';
                element.appendChild(linkText);
            } catch (error) {
                console.log('QR generation failed:', error);
                // Fall through to link fallback
            }
        } else if (taskId && taskUrlBaseValue) {
            // Fallback: show clickable link instead of QR code
            const link = document.createElement('a');
            link.href = taskUrlBaseValue + taskId;
            link.target = '_blank';
            link.textContent = 'View full task';
            link.style.fontSize = '0.8em';
            link.style.color = '#4a90e2';
            element.appendChild(link);
        }
    }

    function recordChoice(choice) {
        const { low, high } = sortState.searchBounds;
        const mid = Math.floor((low + high) / 2);
        
        // Save state before making changes for undo
        const beforeState = {
            sortState: JSON.parse(JSON.stringify(sortState)),
            rankGroups: new Map(rankGroups),
            taskToGroup: new Map(taskToGroup),
            choice: choice,
            timestamp: Date.now()
        };

        if (choice === 'A') { // currentItem is more important
            sortState.searchBounds.high = mid - 1;
        } else if (choice === 'B') { // currentItem is less important
            sortState.searchBounds.low = mid + 1;
        } else if (choice === 'Equal') { // tasks are equal priority
            const midGroupId = sortState.sortedGroups[mid];
            const existingTaskId = rankGroups.get(midGroupId)[0]; // Get first task from the group
            handleEqualRank(sortState.currentItem, existingTaskId, mid);
            actionHistory.push(beforeState);
            updateUndoButton();
            return;
        }
        
        actionHistory.push(beforeState);
        updateUndoButton();
        continueSort();
    }
    
    function undoLastChoice() {
        if (actionHistory.length === 0) {
            log('No actions to undo');
            return;
        }
        
        const lastState = actionHistory.pop();
        log(`Undoing last choice: ${lastState.choice}`);
        
        // Restore previous state
        sortState = lastState.sortState;
        rankGroups = lastState.rankGroups;
        taskToGroup = lastState.taskToGroup;
        
        updateUndoButton();
        saveState();
        
        // Continue from the restored state
        if (sortState.done) {
            displayResults();
        } else {
            continueSort();
        }
    }
    
    function updateUndoButton() {
        if (actionHistory.length > 0) {
            undoButton.disabled = false;
            undoButton.textContent = `Undo Last Choice (${actionHistory.length})`;
        } else {
            undoButton.disabled = true;
            undoButton.textContent = 'Undo Last Choice';
        }
    }

    function handleEqualRank(currentTaskId, existingTaskId, insertIndex) {
        log(`Marking tasks ${currentTaskId} and ${existingTaskId} as equal rank`);
        
        const currentGroupId = taskToGroup.get(currentTaskId);
        const existingGroupId = taskToGroup.get(existingTaskId);
        
        // Merge the groups
        const mergedTasks = [...rankGroups.get(currentGroupId), ...rankGroups.get(existingGroupId)];
        const newGroupId = `merged_${Date.now()}`;
        
        // Create new merged group
        rankGroups.set(newGroupId, mergedTasks);
        
        // Update task-to-group mapping
        mergedTasks.forEach(taskId => {
            taskToGroup.set(taskId, newGroupId);
        });
        
        // Clean up old groups
        rankGroups.delete(currentGroupId);
        rankGroups.delete(existingGroupId);
        
        // Replace the existing group in sortedGroups with the new merged group
        const existingGroupIndex = sortState.sortedGroups.indexOf(existingGroupId);
        sortState.sortedGroups[existingGroupIndex] = newGroupId;
        
        sortState.currentItem = null;
        saveState();
        continueSort();
    }

    function calculateRank(taskId) {
        const groupId = taskToGroup.get(taskId);
        const groupIndex = sortState.sortedGroups.indexOf(groupId);
        return groupIndex + 1; // All tasks in the same group get the same rank
    }

    function updateProgress() {
        const totalTasks = allTasks.length;
        const sortedCount = sortState.sortedGroups.length;
        const totalSortedTasks = sortState.sortedGroups.reduce((count, groupId) => count + rankGroups.get(groupId).length, 0);
        const progress = totalTasks > 0 ? (totalSortedTasks / totalTasks) * 100 : 0;
        
        // Estimate remaining comparisons using binary search worst case
        const remainingTasks = sortState.unSorted.length + (sortState.currentItem ? 1 : 0);
        const avgComparisons = Math.ceil(Math.log2(sortedCount + 1));
        const estimatedRemaining = remainingTasks * avgComparisons;
        
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Sorted ${totalSortedTasks} of ${totalTasks} tasks (~${estimatedRemaining} comparisons left)`;
    }

    function displayResults() {
        log('Displaying results...');
        sortingArea.style.display = 'none';
        resultsArea.style.display = 'block';
        
        // Add event listener for grouping toggle
        groupByAssigneeCheckbox.addEventListener('change', renderResults);
        
        renderResults();
    }
    
    function renderResults() {
        sortedResults.innerHTML = '';
        
        if (groupByAssigneeCheckbox.checked) {
            renderGroupedByAssignee();
        } else {
            renderDefaultList();
        }
    }
    
    function renderDefaultList() {
        const ol = document.createElement('ol');
        ol.className = 'sorted-list';
        
        // Display tasks grouped by rank
        sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks.forEach(taskId => {
                const task = allTasks.find(t => t.id === taskId);
                const assignee = parseAssignee(task.data[columnMapping.assignee]);
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="task-name-result">${task.data[columnMapping.name] || 'Unnamed task'}</span>
                    ${assignee ? `<span class="assignee-badge">${assignee}</span>` : ''}
                `;
                if (tasks.length > 1) {
                    li.innerHTML += `<span class="tie-indicator"> (tied with ${tasks.length - 1} other${tasks.length > 2 ? 's' : ''})</span>`;
                }
                ol.appendChild(li);
            });
        });
        
        sortedResults.appendChild(ol);
    }
    
    function renderGroupedByAssignee() {
        // Group tasks by assignee
        const assigneeGroups = new Map();
        
        sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks.forEach(taskId => {
                const task = allTasks.find(t => t.id === taskId);
                const assignee = parseAssignee(task.data[columnMapping.assignee]) || 'Unassigned';
                
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
        
        // Sort assignees alphabetically, but put "Unassigned" last
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
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="rank-badge">#${rank}</span>
                    <span class="task-name-result">${task.data[columnMapping.name] || 'Unnamed task'}</span>
                    ${tieCount > 1 ? `<span class="tie-indicator"> (tied with ${tieCount - 1} other${tieCount > 2 ? 's' : ''})</span>` : ''}
                `;
                ol.appendChild(li);
            });
            
            groupDiv.appendChild(ol);
            sortedResults.appendChild(groupDiv);
        });
    }

    function exportToCSV() {
        const sortedTasks = [];
        
        // Export all sorted tasks with their ranks
        sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks.forEach(taskId => {
                const task = allTasks.find(t => t.id === taskId);
                const exportData = {
                    rank: rank,
                    ...task.data,
                    comment: taskComments[taskId] || ''
                };
                sortedTasks.push(exportData);
            });
        });
        
        const csv = Papa.unparse(sortedTasks);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'sorted_tasks.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function exportPartialResults() {
        const allTasksToExport = [];
        
        // Add sorted tasks with their current ranks
        sortState.sortedGroups.forEach((groupId, groupIndex) => {
            const tasks = rankGroups.get(groupId);
            const rank = groupIndex + 1;
            
            tasks.forEach(taskId => {
                const task = allTasks.find(t => t.id === taskId);
                allTasksToExport.push({
                    rank: rank,
                    status: 'sorted',
                    ...task.data,
                    comment: taskComments[taskId] || ''
                });
            });
        });
        
        // Add current item being sorted (if any)
        if (sortState.currentItem) {
            const task = allTasks.find(t => t.id === sortState.currentItem);
            allTasksToExport.push({
                rank: '',
                status: 'in_progress',
                ...task.data,
                comment: taskComments[sortState.currentItem] || ''
            });
        }
        
        // Add unsorted tasks
        sortState.unSorted.forEach(id => {
            const task = allTasks.find(t => t.id === id);
            allTasksToExport.push({
                rank: '',
                status: 'unsorted',
                ...task.data,
                comment: taskComments[id] || ''
            });
        });
        
        const csv = Papa.unparse(allTasksToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'partial_sorted_tasks.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function reset() {
        log('Resetting application...');
        localStorage.removeItem('taskSorterState');
        allTasks = [];
        sortState = {};
        columnMapping = { id: '', name: '', description: '', assignee: '' };
        taskUrlBaseValue = 'https://app.clickup.com/t/4540126/';
        rawData = [];
        taskComments = {};
        rankGroups.clear();
        taskToGroup.clear();
        actionHistory = [];
        updateUndoButton();
        setupArea.style.display = 'block';
        columnSelectionArea.style.display = 'none';
        sortingArea.style.display = 'none';
        resultsArea.style.display = 'none';
        csvFileInput.value = '';
        progressBar.style.width = '0%';
        progressText.textContent = '';
    }

    loadCsvButton.addEventListener('click', () => {
        const file = csvFileInput.files[0];
        parseCSV(file);
    });

    startSortingButton.addEventListener('click', initializeSort);
    exportCsvButton.addEventListener('click', exportToCSV);
    exportPartialButton.addEventListener('click', exportPartialResults);
    restartButton.addEventListener('click', reset);
    restartSortingButton.addEventListener('click', reset);
    undoButton.addEventListener('click', undoLastChoice);

    // Function to toggle group details
    window.toggleGroupDetails = function(taskId, button) {
        const details = document.getElementById(`group-details-${taskId}`);
        if (details.classList.contains('collapsed')) {
            details.classList.remove('collapsed');
            button.textContent = 'Hide';
        } else {
            details.classList.add('collapsed');
            button.textContent = 'Show all';
        }
    };

    window.addEventListener('load', loadState);
});