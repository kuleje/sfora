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
    const taskUrlBase = document.getElementById('task-url-base');
    const taskIdPreview = document.getElementById('task-id-preview');
    const taskNamePreview = document.getElementById('task-name-preview');
    const taskDescriptionPreview = document.getElementById('task-description-preview');
    const startSortingButton = document.getElementById('start-sorting-button');
    const sortingArea = document.getElementById('sorting-area');
    const resultsArea = document.getElementById('results-area');
    const taskAElement = document.getElementById('task-a');
    const taskBElement = document.getElementById('task-b');
    const qrAElement = document.getElementById('qr-a');
    const qrBElement = document.getElementById('qr-b');
    const sortedList = document.getElementById('sorted-list');
    const exportCsvButton = document.getElementById('export-csv');
    const restartButton = document.getElementById('restart');
    const restartSortingButton = document.getElementById('restart-sorting');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    let allTasks = [];
    let sortState = {};
    let columnMapping = { id: '', name: '', description: '' };
    let taskUrlBaseValue = 'https://app.clickup.com/t/4540126/';
    let rawData = [];

    function loadState() {
        log('Checking for saved state...');
        const savedState = localStorage.getItem('taskSorterState');
        if (savedState) {
            log('Saved state found. Loading...');
            const state = JSON.parse(savedState);
            allTasks = state.allTasks;
            sortState = state.sortState;
            columnMapping = state.columnMapping || { id: '', name: '', description: '' };
            taskUrlBaseValue = state.taskUrlBase || 'https://app.clickup.com/t/4540126/';
            rawData = state.rawData;

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
        const state = { allTasks, sortState, columnMapping, taskUrlBase: taskUrlBaseValue, rawData };
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
        [taskIdColumn, taskNameColumn, taskDescriptionColumn].forEach(select => {
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
        
        // Auto-select default columns if they exist
        autoSelectDefaultColumns(columns);
    }
    
    function updatePreview(type) {
        const selectElement = type === 'id' ? taskIdColumn : 
                             type === 'name' ? taskNameColumn : taskDescriptionColumn;
        const previewElement = type === 'id' ? taskIdPreview : 
                              type === 'name' ? taskNamePreview : taskDescriptionPreview;
        
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
            description: ['Task Content', 'Description', 'Content', 'Details', 'task_content', 'description', 'content']
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
            sorted: [],
            unSorted: allTasks.map(t => t.id),
            currentItem: null,
            searchBounds: { low: 0, high: 0 },
            done: false
        };

        if (sortState.unSorted.length > 0) {
            const firstItem = sortState.unSorted.shift();
            sortState.sorted.push(firstItem);
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
            sortState.searchBounds.high = sortState.sorted.length - 1;
            log(`New item to sort: ${sortState.currentItem}`);
        }

        const { low, high } = sortState.searchBounds;

        if (low > high) {
            log(`Placing item ${sortState.currentItem} at index ${low}`);
            sortState.sorted.splice(low, 0, sortState.currentItem);
            sortState.currentItem = null;
            saveState();
            continueSort();
        } else {
            const mid = Math.floor((low + high) / 2);
            const itemA_id = sortState.currentItem;
            const itemB_id = sortState.sorted[mid];
            log(`Comparing item ${itemA_id} with item ${itemB_id}`);
            displayComparison(itemA_id, itemB_id);
        }
    }

    function displayComparison(task1Id, task2Id) {
        const task1 = allTasks.find(t => t.id === task1Id);
        const task2 = allTasks.find(t => t.id === task2Id);


        // Clear previous content
        taskAElement.innerHTML = '';
        taskBElement.innerHTML = '';
        qrAElement.innerHTML = '';
        qrBElement.innerHTML = '';

        // Display both name and truncated description
        displayTaskContent(task1, taskAElement);
        displayTaskContent(task2, taskBElement);
        
        // Display QR codes below
        displayTaskQR(task1, qrAElement);
        displayTaskQR(task2, qrBElement);

        taskAElement.onclick = () => recordChoice('A');
        taskBElement.onclick = () => recordChoice('B');
        updateProgress();
    }
    
    function displayTaskContent(task, element) {
        const name = task.data[columnMapping.name] || '';
        const description = task.data[columnMapping.description] || '';
        
        // Truncate description to 500 characters
        const truncatedDesc = description.length > 500 ? 
            description.substring(0, 500) + '...' : description;
        
        element.innerHTML = `
            <div class="task-name">${name}</div>
            <div class="task-description">${truncatedDesc}</div>
        `;
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

        if (choice === 'A') { // currentItem is more important
            sortState.searchBounds.high = mid - 1;
        } else { // currentItem is less important
            sortState.searchBounds.low = mid + 1;
        }
        continueSort();
    }

    function updateProgress() {
        const totalTasks = allTasks.length;
        const sortedCount = sortState.sorted.length;
        const progress = totalTasks > 0 ? (sortedCount / totalTasks) * 100 : 0;
        
        // Estimate remaining comparisons using binary search worst case
        const remainingTasks = sortState.unSorted.length + (sortState.currentItem ? 1 : 0);
        const avgComparisons = Math.ceil(Math.log2(sortedCount + 1));
        const estimatedRemaining = remainingTasks * avgComparisons;
        
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Sorted ${sortedCount} of ${totalTasks} tasks (~${estimatedRemaining} comparisons left)`;
    }

    function displayResults() {
        log('Displaying results...');
        sortingArea.style.display = 'none';
        resultsArea.style.display = 'block';
        sortedList.innerHTML = '';
        const sortedTasks = sortState.sorted.map(id => allTasks.find(t => t.id === id));
        
        sortedTasks.forEach(task => {
            const li = document.createElement('li');
            li.textContent = task.data[columnMapping.name] || '';
            sortedList.appendChild(li);
        });
    }

    function exportToCSV() {
        const sortedTasks = sortState.sorted.map((id, index) => {
            const task = allTasks.find(t => t.id === id);
            const exportData = {
                rank: index + 1,
                ...task.data
            };
            return exportData;
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

    function reset() {
        log('Resetting application...');
        localStorage.removeItem('taskSorterState');
        allTasks = [];
        sortState = {};
        columnMapping = { id: '', name: '', description: '' };
        taskUrlBaseValue = 'https://app.clickup.com/t/4540126/';
        rawData = [];
        setupArea.style.display = 'block';
        columnSelectionArea.style.display = 'none';
        sortingArea.style.display = 'none';
        resultsArea.style.display = 'none';
        csvFileInput.value = '';
        sortedList.innerHTML = '';
        progressBar.style.width = '0%';
        progressText.textContent = '';
    }

    loadCsvButton.addEventListener('click', () => {
        const file = csvFileInput.files[0];
        parseCSV(file);
    });

    startSortingButton.addEventListener('click', initializeSort);
    exportCsvButton.addEventListener('click', exportToCSV);
    restartButton.addEventListener('click', reset);
    restartSortingButton.addEventListener('click', reset);

    window.addEventListener('load', loadState);
});