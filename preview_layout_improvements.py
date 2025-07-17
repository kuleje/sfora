from manim import *
import numpy as np

class PairwiseComparisonPreview(Scene):
    def construct(self):
        # Set light background for better contrast
        self.camera.background_color = WHITE
        
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
        
        # Show unsorted tasks - positioned lower with better spacing
        unsorted_label = Text("Unsorted Tasks:", font_size=20, color=BLACK)
        unsorted_label.move_to(LEFT * 4 + UP * 2.5)
        self.play(Write(unsorted_label))
        
        # Add sort order indicator on the left
        unsorted_order = Text("Random\nOrder", font_size=14, color=DARK_GRAY)
        unsorted_order.move_to(LEFT * 6 + UP * 1.5)
        self.play(Write(unsorted_order))
        
        # Display unsorted tasks in a stacked column with proper spacing and staggering
        for i, task in enumerate(self.tasks):
            # Add slight staggering for visual separation
            x_offset = LEFT * 4 + LEFT * (i * 0.05)  # Small horizontal stagger
            task.move_to(x_offset + UP * (2.1 - i * 0.5))
            self.play(Create(task), run_time=0.2)
        
        # Create sorted list area
        sorted_label = Text("Sorted List:", font_size=20, color=BLACK)
        sorted_label.move_to(RIGHT * 4 + UP * 2.5)
        self.play(Write(sorted_label))
        
        # Add sort order indicator on the right
        sorted_order = Text("Priority\nOrder", font_size=14, color=DARK_GRAY)
        sorted_order.move_to(RIGHT * 6 + UP * 1.5)
        self.play(Write(sorted_order))
        
        # Show a few sorted tasks for demonstration
        for i in range(3):
            task = self.create_task_card(self.task_names[i], i)
            task.move_to(RIGHT * 4 + UP * (2.1 - i * 0.5))
            self.play(Create(task), run_time=0.2)
        
        # Show comparison interface in lowered position
        comparison_title = Text("Comparison #1", font_size=16, color=DARK_BLUE)
        comparison_title.move_to(UP * 0.5)
        
        comparison_question = Text("Which is more important?", font_size=14, color=BLACK)
        comparison_question.move_to(UP * 0.2)
        
        # Create comparison cards
        taskA = self.create_task_card("Schedule veterinary checkups", 1)
        taskB = self.create_task_card("Review adoption applications", 0)
        
        taskA.move_to(LEFT * 2 + DOWN * 0.5)
        taskB.move_to(RIGHT * 2 + DOWN * 0.5)
        
        # Add A/B labels
        labelA = Text("A", font_size=20, color=BLUE)
        labelA.next_to(taskA, UP, buff=0.2)
        
        labelB = Text("B", font_size=20, color=RED)
        labelB.next_to(taskB, UP, buff=0.2)
        
        # Show comparison interface
        self.play(Write(comparison_title))
        self.play(Write(comparison_question))
        self.play(Create(taskA), Create(taskB))
        self.play(Write(labelA), Write(labelB))
        
        # Add arrows pointing to choices
        arrow_left = Arrow(DOWN * 1.5, taskA.get_center(), color=BLUE)
        arrow_right = Arrow(DOWN * 1.5, taskB.get_center(), color=RED)
        
        self.play(Create(arrow_left), Create(arrow_right))
        
        self.wait(2)
    
    def create_task_card(self, name, task_id):
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
                    Text(line1, font_size=12, color=BLACK),
                    Text(line2, font_size=12, color=BLACK)
                ).arrange(DOWN, buff=0.1)
            else:
                # Medium names - try to break at a good point
                words = name.split()
                if len(words) > 2:
                    mid = len(words) // 2
                    line1 = " ".join(words[:mid])
                    line2 = " ".join(words[mid:])
                    text = VGroup(
                        Text(line1, font_size=14, color=BLACK),
                        Text(line2, font_size=14, color=BLACK)
                    ).arrange(DOWN, buff=0.1)
                else:
                    text = Text(name, font_size=14, color=BLACK)
        else:
            text = Text(name, font_size=16, color=BLACK)
        
        # Create dynamic container based on text size
        text_width = text.width
        text_height = text.height
        
        rect = RoundedRectangle(
            width=max(text_width + 0.4, 3.2), 
            height=max(text_height + 0.3, 0.8), 
            corner_radius=0.1,
            stroke_color=BLACK, 
            fill_color=WHITE, 
            fill_opacity=1.0  # Full opacity for better readability
        )
        
        text.move_to(rect.get_center())
        
        # Add task ID for reference
        id_text = Text(f"#{task_id}", font_size=16, color=DARK_GRAY)
        id_text.next_to(rect, UP, buff=0.1)
        
        return VGroup(rect, text, id_text)