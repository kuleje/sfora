// Main application script - coordinates all modules
document.addEventListener("DOMContentLoaded", function() {
    // Initialize logging
    const statusLog = document.getElementById('status-log');
    function log(message) {
        statusLog.innerHTML = `<strong>Status:</strong> ${message}`;
        console.log(message);
    }

    // Initialize all modules
    const csvHandler = new CSVHandler(appState, log);
    const sortingEngine = new SortingEngine(appState, log);
    const uiRenderer = new UIRenderer(appState, csvHandler, log);
    const storageManager = new StorageManager(appState, log);
    const debugUtils = new DebugUtils(appState, csvHandler, log);

    // Get DOM elements
    const csvFileInput = document.getElementById('csv-file');
    const loadCsvButton = document.getElementById('load-csv-button');
    const setupArea = document.getElementById('setup-area');
    const columnSelectionArea = document.getElementById('column-selection-area');
    const startSortingButton = document.getElementById('start-sorting-button');
    const sortingArea = document.getElementById('sorting-area');
    const resultsArea = document.getElementById('results-area');
    const taskAElement = document.getElementById('task-a');
    const taskBElement = document.getElementById('task-b');
    const groupByAssigneeCheckbox = document.getElementById('group-by-assignee');
    const exportCsvButton = document.getElementById('export-csv');
    const exportPartialButton = document.getElementById('export-partial');
    const restartButton = document.getElementById('restart');
    const restartSortingButton = document.getElementById('restart-sorting');
    const undoButton = document.getElementById('undo-button');

    // Debug elements
    const applyRandomRanksButton = document.getElementById('apply-random-ranks-button');
    const applyRandomRanksSortingButton = document.getElementById('apply-random-ranks-sorting-button');
    const applyRandomRanksResultsButton = document.getElementById('apply-random-ranks-results-button');

    // Initialize application
    function initialize() {
        log('Initializing application...');
        
        // Check for debug mode
        if (debugUtils.checkDebugMode()) {
            uiRenderer.showDebugControls();
        }
        
        // Load saved state
        loadState();
        
        // Enable auto-save
        storageManager.enableAutoSave();
    }

    // Load saved state
    function loadState() {
        const savedState = storageManager.loadState();
        if (savedState && appState.allTasks.length > 0) {
            uiRenderer.showSection('setup-area');
            if (!appState.sortState.done) {
                uiRenderer.showSection('sorting-area');
                log('Resuming sort...');
                continueSort();
            } else {
                log('Displaying results from saved state...');
                uiRenderer.displayResults(groupByAssigneeCheckbox.checked);
            }
        } else {
            log('No saved state found.');
        }
    }

    // Handle CSV file loading
    async function handleCsvLoad() {
        const file = csvFileInput.files[0];
        try {
            const result = await csvHandler.parseCSV(file);
            uiRenderer.displayColumnChoices(result.columns);
            
            // Add column selection event listeners
            setupColumnSelectionListeners();
        } catch (error) {
            alert(error.message);
        }
    }

    // Setup column selection event listeners
    function setupColumnSelectionListeners() {
        const columns = ['id', 'name', 'description', 'assignee'];
        columns.forEach(column => {
            const select = document.getElementById(`task-${column}-column`);
            select.addEventListener('change', () => uiRenderer.updatePreview(column));
        });
    }

    // Initialize sorting
    function initializeSort() {
        try {
            // Save task URL base
            appState.taskUrlBaseValue = document.getElementById('task-url-base').value;
            
            csvHandler.initializeTasksFromCSV();
            
            uiRenderer.showSection('sorting-area');
            log('Starting sort...');
            continueSort();
        } catch (error) {
            alert(error.message);
        }
    }

    // Continue sorting process
    function continueSort() {
        const result = sortingEngine.continueSort();
        
        if (result.done) {
            log('Sort complete.');
            uiRenderer.displayResults(groupByAssigneeCheckbox.checked);
            storageManager.saveState();
            return;
        }
        
        if (result.error) {
            log(`Error: ${result.error}`);
            return;
        }
        
        if (result.needsComparison) {
            const { taskA, taskB } = result.comparison;
            uiRenderer.displayComparison(taskA, taskB);
            
            // Setup comparison event listeners
            setupComparisonListeners();
        }
        
        // Update progress
        const progress = sortingEngine.calculateProgress();
        uiRenderer.updateProgress(progress);
        
        // Update undo button
        updateUndoButton();
        
        // Save state
        storageManager.saveState();
    }

    // Setup comparison event listeners
    function setupComparisonListeners() {
        taskAElement.onclick = () => recordChoice('A');
        taskBElement.onclick = () => recordChoice('B');
        
        const equalRankButton = document.getElementById('equal-rank-button');
        equalRankButton.onclick = () => recordChoice('Equal');
    }

    // Record user choice
    function recordChoice(choice) {
        const result = sortingEngine.recordChoice(choice);
        
        if (result.done) {
            uiRenderer.displayResults(groupByAssigneeCheckbox.checked);
        } else if (result.needsComparison) {
            const { taskA, taskB } = result.comparison;
            uiRenderer.displayComparison(taskA, taskB);
            setupComparisonListeners();
        } else {
            continueSort();
        }
        
        updateUndoButton();
        storageManager.saveState();
    }

    // Update undo button state
    function updateUndoButton() {
        undoButton.disabled = !sortingEngine.canUndo();
        undoButton.textContent = sortingEngine.getUndoButtonText();
    }

    // Handle undo
    function handleUndo() {
        const result = sortingEngine.undoLastChoice();
        if (result) {
            updateUndoButton();
            storageManager.saveState();
            
            if (appState.sortState.done) {
                uiRenderer.displayResults(groupByAssigneeCheckbox.checked);
            } else {
                continueSort();
            }
        }
    }

    // Handle task removal
    function handleTaskRemoval(taskId) {
        const result = sortingEngine.removeTaskFromSorting(taskId);
        storageManager.saveState();
        
        if (result.done) {
            uiRenderer.displayResults(groupByAssigneeCheckbox.checked);
        } else {
            continueSort();
        }
    }

    // Handle task restoration
    function handleTaskRestoration(taskId) {
        sortingEngine.restoreTaskToSorting(taskId);
        storageManager.saveState();
        uiRenderer.displayResults(groupByAssigneeCheckbox.checked);
    }

    // Export to CSV
    function exportToCSV() {
        const csv = csvHandler.exportToCSV();
        csvHandler.downloadCSV(csv, 'sorted_tasks.csv');
    }

    // Export partial results
    function exportPartialResults() {
        const csv = csvHandler.exportToCSV(true);
        csvHandler.downloadCSV(csv, 'partial_sorted_tasks.csv');
    }

    // Reset application
    function reset() {
        log('Resetting application...');
        storageManager.clearState();
        appState.reset();
        
        // Reset UI
        uiRenderer.showSection('setup-area');
        csvFileInput.value = '';
        updateUndoButton();
        
        // Reset progress
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        progressBar.style.width = '0%';
        progressText.textContent = '';
    }

    // Apply random ranks for testing
    function applyRandomRanks() {
        if (debugUtils.applyRandomRanks()) {
            storageManager.saveState();
            uiRenderer.displayResults(groupByAssigneeCheckbox.checked);
        }
    }

    // Event listeners
    loadCsvButton.addEventListener('click', handleCsvLoad);
    startSortingButton.addEventListener('click', initializeSort);
    exportCsvButton.addEventListener('click', exportToCSV);
    exportPartialButton.addEventListener('click', exportPartialResults);
    restartButton.addEventListener('click', reset);
    restartSortingButton.addEventListener('click', reset);
    undoButton.addEventListener('click', handleUndo);
    
    // Group by assignee toggle
    groupByAssigneeCheckbox.addEventListener('change', () => {
        if (appState.sortState.done) {
            uiRenderer.displayResults(groupByAssigneeCheckbox.checked);
        }
    });

    // Debug button event listeners
    if (applyRandomRanksButton) {
        applyRandomRanksButton.addEventListener('click', applyRandomRanks);
    }
    if (applyRandomRanksSortingButton) {
        applyRandomRanksSortingButton.addEventListener('click', applyRandomRanks);
    }
    if (applyRandomRanksResultsButton) {
        applyRandomRanksResultsButton.addEventListener('click', applyRandomRanks);
    }

    // Custom event listeners for task operations
    document.addEventListener('taskRemoved', (e) => {
        handleTaskRemoval(e.detail.taskId);
    });

    document.addEventListener('taskRestored', (e) => {
        handleTaskRestoration(e.detail.taskId);
    });

    // Global function for group details toggle (needed for HTML onclick)
    window.toggleGroupDetails = function(taskId, button) {
        uiRenderer.toggleGroupDetails(taskId, button);
    };

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        storageManager.disableAutoSave();
    });

    // Initialize application
    initialize();
});