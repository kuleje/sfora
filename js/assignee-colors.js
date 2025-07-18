// Assignee Color Manager - shared color assignment system
class AssigneeColorManager {
    constructor() {
        // Color palette for assignees - professional muted tones recommended by Gemini
        // These colors complement quarterly colors and work well in business contexts
        this.assigneeColorPalette = [
            // Light colors (work with dark text)
            '#A8DADC', // Pale Aqua
            '#F1C0B9', // Dusty Rose
            '#E8DAB2', // Light Khaki
            '#C5D8B9', // Sage Green
            '#D3C0E1', // Muted Lavender
            '#FDDDA0', // Pale Gold
            '#B4D2E7', // Light Sky Blue
            '#F7BCA0', // Soft Apricot
            // Darker colors (work with light text)
            '#457B9D', // Cerulean Blue
            '#E63946', // Imperial Red
            '#1D3557', // Prussian Blue
            '#588157', // Forest Green
            '#8338EC', // Royal Purple
            '#B56576', // Muted Berry
            '#3D405B', // Charcoal Blue
            '#785A3E', // Rich Taupe
            '#006D77', // Deep Teal
            '#D4A373'  // Muted Ochre
        ];
        
        // Sequential assignee color mapping with random starting point
        this.assigneeColorMap = new Map();
        this.assigneeOrder = [];
        this.colorStartOffset = Math.floor(Math.random() * this.assigneeColorPalette.length);
    }

    // Get color for assignee based on sequential assignment with random starting point
    getAssigneeColor(assigneeName) {
        if (assigneeName === 'Unassigned') {
            return '#95a5a6'; // Gray for unassigned
        }
        
        // If we haven't seen this assignee before, assign the next color sequentially
        if (!this.assigneeColorMap.has(assigneeName)) {
            this.assigneeOrder.push(assigneeName);
            const colorIndex = (this.colorStartOffset + this.assigneeOrder.length - 1) % this.assigneeColorPalette.length;
            this.assigneeColorMap.set(assigneeName, this.assigneeColorPalette[colorIndex]);
        }
        
        return this.assigneeColorMap.get(assigneeName);
    }

    // Get text color (light/dark) based on background color
    getTextColorForBackground(backgroundColor) {
        // Remove # and convert to RGB
        const hex = backgroundColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return white for dark backgrounds, black for light backgrounds
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    // Reset color assignments (useful for testing or when data changes significantly)
    resetColorAssignments() {
        this.assigneeColorMap.clear();
        this.assigneeOrder = [];
        this.colorStartOffset = Math.floor(Math.random() * this.assigneeColorPalette.length);
    }

    // Get all assigned colors (for debugging or analysis)
    getAssignedColors() {
        return new Map(this.assigneeColorMap);
    }

    // Get assignee order (for debugging or analysis)
    getAssigneeOrder() {
        return [...this.assigneeOrder];
    }
}

// Export for use in other modules
window.AssigneeColorManager = AssigneeColorManager;