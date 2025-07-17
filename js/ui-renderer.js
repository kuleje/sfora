// UI rendering and display utilities module - main coordinator
class UIRenderer {
    constructor(state, csvHandler, logger) {
        this.state = state;
        this.csvHandler = csvHandler;
        this.log = logger;
        this.selectedDesign = 'tabbed'; // Default value
        this.rankingStyle = 'range'; // Default value
        
        // Initialize UI modules
        this.uiSetup = new UISetup(state, csvHandler, logger);
        this.uiComparison = new UIComparison(state, csvHandler, logger);
        this.uiQuarterly = new UIQuarterly(state, csvHandler, logger);
        this.uiTasks = new UITasks(state, csvHandler, logger);
        this.uiResults = new UIResults(state, csvHandler, logger);
        this.uiTabs = new UITabs(state, csvHandler, logger, this.uiQuarterly);
        
        this._loadPreferences();
    }

    _loadPreferences() {
        try {
            const preferences = this.uiSetup.loadPreferences();
            if (preferences.selectedDesign) {
                this.selectedDesign = preferences.selectedDesign;
            }
            if (preferences.rankingStyle) {
                this.rankingStyle = preferences.rankingStyle;
                this.uiResults.setRankingStyle(preferences.rankingStyle);
                this.uiTabs.setRankingStyle(preferences.rankingStyle);
            }
        } catch (e) {
            console.error("Error loading preferences:", e);
        }
    }

    // Display column selection UI
    displayColumnChoices(columns) {
        this.uiSetup.displayColumnChoices(columns);
    }

    // Update preview for column selection
    updatePreview(type) {
        this.uiSetup.updatePreview(type);
    }

    // Display task comparison UI
    displayComparison(task1Id, task2Id) {
        this.uiComparison.displayComparison(task1Id, task2Id);
    }

    // Display individual task content
    displayTaskContent(task, element, groupTasks = null) {
        this.uiTasks.displayTaskContent(task, element, groupTasks);
    }

    // Attach event listeners to task elements
    attachTaskEventListeners(element, taskId) {
        this.uiTasks.attachTaskEventListeners(element, taskId);
    }

    // Display QR code for task
    displayTaskQR(task, element) {
        this.uiComparison.displayTaskQR(task, element);
    }

    // Display clickable link fallback
    displayTaskLink(taskId, element) {
        this.uiComparison.displayTaskLink(taskId, element);
    }

    // Toggle group details
    toggleGroupDetails(taskId, button) {
        this.uiTasks.toggleGroupDetails(taskId, button);
    }

    // Update progress bar
    updateProgress(progressInfo) {
        this.uiComparison.updateProgress(progressInfo);
    }

    // Display final results
    displayResults(groupByAssignee = false) {
        this.log('Displaying results...');
        
        const resultsArea = document.getElementById('results-area');
        const sortingArea = document.getElementById('sorting-area');
        const setupArea = document.getElementById('setup-area');
        const columnSelectionArea = document.getElementById('column-selection-area');
        
        sortingArea.style.display = 'none';
        setupArea.style.display = 'none';
        columnSelectionArea.style.display = 'none';
        resultsArea.style.display = 'block';
        
        // Hide/show results-options div based on selected design
        const resultsOptions = document.getElementById('results-options');
        if (resultsOptions) {
            if (this.selectedDesign === 'tabbed') {
                resultsOptions.style.display = 'none';
            } else {
                resultsOptions.style.display = 'block';
                
                // Update visibility of results-options div
                const groupByCheckbox = document.getElementById('group-by-assignee');
                if (groupByCheckbox) {
                    groupByCheckbox.checked = groupByAssignee;
                }
            }
        }
        
        // Get selected design and ranking style dropdowns
        const designSelect = document.getElementById('result-design-select');
        const rankingStyleSelect = document.getElementById('ranking-style-select');

        // Set initial values of dropdowns based on loaded preferences
        if (designSelect) {
            designSelect.value = this.selectedDesign;
        }
        if (rankingStyleSelect) {
            rankingStyleSelect.value = this.rankingStyle;
        }
        
        this.renderWithDesign(this.selectedDesign, groupByAssignee);
    }

    // Render results with selected design
    renderWithDesign(design, groupByAssignee) {
        if (design === 'tabbed') {
            this.uiTabs.renderTabbedInterface(groupByAssignee);
        } else {
            this.uiResults.renderWithDesign(design, groupByAssignee);
        }
    }
    
    // Helper method to get range display for tied tasks
    getRankRange(groupIndex, taskCount, rank) {
        return this.uiResults.getRankRange(groupIndex, taskCount, rank);
    }

    getOrdinal(n) {
        return this.uiResults.getOrdinal(n);
    }

    // Render default sorted list
    renderDefaultList() {
        this.uiResults.renderDefaultList();
    }

    // Render grouped by assignee
    renderGroupedByAssignee() {
        this.uiResults.renderGroupedByAssignee();
    }

    // Render removed tasks section
    renderRemovedTasks() {
        this.uiResults.renderRemovedTasks();
    }

    // Render removed tasks grouped by assignee
    renderRemovedTasksGrouped() {
        this.uiResults.renderRemovedTasksGrouped();
    }

    // Render split view layout
    renderSplitViewLayout(groupByAssignee = false) {
        this.uiResults.renderSplitViewLayout(groupByAssignee);
    }

    // Render collapsible sections
    renderCollapsibleSections(groupByAssignee = false) {
        this.uiResults.renderCollapsibleSections(groupByAssignee);
    }

    // Create a collapsible section element
    createCollapsibleSection(sectionConfig) {
        return this.uiResults.createCollapsibleSection(sectionConfig);
    }

    // Get priority preview
    getPriorityPreview() {
        return this.uiTabs.getPriorityPreview();
    }

    // Get assignee preview
    getAssigneePreview() {
        return this.uiTabs.getAssigneePreview();
    }

    // Get removed tasks preview
    getRemovedTasksPreview() {
        return this.uiTabs.getRemovedTasksPreview();
    }

    // Render priority rankings content
    renderPriorityRankingsContent() {
        return this.uiResults.renderPriorityRankingsContent();
    }

    // Render by assignee content
    renderByAssigneeContent() {
        return this.uiResults.renderByAssigneeContent();
    }

    // Render removed tasks content
    renderRemovedTasksContent(groupByAssignee) {
        return this.uiResults.renderRemovedTasksContent(groupByAssignee);
    }

    // Attach collapsible event listeners
    attachCollapsibleEventListeners() {
        this.uiResults.attachCollapsibleEventListeners();
    }

    // Get section configuration by ID
    getSectionConfig(sectionId) {
        return this.uiResults.getSectionConfig(sectionId);
    }

    // Show/hide sections
    showSection(sectionId) {
        this.uiResults.showSection(sectionId);
    }

    // Render tabbed interface
    renderTabbedInterface(groupByAssignee) {
        this.uiTabs.renderTabbedInterface(groupByAssignee);
    }

    // Helper method to render default list in tab
    renderDefaultListInTab(container) {
        this.uiTabs.renderDefaultListInTab(container);
    }

    // Helper method to render grouped by assignee in tab
    renderGroupedByAssigneeInTab(container) {
        this.uiTabs.renderGroupedByAssigneeInTab(container);
    }

    // Helper method to render removed tasks in tab
    renderRemovedTasksInTab(container) {
        this.uiTabs.renderRemovedTasksInTab(container);
    }

    // Show debug controls
    showDebugControls() {
        const debugElements = ['debug-controls', 'debug-controls-sorting', 'debug-controls-results', 'debug-controls-main'];
        debugElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'block';
        });
    }

    // Initialize UI modules
    initialize() {
        this.uiSetup.initialize();
        this.attachDesignEventListeners();
    }

    // Attach event listeners for design and ranking style selectors
    attachDesignEventListeners() {
        const designSelect = document.getElementById('result-design-select');
        const rankingStyleSelect = document.getElementById('ranking-style-select');

        // Add event listener for design changes
        if (designSelect) {
            designSelect.addEventListener('change', () => {
                this.selectedDesign = designSelect.value;
                localStorage.setItem('sfora.resultDesign', this.selectedDesign);
                
                // Update visibility of results-options div
                const resultsOptions = document.getElementById('results-options');
                if (resultsOptions) {
                    if (this.selectedDesign === 'tabbed') {
                        resultsOptions.style.display = 'none';
                    } else {
                        resultsOptions.style.display = 'block';
                    }
                }

                // Check if we're in results view and re-render
                const resultsArea = document.getElementById('results-area');
                if (resultsArea && resultsArea.style.display === 'block') {
                    const groupByCheckbox = document.getElementById('group-by-assignee');
                    const groupByAssignee = groupByCheckbox ? groupByCheckbox.checked : false;
                    this.renderWithDesign(this.selectedDesign, groupByAssignee);
                }
            });
        }

        // Add event listener for ranking style changes
        if (rankingStyleSelect) {
            rankingStyleSelect.addEventListener('change', () => {
                this.rankingStyle = rankingStyleSelect.value;
                this.setRankingStyle(this.rankingStyle);
                localStorage.setItem('sfora.rankingStyle', this.rankingStyle);
                
                // Check if we're in results view and re-render
                const resultsArea = document.getElementById('results-area');
                if (resultsArea && resultsArea.style.display === 'block') {
                    const groupByCheckbox = document.getElementById('group-by-assignee');
                    const groupByAssignee = groupByCheckbox ? groupByCheckbox.checked : false;
                    this.renderWithDesign(this.selectedDesign, groupByAssignee);
                }
            });
        }
    }

    // Set ranking style and propagate to modules
    setRankingStyle(style) {
        this.rankingStyle = style;
        this.uiResults.setRankingStyle(style);
        this.uiTabs.setRankingStyle(style);
    }

    // Set selected design
    setSelectedDesign(design) {
        this.selectedDesign = design;
    }
}

// Export for use in other modules
window.UIRenderer = UIRenderer;