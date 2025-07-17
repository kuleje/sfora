from manim import *
import numpy as np

class PairwiseComparisonPreview(Scene):
    # Very fast animation constants for preview
    FAST_ANIMATION = 0.1
    MEDIUM_ANIMATION = 0.1
    SLOW_ANIMATION = 0.2
    SHORT_WAIT = 0.2
    MEDIUM_WAIT = 0.2
    LONG_WAIT = 0.3
    
    def construct(self):
        # Smaller title, moved down to make room
        title = Text("Pairwise Comparison Sorting", font_size=32)
        title.to_edge(UP, buff=0.2)
        self.play(Write(title), run_time=self.MEDIUM_ANIMATION)
        self.wait(self.MEDIUM_WAIT)
        
        # Sample tasks for animal welfare org
        self.task_names = [
            "Review adoption applications",
            "Schedule veterinary checkups", 
            "Update social media posts",
            "Organize fundraising event",
            "Train new volunteers",
            "Clean animal enclosures",
            "Process donation receipts",
            "Respond to rescue requests"
        ]
        self.tasks = []
        
        # Create task cards
        for i, name in enumerate(self.task_names):
            task = self.create_task_card(name, i)
            self.tasks.append(task)
        
        # Show unsorted tasks - positioned to avoid overlap
        unsorted_label = Text("Unsorted Tasks:", font_size=18)
        unsorted_label.move_to(LEFT * 4 + UP * 2.8)
        self.play(Write(unsorted_label), run_time=self.MEDIUM_ANIMATION)
        
        # Display unsorted tasks in a column with proper spacing
        for i, task in enumerate(self.tasks):
            task.move_to(LEFT * 4 + UP * (2.2 - i * 0.6))
            self.play(Create(task), run_time=self.FAST_ANIMATION)
        
        self.wait(self.MEDIUM_WAIT)
        
        # Create sorted list area
        sorted_label = Text("Sorted List:", font_size=18)
        sorted_label.move_to(RIGHT * 4 + UP * 2.8)
        self.play(Write(sorted_label), run_time=self.MEDIUM_ANIMATION)
        
        # Initialize sorting state
        self.sorted_tasks = []
        self.unsorted_tasks = list(range(len(self.tasks)))
        
        # Create search bounds indicators
        self.search_bounds_group = VGroup()
        
        # Preview only first few steps
        self.animate_preview_sorting()
        
        # Final message
        final_text = Text("Tasks sorted by priority!", font_size=36, color=GREEN)
        final_text.to_edge(DOWN)
        self.play(Write(final_text), run_time=self.MEDIUM_ANIMATION)
        self.wait(self.LONG_WAIT)
    
    def create_task_card(self, name, task_id):
        # Create a card-like appearance
        rect = RoundedRectangle(
            width=3.2, height=0.7, 
            corner_radius=0.1,
            stroke_color=WHITE, 
            fill_color=BLUE, 
            fill_opacity=0.3
        )
        
        # Simplified text handling to avoid kerning issues
        if len(name) > 20:
            # Split long task names at natural break points
            if len(name) > 35:
                # Very long names - split into 2 lines
                words = name.split()
                mid = len(words) // 2
                line1 = " ".join(words[:mid])
                line2 = " ".join(words[mid:])
                text = VGroup(
                    Text(line1, font_size=10, color=WHITE),
                    Text(line2, font_size=10, color=WHITE)
                ).arrange(DOWN, buff=0.05)
            else:
                # Medium names - try to break at a good point
                words = name.split()
                if len(words) > 2:
                    mid = len(words) // 2
                    line1 = " ".join(words[:mid])
                    line2 = " ".join(words[mid:])
                    text = VGroup(
                        Text(line1, font_size=11, color=WHITE),
                        Text(line2, font_size=11, color=WHITE)
                    ).arrange(DOWN, buff=0.05)
                else:
                    text = Text(name, font_size=11, color=WHITE)
        else:
            text = Text(name, font_size=12, color=WHITE)
        
        text.move_to(rect.get_center())
        
        # Add task ID for reference
        id_text = Text(f"#{task_id}", font_size=12, color=GRAY)
        id_text.next_to(rect, UP, buff=0.1)
        
        return VGroup(rect, text, id_text)
    
    def animate_preview_sorting(self):
        # Move first task to sorted area
        first_task = self.tasks[0]
        self.play(first_task.animate.move_to(RIGHT * 4 + UP * 2.2))
        self.sorted_tasks.append(0)
        self.unsorted_tasks.remove(0)
        
        # Preview only first 3 insertions for quick check
        for task_idx in range(1, min(4, len(self.tasks))):
            self.insert_task_with_comparisons(task_idx)
            self.wait(self.MEDIUM_WAIT)
    
    def insert_task_with_comparisons(self, task_idx):
        current_task = self.tasks[task_idx]
        
        # Show that we're inserting this task
        self.play(current_task[0].animate.set_fill(RED, 0.7))
        
        # Show insertion message at the top
        insertion_text = Text(f"Inserting: {self.task_names[task_idx]}", font_size=16)
        insertion_text.move_to(UP * 3.5)
        self.play(Write(insertion_text), run_time=self.MEDIUM_ANIMATION)
        
        # Quick binary search with just one comparison for preview
        left, right = 0, len(self.sorted_tasks)
        if left < right:
            mid = (left + right) // 2
            
            # Show search bounds
            self.show_search_bounds(left, right, mid)
            
            # Show one comparison
            self.show_comparison(task_idx, self.sorted_tasks[mid], 1)
            
            # Quick choice
            priorities = {
                "Review adoption applications": 8,
                "Schedule veterinary checkups": 9, 
                "Update social media posts": 3,
                "Organize fundraising event": 6,
                "Train new volunteers": 5,
                "Clean animal enclosures": 7,
                "Process donation receipts": 4,
                "Respond to rescue requests": 10
            }
            
            current_priority = priorities.get(self.task_names[task_idx], 5)
            mid_priority = priorities.get(self.task_names[self.sorted_tasks[mid]], 5)
            
            if current_priority > mid_priority:
                left = mid
                choice = "A"
            else:
                left = mid + 1
                choice = "B"
            
            self.show_choice_result(choice, left, right)
            self.clear_search_bounds()
        
        # Insert at found position
        self.insert_task_at_position(task_idx, left)
        
        # Clean up
        self.play(FadeOut(insertion_text))
        self.unsorted_tasks.remove(task_idx)
    
    def show_search_bounds(self, left, right, mid):
        if self.search_bounds_group:
            self.play(FadeOut(self.search_bounds_group))
        
        self.search_bounds_group = VGroup()
        
        if len(self.sorted_tasks) > 0:
            # Add bounds labels
            bounds_text = Text(f"Search range: positions {left} to {right-1}", font_size=14, color=YELLOW)
            bounds_text.move_to(RIGHT * 4 + DOWN * 2)
            self.search_bounds_group.add(bounds_text)
            
            self.play(Create(self.search_bounds_group), run_time=self.MEDIUM_ANIMATION)
    
    def clear_search_bounds(self):
        if self.search_bounds_group:
            self.play(FadeOut(self.search_bounds_group))
            self.search_bounds_group = VGroup()
    
    def show_comparison(self, task_a_idx, task_b_idx, comparison_num):
        # Quick comparison at the top
        comparison_title = Text(f"Comparison #{comparison_num}", font_size=20, color=YELLOW)
        comparison_title.move_to(UP * 3.2)
        
        self.play(Write(comparison_title), run_time=self.MEDIUM_ANIMATION)
        self.wait(self.SHORT_WAIT)
        self.play(FadeOut(comparison_title), run_time=self.MEDIUM_ANIMATION)
    
    def show_choice_result(self, choice, left, right):
        if choice == "A":
            result_text = Text("Task A chosen", font_size=16, color=BLUE)
        else:
            result_text = Text("Task B chosen", font_size=16, color=BLUE)
        
        result_text.move_to(UP * 3)
        
        self.play(Write(result_text), run_time=self.MEDIUM_ANIMATION)
        self.wait(self.SHORT_WAIT)
        self.play(FadeOut(result_text), run_time=self.MEDIUM_ANIMATION)
    
    def insert_task_at_position(self, task_idx, position):
        # Insert task into sorted list
        self.sorted_tasks.insert(position, task_idx)
        
        # Animate moving tasks to make room
        for i, sorted_task_idx in enumerate(self.sorted_tasks):
            target_pos = RIGHT * 4 + UP * (2.2 - i * 0.6)
            self.play(self.tasks[sorted_task_idx].animate.move_to(target_pos), run_time=self.FAST_ANIMATION)
        
        # Reset task color
        self.play(self.tasks[task_idx][0].animate.set_fill(BLUE, 0.3))