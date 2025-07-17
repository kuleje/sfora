# Subagent Instructions for Manim Animation Workflow

## CRITICAL: Always Use the Automation Script

**MANDATORY**: You MUST use the provided automation script. Do NOT run raw ffmpeg or manim commands directly.

**Command to use**: `python render_and_analyze.py pairwise_comparison_animation.py PairwiseComparisonSort`

## What the Script Does

1. **Creates timestamped directory**: `renders/session_YYYYMMDD_HHMMSS/`
2. **Renders animation**: Uses `poetry run manim` at 1fps
3. **Extracts frames**: Uses ffmpeg to create `frame_NNNN.png` files
4. **Organizes output**: Video, frames, and analysis directories in session folder

## Expected File Structure

```
renders/
└── session_20250716_123456/
    ├── PairwiseComparisonSort.mp4
    ├── frames/
    │   ├── frame_0001.png
    │   ├── frame_0002.png
    │   └── ...
    └── analysis/
        └── [your analysis files here]
```

## Your Tasks

1. **Run the script**: `python render_and_analyze.py pairwise_comparison_animation.py PairwiseComparisonSort`
2. **Wait for completion**: The script will show progress and final path
3. **Analyze frames**: Look at key frames in the generated frames/ directory
4. **Use Gemini**: Provide the full path to frames directory: `/home/kuleje/data-science-ok/sfora/renders/session_YYYYMMDD_HHMMSS/frames/`
5. **Save analysis**: Create .md file in the analysis/ directory of the session
6. **Report back**: Provide session path and key findings

## DO NOT

- Run `manim` directly
- Run `ffmpeg` directly
- Create your own directory structure
- Use temporary files outside the session directory

## Context Preservation

The script output is now minimal to preserve context. You should see:
- Session directory path
- Rendering progress
- Frame count
- Completion confirmation

Report only essential findings to preserve context for the main agent.