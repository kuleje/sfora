// UI Setup module - handles initial setup, column selection, and file loading
class UISetup {
    constructor(state, csvHandler, logger) {
        this.state = state;
        this.csvHandler = csvHandler;
        this.log = logger;
    }

    // Load preferences from localStorage
    loadPreferences() {
        const preferences = {};
        try {
            const savedDesign = localStorage.getItem('sfora.resultDesign');
            const savedRankingStyle = localStorage.getItem('sfora.rankingStyle');

            if (savedDesign) {
                preferences.selectedDesign = savedDesign;
            }
            if (savedRankingStyle) {
                preferences.rankingStyle = savedRankingStyle;
            }
        } catch (e) {
            console.error("Error loading preferences from localStorage:", e);
        }
        return preferences;
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

    // Attach event listeners for column selection
    attachColumnSelectionEventListeners() {
        const columnSelectors = [
            'task-id-column',
            'task-name-column', 
            'task-description-column',
            'task-assignee-column'
        ];

        columnSelectors.forEach(selectorId => {
            const element = document.getElementById(selectorId);
            if (element) {
                const fieldType = selectorId.replace('task-', '').replace('-column', '');
                element.addEventListener('change', () => {
                    this.updatePreview(fieldType);
                });
            }
        });

        // Task URL base input
        const taskUrlBaseInput = document.getElementById('task-url-base');
        if (taskUrlBaseInput) {
            taskUrlBaseInput.addEventListener('input', (e) => {
                this.state.taskUrlBaseValue = e.target.value;
            });
            // Initialize state with default value
            this.state.taskUrlBaseValue = taskUrlBaseInput.value;
        }
    }

    // Initialize setup area with event listeners
    initialize() {
        this.attachColumnSelectionEventListeners();
    }
}

// Export for use in other modules
window.UISetup = UISetup;