from manim import *
import numpy as np

# Define colors for better readability and to avoid NameError
DARK_BLUE = '#2D6A9F'
DARK_GREEN = '#3E8948'
DARK_GRAY = '#A9A9A9'


class PairwiseComparisonSort(Scene):
    # Animation timing constants
    FAST_ANIMATION = 0.3
    MEDIUM_ANIMATION = 0.6
    SLOW_ANIMATION = 1.0
    SHORT_WAIT = 0.1
    MEDIUM_WAIT = 0.2
    LONG_WAIT = 0.4
    def construct(self):
        # Set light background for better contrast
        self.camera.background_color = WHITE
        # No title - more space for content
        pass
        
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
        
        # Create all tasks and labels at once
        unsorted_label = Text("Unsorted Tasks", font_size=20, color=BLACK).move_to(LEFT * 4 + DOWN * 3.5)
        sorted_label = Text("Sorted List", font_size=20, color=BLACK).move_to(RIGHT * 4 + DOWN * 3.5)
        
        # Display unsorted tasks in a stacked column with proper spacing and staggering
        initial_animations = [Write(unsorted_label), Write(sorted_label)]
        for i, task in enumerate(self.tasks):
            # Add slight staggering for visual separation
            x_offset = LEFT * 4 + LEFT * (i * 0.03)  # Reduced stagger to prevent overlap
            task.move_to(x_offset + UP * (2.1 - i * 0.55))  # Increased vertical spacing
            initial_animations.append(Create(task))
        
        self.play(*initial_animations, run_time=self.FAST_ANIMATION)
        
        # Initialize sorting state
        self.sorted_tasks = []
        self.unsorted_tasks = list(range(len(self.tasks)))
        
        # Initialize search bounds group as empty VGroup
        self.search_bounds_group = VGroup()

        # No longer need these flags - we'll show explanations based on comparison count
        
        # Start the binary insertion sort process
        self.animate_pairwise_sorting()
        
        # Final message
        final_text = Text("Tasks sorted by priority!", font_size=36, color=GREEN)
        final_text.to_edge(DOWN)
        self.play(Write(final_text))
        self.wait(2)
    
    def create_task_card(self, name, task_id):
        # Standardized text handling with consistent wrapping rules
        words = name.split()
        if len(words) > 4:  # Very long names - split into 2 lines
            mid = len(words) // 2
            line1 = " ".join(words[:mid])
            line2 = " ".join(words[mid:])
            text = VGroup(
                Text(line1, font_size=140, color=BLACK).scale(0.1),
                Text(line2, font_size=140, color=BLACK).scale(0.1)
            ).arrange(DOWN, buff=0.15)
        elif len(words) > 2:  # Medium names - try to break at natural point
            mid = len(words) // 2
            line1 = " ".join(words[:mid])
            line2 = " ".join(words[mid:])
            text = VGroup(
                Text(line1, font_size=150, color=BLACK).scale(0.1),
                Text(line2, font_size=150, color=BLACK).scale(0.1)
            ).arrange(DOWN, buff=0.15)
        else:
            text = Text(name, font_size=160, color=BLACK).scale(0.1)
        
        # Create dynamic container based on text size with proper padding
        text_width = text.width
        text_height = text.height
        
        rect = RoundedRectangle(
            width=max(text_width + 0.6, 3.4), 
            height=max(text_height + 0.4, 0.9), 
            corner_radius=0.1,
            stroke_color=BLACK, 
            fill_color=WHITE, 
            fill_opacity=1.0
        )
        
        text.move_to(rect.get_center())
        
        return VGroup(rect, text)
    
    def animate_pairwise_sorting(self):
        # Move first task to sorted area with proper spacing
        first_task = self.tasks[0]
        self.play(first_task.animate.move_to(RIGHT * 4 + UP * 2.1), run_time=self.MEDIUM_ANIMATION)
        self.sorted_tasks.append(0)
        self.unsorted_tasks.remove(0)
        
        # Process remaining tasks
        for task_idx in range(1, len(self.tasks)):
            self.insert_task_with_comparisons(task_idx)
            self.wait(self.MEDIUM_WAIT)

        # Final stacking
        self.stack_sorted_tasks()
    
    def insert_task_with_comparisons(self, task_idx):
        current_task = self.tasks[task_idx]
        
        # Show that we're inserting this task
        self.play(current_task[0].animate.set_stroke(DARK_BLUE, 3))
        
        # Show insertion message at the top with better positioning to avoid overlap
        insertion_text = Text(f"Inserting: {self.task_names[task_idx][:30]}...", font_size=22, color=DARK_BLUE)
        insertion_text.move_to(UP * 3.7)
        self.play(Write(insertion_text), run_time=self.MEDIUM_ANIMATION)
        
        # Binary search to find insertion position
        left, right = 0, len(self.sorted_tasks)
        comparison_count = 0
        choice = None
        last_compared_task = None
        
        while left < right:
            mid = (left + right) // 2
            comparison_count += 1
            
            # Show search bounds
            self.show_search_bounds(left, right, mid)
            
            # Simulate user choice with more realistic priority ordering
            # Use task content to determine priority for demo
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
            
            if current_priority > mid_priority:  # Higher priority number = more important
                right = mid
                choice = "A"
            else:  # Lower priority
                left = mid + 1
                choice = "B"

            # Check if this will be the final comparison
            next_left = left
            next_right = right
            if current_priority > mid_priority:
                next_right = mid
            else:
                next_left = mid + 1
            is_final_comparison = (next_left >= next_right)
            
            # Show the comparison
            last_compared_task = self.sorted_tasks[mid]
            comparison_title_obj, task_a_obj, task_b_obj = self.show_comparison(task_idx, last_compared_task, comparison_count, choice, is_final_comparison)
            
            # Show the choice result
            self.show_choice_result(choice, left, right)

            # Add a pause and arrow to explain search range change
            # Show explanations for comparisons that significantly narrow the search space
            should_explain = (
                len(self.sorted_tasks) >= 4 and  # Only after we have enough tasks
                (right - left) > 1 and  # Only when there's a meaningful search range
                comparison_count <= 3  # Show for the first few comparisons to demonstrate shrinking
            )
            
            if should_explain:
                # Define task names for explanation text
                task_a_name = self.task_names[task_idx]
                task_b_name = self.task_names[self.sorted_tasks[mid]]
                
                if choice == "A":
                    explanation_text_content = f"A > B\nSearch left half"
                else:
                    explanation_text_content = f"B > A\nSearch right half"

                explanation_text = Text(explanation_text_content, font_size=18, color=DARK_BLUE).move_to(LEFT * 3 + UP * 0.5)
                
                # Arrow from comparison area to search bounds
                explanation_arrow = Arrow(explanation_text.get_right(), self.search_bounds_group[2].get_left(), color=DARK_BLUE)
                
                # Show the explanation - the brace will update naturally in the next iteration
                self.play(Create(explanation_arrow), Write(explanation_text))
                
                self.wait(self.LONG_WAIT)
                self.play(FadeOut(explanation_arrow), FadeOut(explanation_text))
            
            # Don't clear search bounds - keep them visible for the entire batch
            # Just update the brace position for the next iteration
            self.wait(self.MEDIUM_WAIT)
        
        # Keep search bounds visible during final positioning
        
        # Final comparison completed - show both tasks stacked and move them together
        self.show_final_positioning(task_idx, left, comparison_count > 0, last_compared_task)
        
        # Clean up
        self.play(FadeOut(insertion_text))
        self.unsorted_tasks.remove(task_idx)
        
        # Clear search bounds after task is fully inserted
        self.clear_search_bounds()
    
    def spread_search_range(self, left, right):
        """Spread out only the tasks in the search range for better visibility"""
        animations = []
        for i, sorted_task_idx in enumerate(self.sorted_tasks):
            task = self.tasks[sorted_task_idx]
            x_offset = RIGHT * 4 + RIGHT * (i * 0.03)  # Always apply stagger
            if left <= i < right:
                # Spread out tasks in search range and highlight
                target_pos = x_offset + UP * (2.1 - i * 0.8)
                animations.append(task.animate.move_to(target_pos))
                animations.append(task[0].animate.set_stroke(DARK_BLUE, 3))
                animations.append(task[1].animate.set_color(BLACK))
            else:
                # Keep other tasks stacked and reset highlight
                target_pos = x_offset + UP * (2.1 - i * 0.55)
                animations.append(task.animate.move_to(target_pos))
            animations.append(task[0].animate.set_stroke(BLACK, 1))
            animations.append(task[1].animate.set_color(BLACK))
        
        if animations:
            self.play(*animations, run_time=self.MEDIUM_ANIMATION)
    
    def stack_sorted_tasks(self):
        """Return all sorted tasks to stacked positions"""
        animations = []
        for i, sorted_task_idx in enumerate(self.sorted_tasks):
            task = self.tasks[sorted_task_idx]
            x_offset = RIGHT * 4 + RIGHT * (i * 0.03)  # Always apply stagger
            target_pos = x_offset + UP * (2.1 - i * 0.55)
            animations.append(task.animate.move_to(target_pos))
            animations.append(task[0].animate.set_stroke(BLACK, 1))
            animations.append(task[1].animate.set_color(BLACK))
        
        if animations:
            self.play(*animations, run_time=self.MEDIUM_ANIMATION)
    
    def show_search_bounds(self, left, right, mid):
        # Spread out the search range for better visibility
        self.spread_search_range(left, right)
        
        if len(self.sorted_tasks) > 0:
            # Create a VGroup of the tasks in the current search range
            search_range_tasks = VGroup(*[self.tasks[self.sorted_tasks[i]] for i in range(left, right)])
            
            # Create new braces for this search range
            new_blue_brace = Brace(search_range_tasks, direction=LEFT, color=DARK_BLUE)
            new_green_brace = Brace(search_range_tasks, direction=RIGHT, color=DARK_GREEN)
            
            # Add bounds labels with proper spacing to prevent overlap
            bounds_text = Text(f"Searching: {left+1} to {right}", font_size=18, color=DARK_BLUE)
            mid_text = Text(f"Comparing with: {mid+1}", font_size=18, color=DARK_GREEN)
            
            # Check if search_bounds_group is empty (first time for this task)
            if len(self.search_bounds_group) == 0:
                # First time - create all elements
                text_group = VGroup(bounds_text, mid_text).arrange(RIGHT, buff=0.5)
                text_group.move_to(DOWN * 2.4)
                
                # Add all elements to the search bounds group
                self.search_bounds_group.add(text_group[0], text_group[1], new_blue_brace, new_green_brace)
                
                # Store references for future transformations
                self.search_bounds_group.blue_brace = new_blue_brace
                self.search_bounds_group.green_brace = new_green_brace
                
                # Create the search bounds
                self.play(Create(self.search_bounds_group), run_time=self.MEDIUM_ANIMATION)
                
            else:
                # Transform existing elements to new positions
                new_text_group = VGroup(bounds_text, mid_text).arrange(RIGHT, buff=0.5)
                new_text_group.move_to(DOWN * 2.4)
                
                # Get existing braces
                old_blue_brace = self.search_bounds_group.blue_brace
                old_green_brace = self.search_bounds_group.green_brace
                
                # Transform all elements
                self.play(
                    Transform(self.search_bounds_group[0], new_text_group[0]),
                    Transform(self.search_bounds_group[1], new_text_group[1]),
                    Transform(old_blue_brace, new_blue_brace),
                    Transform(old_green_brace, new_green_brace),
                    run_time=self.MEDIUM_ANIMATION
                )
            
            # Store middle task reference for the green brace animation
            if mid < len(self.sorted_tasks):
                middle_task = self.tasks[self.sorted_tasks[mid]]
                self.search_bounds_group.middle_task = middle_task
            
            # Animate the green right brace shrinking to highlight the middle task
            if (hasattr(self.search_bounds_group, 'middle_task') and 
                hasattr(self.search_bounds_group, 'green_brace') and 
                right - left > 1):
                
                green_brace = self.search_bounds_group.green_brace
                
                # Create a smaller brace that just highlights the middle task
                middle_brace = Brace(self.search_bounds_group.middle_task, direction=RIGHT, color=DARK_GREEN)
                
                # Add "MID" label to the middle brace
                mid_label = Text("MID", font_size=12, color=DARK_GREEN)
                mid_label.next_to(middle_brace, RIGHT, buff=0.1)
                
                # Animate the shrinking
                self.wait(0.3)  # Brief pause to show the initial state
                self.play(
                    Transform(green_brace, middle_brace),
                    Write(mid_label),
                    run_time=self.MEDIUM_ANIMATION
                )
                
                # Brief pause to show the highlighted middle task
                self.wait(0.5)
                
                # Transform the green brace back to full range and fade out the MID label
                self.play(
                    Transform(green_brace, new_green_brace),
                    FadeOut(mid_label),
                    run_time=self.MEDIUM_ANIMATION
                )
                
                # Store the MID label reference for cleanup
                self.search_bounds_group.mid_label = mid_label
    
    def clear_search_bounds(self):
        if self.search_bounds_group and len(self.search_bounds_group) > 0:
            self.play(FadeOut(self.search_bounds_group), run_time=self.FAST_ANIMATION)
            # Reset to empty VGroup to prepare for next task
            self.search_bounds_group = VGroup()
        
        # Stack tasks back together
        self.stack_sorted_tasks()
    
    def show_comparison(self, task_a_idx, task_b_idx, comparison_num, choice=None, is_final_comparison=False):
        # Create comparison UI with centered title
        comparison_title = Text(f"Comparison #{comparison_num}", font_size=24, color=DARK_BLUE)
        comparison_title.move_to(DOWN * 1.8)
        
        # Highlight the two tasks being compared
        task_a = self.tasks[task_a_idx]
        task_b = self.tasks[task_b_idx]
        
        # Store original positions
        original_pos_a = task_a.get_center()
        original_pos_b = task_b.get_center()

        # Set higher z-index for tasks being compared
        task_a.set_z_index(10)
        task_b.set_z_index(10)
        
        # Show comparison
        self.play(
            Write(comparison_title),
            task_a.animate.move_to(LEFT * 2 + UP * 2.5),
            task_b.animate.move_to(RIGHT * 2 + UP * 2.5),
            run_time=self.SLOW_ANIMATION
        )

        # Add choice arrows pointing up from comparison boxes
        arrow_a = Arrow(task_a.get_top(), task_a.get_top() + UP * 0.2, color=GREEN)
        arrow_b = Arrow(task_b.get_top(), task_b.get_top() + UP * 0.2, color=GREEN)
        choice_a = Text("A", font_size=24, color=GREEN)
        choice_b = Text("B", font_size=24, color=GREEN)
        choice_a.next_to(arrow_a, UP, buff=0.05)
        choice_b.next_to(arrow_b, UP, buff=0.05)
        
        self.play(
            Create(arrow_a), Create(arrow_b),
            Write(choice_a), Write(choice_b),
            run_time=self.MEDIUM_ANIMATION
        )

        # Highlight chosen card
        chosen_highlight = None
        if choice == "A":
            chosen_highlight = SurroundingRectangle(task_a, color=GREEN, buff=0.1)
        elif choice == "B":
            chosen_highlight = SurroundingRectangle(task_b, color=GREEN, buff=0.1)
        
        if chosen_highlight:
            chosen_highlight.set_z_index(11) # Higher than tasks
            self.play(Create(chosen_highlight), run_time=self.FAST_ANIMATION)

        self.wait(self.MEDIUM_WAIT)
        
        # Clean up comparison UI and return tasks to original positions
        cleanup_animations = [
            FadeOut(comparison_title),
            FadeOut(arrow_a),
            FadeOut(arrow_b),
            FadeOut(choice_a),
            FadeOut(choice_b),
            FadeOut(chosen_highlight) if chosen_highlight else FadeOut(VGroup()), # Fade out highlight if it exists
        ]
        
        # Only return task_b to original position if this is not the final comparison
        if not is_final_comparison:
            cleanup_animations.append(task_b.animate.move_to(original_pos_b).set_stroke(BLACK, 1))
        
        self.play(*cleanup_animations, run_time=self.MEDIUM_ANIMATION)
        
        # Reset z-index only for task_a if this is not the final comparison
        # For final comparison, we'll keep the z-index for the stacking animation
        if not is_final_comparison:
            task_a.set_z_index(0)
            task_b.set_z_index(0)
        
        return comparison_title, task_a, task_b
    
    def show_choice_result(self, choice, left, right):
        # This function is now empty as per the user request to remove the text.
        pass
    
    def show_final_positioning(self, task_idx, position, had_comparison, compared_task_idx):
        """Show final positioning with stacked tasks after comparison"""
        if had_comparison and len(self.sorted_tasks) > 0 and compared_task_idx is not None:
            # Get the two tasks
            current_task = self.tasks[task_idx]
            compared_task = self.tasks[compared_task_idx]
            
            # Stack both tasks in the comparison area with proper vertical positioning
            comparison_center = UP * 2.5
            
            # Determine which task should be higher based on the insertion position
            # In the sorted list, higher priority (lower index) appears higher on screen
            if position > 0 and compared_task_idx == self.sorted_tasks[position - 1]:
                # Current task is being inserted AFTER the compared task, so compared task goes higher
                current_task.set_z_index(9)
                compared_task.set_z_index(10)
                higher_pos = comparison_center + UP * 0.3
                lower_pos = comparison_center - UP * 0.3
                current_task_pos = lower_pos
                compared_task_pos = higher_pos
            else:
                # Current task is being inserted BEFORE the compared task, so current task goes higher
                current_task.set_z_index(10)
                compared_task.set_z_index(9)
                higher_pos = comparison_center + UP * 0.3
                lower_pos = comparison_center - UP * 0.3
                current_task_pos = higher_pos
                compared_task_pos = lower_pos
            
            # Both tasks are already in comparison area, just stack them vertically
            self.play(
                current_task.animate.move_to(current_task_pos),
                compared_task.animate.move_to(compared_task_pos),
                run_time=self.MEDIUM_ANIMATION
            )
            
            self.wait(self.SHORT_WAIT)
            
            # Now move both tasks to their final positions
            self.insert_task_at_position_with_highlight(task_idx, position, [task_idx, compared_task_idx])
            return
        
        # Fallback to normal insertion
        self.insert_task_at_position(task_idx, position)
    
    def insert_task_at_position_with_highlight(self, task_idx, position, highlight_tasks):
        """Insert task at position with specific tasks highlighted during movement"""
        # Insert task into sorted list
        self.sorted_tasks.insert(position, task_idx)
        
        # Animate all sorted tasks to their new positions simultaneously
        animations = []
        for i, sorted_task_idx in enumerate(self.sorted_tasks):
            task = self.tasks[sorted_task_idx]
            x_offset = RIGHT * 4 + RIGHT * (i * 0.03)  # Add stagger
            target_pos = x_offset + UP * (2.1 - i * 0.55)  # Increased spacing
            task.set_z_index(len(self.sorted_tasks) - i) # Set z-index
            
            # Highlight the tasks that were just positioned
            if sorted_task_idx in highlight_tasks:
                task[0].set_stroke(DARK_BLUE, 3)
            
            animations.append(task.animate.move_to(target_pos))

        self.play(*animations, run_time=self.MEDIUM_ANIMATION)
        
        # Reset task colors for highlighted tasks
        for highlighted_task_idx in highlight_tasks:
            self.play(self.tasks[highlighted_task_idx][0].animate.set_fill(WHITE, 1.0).set_stroke(BLACK, 1))

    def insert_task_at_position(self, task_idx, position):
        # Insert task into sorted list
        self.sorted_tasks.insert(position, task_idx)
        
        # Animate all sorted tasks to their new positions simultaneously
        animations = []
        for i, sorted_task_idx in enumerate(self.sorted_tasks):
            task = self.tasks[sorted_task_idx]
            x_offset = RIGHT * 4 + RIGHT * (i * 0.03)  # Add stagger
            target_pos = x_offset + UP * (2.1 - i * 0.55)  # Increased spacing
            task.set_z_index(len(self.sorted_tasks) - i) # Set z-index
            animations.append(task.animate.move_to(target_pos))

        self.play(*animations, run_time=self.MEDIUM_ANIMATION)
        
        # Reset task color
        self.play(self.tasks[task_idx][0].animate.set_fill(WHITE, 1.0))
    
    

class PairwiseComparisonExplanation(Scene):
    def construct(self):
        # Title
        title = Text("How Pairwise Comparison Works", font_size=48)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Explanation points
        explanations = [
            "1. User compares two tasks at a time",
            "2. Binary search finds the correct insertion position",
            "3. Each comparison narrows down the search space",
            "4. Results in O(n log n) comparisons on average",
            "5. User only needs to make simple A vs B choices"
        ]
        
        explanation_group = VGroup()
        for i, text in enumerate(explanations):
            explanation = Text(text, font_size=24)
            explanation.move_to(UP * (2 - i * 0.8))
            explanation_group.add(explanation)
        
        # Show explanations one by one
        for explanation in explanation_group:
            self.play(Write(explanation))
            self.wait(1)
        
        self.wait(2)
        
        # Show complexity comparison
        complexity_title = Text("Complexity Comparison", font_size=36, color=YELLOW)
        complexity_title.move_to(DOWN * 1)
        
        comparisons = VGroup(
            Text("Traditional sort: User sees all items at once", font_size=20),
            Text("Pairwise sort: User makes simple binary choices", font_size=20),
            Text("Result: Same sorted order, easier decisions", font_size=20, color=GREEN)
        ).arrange(DOWN, buff=0.4)
        
        comparisons.move_to(DOWN * 2.5)
        
        self.play(Write(complexity_title))
        self.wait(1)
        
        for comparison in comparisons:
            self.play(Write(comparison))
            self.wait(1)
        
        self.wait(3)