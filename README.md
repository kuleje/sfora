# Pairwise Task Sorter

A web-based tool for prioritizing tasks using pairwise comparison with QR code support. This application helps you sort tasks by importance through a series of binary choices, making it easier to prioritize large lists of tasks objectively.

## Features

- **CSV Import**: Load tasks from CSV files with customizable column mapping
- **Pairwise Comparison**: Compare tasks two at a time to determine relative importance
- **QR Code Integration**: Generate QR codes for task URLs to quickly access full task details
- **Task Comments**: Add notes to individual tasks (e.g., "duplicate of task #123", priority reasons)
- **Progress Tracking**: Visual progress bar with estimated comparisons remaining
- **Persistent State**: Automatically saves progress and resumes where you left off
- **CSV Export**: Export sorted results with rankings and comments

## How It Works

1. **Upload CSV**: Select a CSV file containing your task data
2. **Configure Columns**: Map CSV columns to task ID, name, and description fields
3. **Set Base URL**: Configure the base URL for generating task links (optional)
4. **Compare Tasks**: Choose which task is more important in each comparison
5. **Add Comments**: Optionally add notes to tasks during comparison
6. **Export Results**: Download the sorted task list with rankings and comments

## Usage

### 1. Prepare Your CSV File

Your CSV should contain columns for:
- Task ID (for generating URLs)
- Task Name
- Task Description
- Any other relevant task data

### 2. Load and Configure

1. Select your CSV file
2. Map the columns to the appropriate fields
3. Set the base URL for task links (e.g., `https://app.clickup.com/t/your-workspace-id/`)
4. Click "Start Sorting"

### 3. Compare Tasks

- Two tasks will be displayed side by side
- Click on the more important task to record your choice
- Add optional comments to tasks using the note field
- QR codes are generated for quick access to full task details
- Progress is automatically saved and can be resumed later

### 4. Export Results

Once all comparisons are complete, export the sorted list as a CSV file containing:
- Rank (1 = highest priority)
- All original task data
- Comments added during sorting

## Technical Details

### Algorithm
Uses binary insertion sort with pairwise comparisons to efficiently sort tasks with O(n log n) average case performance.

### Data Persistence
- Progress is automatically saved to browser localStorage
- Can resume interrupted sorting sessions
- Comments and state persist across browser sessions

### QR Code Generation
- Generates QR codes for task URLs using the qrcode.js library
- Falls back to clickable links if QR generation fails
- Configurable base URL for different task management systems

## Files

- `index.html` - Main application interface
- `script.js` - Core application logic and sorting algorithm
- `style.css` - User interface styling
- `README.md` - This documentation

## Dependencies

- [PapaParse](https://www.papaparse.com/) - CSV parsing library
- [qrcode-generator](https://github.com/davidshimjs/qrcode-generator) - QR code generation
- Google Fonts (Roboto) - Typography

## Browser Support

Works in all modern browsers with localStorage support. No server-side components required.

## License

This project is open source and available under the MIT License.