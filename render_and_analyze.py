#!/usr/bin/env python3
"""
Automation script for manim rendering and frame analysis workflow.
Renders animation at 1fps, extracts frames, and organizes output.
"""

import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

def run_command(cmd, description=""):
    """Run a shell command and handle errors."""
    if description:
        print(f"{description}...")
    
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    
    return True

def create_timestamp_directory():
    """Create a timestamped directory for this render session."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    base_dir = Path("renders")
    base_dir.mkdir(exist_ok=True)
    
    session_dir = base_dir / f"session_{timestamp}"
    session_dir.mkdir(exist_ok=True)
    
    return session_dir

def render_animation(scene_file, scene_class, output_dir, fps=1):
    """Render the animation at specified fps."""
    print(f"Rendering {scene_class} at {fps}fps...")
    
    # Render at specified fps
    cmd = f"poetry run manim -ql --fps {fps} {scene_file} {scene_class}"
    
    if not run_command(cmd, f"Rendering animation at {fps}fps"):
        return None
    
    # Find the generated video file
    media_dir = Path("media/videos")
    video_files = list(media_dir.glob(f"**/{scene_class}.mp4"))
    
    if not video_files:
        print("Error: Could not find generated video file")
        return None
    
    video_file = video_files[0]
    
    # Move video to output directory
    output_video = output_dir / f"{scene_class}.mp4"
    shutil.move(str(video_file), str(output_video))
    
    print(f"Video: {output_video.name}")
    return output_video

def extract_frames(video_file, output_dir, fps=1):
    """Extract frames from the video using ffmpeg."""
    frames_dir = output_dir / "frames"
    frames_dir.mkdir(exist_ok=True)
    
    print(f"Extracting frames at {fps}fps...")
    
    # Use ffmpeg to extract frames
    cmd = f"ffmpeg -i '{video_file}' -vf fps={fps} '{frames_dir}/frame_%04d.png'"
    
    if not run_command(cmd, "Extracting frames"):
        return None
    
    # List extracted frames
    frames = list(frames_dir.glob("frame_*.png"))
    frames.sort()
    
    print(f"Extracted {len(frames)} frames")
    return frames_dir

def main():
    """Main automation workflow."""
    if len(sys.argv) < 3:
        print("Usage: python render_and_analyze.py <scene_file> <scene_class> [fps]")
        print("Example: python render_and_analyze.py pairwise_comparison_animation.py PairwiseComparisonSort 30")
        sys.exit(1)
    
    scene_file = sys.argv[1]
    scene_class = sys.argv[2]
    fps = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    
    # Verify scene file exists
    if not Path(scene_file).exists():
        print(f"Error: Scene file '{scene_file}' not found")
        sys.exit(1)
    
    # Create output directory
    output_dir = create_timestamp_directory()
    print(f"Session: {output_dir}")
    
    # Render animation
    video_file = render_animation(scene_file, scene_class, output_dir, fps)
    if not video_file:
        print("Failed to render animation")
        sys.exit(1)
    
    # Extract frames
    frames_dir = extract_frames(video_file, output_dir, fps)
    if not frames_dir:
        print("Failed to extract frames")
        sys.exit(1)
    
    # Create analysis directory for review notes
    analysis_dir = output_dir / "analysis"
    analysis_dir.mkdir(exist_ok=True)
    
    frames = list(frames_dir.glob("frame_*.png"))
    print(f"\n✓ Complete: {len(frames)} frames in {output_dir}")

if __name__ == "__main__":
    main()