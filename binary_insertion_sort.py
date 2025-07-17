from manim import *
import numpy as np

class BinaryInsertionSort(Scene):
    def construct(self):
        # Title
        title = Text("Binary Insertion Sort Animation", font_size=48)
        title.to_edge(UP)
        self.play(Write(title))
        self.wait(1)
        
        # Initial array
        arr = [5, 2, 8, 1, 9, 3, 7, 4, 6]
        
        # Create visual array
        self.create_array_visual(arr)
        
        # Show algorithm description
        description = Text("Binary Insertion Sort uses binary search to find the correct position", 
                         font_size=24)
        description.next_to(title, DOWN, buff=0.5)
        self.play(Write(description))
        self.wait(2)
        
        # Start sorting animation
        self.animate_binary_insertion_sort(arr)
        
        # Final message
        final_text = Text("Array is now sorted!", font_size=36, color=GREEN)
        final_text.move_to(description.get_center())
        self.play(Transform(description, final_text))
        self.wait(2)
    
    def create_array_visual(self, arr):
        self.array_mobjects = []
        self.array_values = arr[:]
        
        # Create rectangles and numbers for each element
        for i, val in enumerate(arr):
            rect = Rectangle(width=0.8, height=0.8, stroke_color=WHITE, fill_color=BLUE, fill_opacity=0.3)
            num = Text(str(val), font_size=24, color=WHITE)
            
            # Position elements
            rect.move_to(LEFT * 4 + RIGHT * i * 1.0)
            num.move_to(rect.get_center())
            
            element = VGroup(rect, num)
            self.array_mobjects.append(element)
        
        # Add index labels
        self.index_labels = []
        for i in range(len(arr)):
            index_label = Text(str(i), font_size=18, color=GRAY)
            index_label.next_to(self.array_mobjects[i], DOWN, buff=0.3)
            self.index_labels.append(index_label)
        
        # Display array
        self.play(*[Create(mob) for mob in self.array_mobjects])
        self.play(*[Write(label) for label in self.index_labels])
        self.wait(1)
    
    def animate_binary_insertion_sort(self, arr):
        n = len(arr)
        
        # Create status text
        status_text = Text("Starting binary insertion sort...", font_size=24)
        status_text.to_edge(DOWN)
        self.play(Write(status_text))
        
        for i in range(1, n):
            # Highlight current element
            self.play(self.array_mobjects[i][0].animate.set_fill(RED, 0.7))
            
            # Update status
            new_status = Text(f"Inserting element {arr[i]} at position {i}", font_size=24)
            new_status.to_edge(DOWN)
            self.play(Transform(status_text, new_status))
            
            key = arr[i]
            
            # Show binary search process
            left, right = 0, i
            
            while left < right:
                mid = (left + right) // 2
                
                # Highlight search range
                self.highlight_range(left, right, YELLOW)
                
                # Highlight middle element
                self.play(self.array_mobjects[mid][0].animate.set_fill(GREEN, 0.7))
                
                # Show comparison
                comparison_text = Text(f"Compare {key} with {arr[mid]}", font_size=20)
                comparison_text.next_to(status_text, UP, buff=0.3)
                self.play(Write(comparison_text))
                self.wait(1)
                
                if key < arr[mid]:
                    right = mid
                    result_text = Text(f"{key} < {arr[mid]}, search left half", font_size=20, color=BLUE)
                else:
                    left = mid + 1
                    result_text = Text(f"{key} >= {arr[mid]}, search right half", font_size=20, color=BLUE)
                
                result_text.next_to(comparison_text, DOWN, buff=0.2)
                self.play(Write(result_text))
                self.wait(1)
                
                # Clear comparison texts
                self.play(FadeOut(comparison_text), FadeOut(result_text))
                
                # Reset middle element color
                self.play(self.array_mobjects[mid][0].animate.set_fill(BLUE, 0.3))
                
                # Clear range highlighting
                self.clear_range_highlight(0, i)
            
            # Found insertion position
            pos = left
            
            # Highlight insertion position
            if pos < i:
                insertion_text = Text(f"Insert {key} at position {pos}", font_size=20, color=GREEN)
                insertion_text.next_to(status_text, UP, buff=0.3)
                self.play(Write(insertion_text))
                self.wait(1)
                
                # Animate shifting elements
                self.shift_elements(pos, i, key)
                
                self.play(FadeOut(insertion_text))
            
            # Reset current element color
            self.play(self.array_mobjects[pos][0].animate.set_fill(BLUE, 0.3))
            
            # Show sorted portion
            self.highlight_sorted_portion(i + 1)
            
            self.wait(1)
        
        # Final cleanup
        self.play(FadeOut(status_text))
        
        # Highlight entire array as sorted
        for mob in self.array_mobjects:
            self.play(mob[0].animate.set_fill(GREEN, 0.5), run_time=0.2)
    
    def highlight_range(self, left, right, color):
        for i in range(left, right):
            self.play(self.array_mobjects[i][0].animate.set_stroke(color, 3), run_time=0.3)
    
    def clear_range_highlight(self, left, right):
        for i in range(left, right):
            self.play(self.array_mobjects[i][0].animate.set_stroke(WHITE, 1), run_time=0.1)
    
    def shift_elements(self, pos, current_pos, key):
        # Shift elements to the right
        for j in range(current_pos, pos, -1):
            self.array_values[j] = self.array_values[j - 1]
            
            # Animate the swap
            self.play(
                self.array_mobjects[j][1].animate.become(
                    Text(str(self.array_values[j]), font_size=24, color=WHITE)
                    .move_to(self.array_mobjects[j][1].get_center())
                ),
                run_time=0.5
            )
        
        # Insert the key at the correct position
        self.array_values[pos] = key
        self.play(
            self.array_mobjects[pos][1].animate.become(
                Text(str(key), font_size=24, color=WHITE)
                .move_to(self.array_mobjects[pos][1].get_center())
            ),
            run_time=0.5
        )
    
    def highlight_sorted_portion(self, end_pos):
        # Briefly highlight the sorted portion
        for i in range(end_pos):
            self.play(self.array_mobjects[i][0].animate.set_fill(BLUE_C, 0.5), run_time=0.1)
        self.wait(0.5)
        for i in range(end_pos):
            self.play(self.array_mobjects[i][0].animate.set_fill(BLUE, 0.3), run_time=0.1)

# Additional scene showing the algorithm complexity
class BinaryInsertionSortComplexity(Scene):
    def construct(self):
        # Title
        title = Text("Binary Insertion Sort Complexity", font_size=48)
        title.to_edge(UP)
        self.play(Write(title))
        
        # Time complexity explanation
        time_complexity = VGroup(
            Text("Time Complexity:", font_size=32, color=YELLOW),
            Text("• Best Case: O(n log n)", font_size=24),
            Text("• Average Case: O(n²)", font_size=24),
            Text("• Worst Case: O(n²)", font_size=24),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.5)
        
        # Space complexity
        space_complexity = VGroup(
            Text("Space Complexity:", font_size=32, color=YELLOW),
            Text("• O(1) - In-place sorting", font_size=24),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        
        # Key features
        features = VGroup(
            Text("Key Features:", font_size=32, color=YELLOW),
            Text("• Stable sorting algorithm", font_size=24),
            Text("• Uses binary search for insertion position", font_size=24),
            Text("• Better than regular insertion sort for comparisons", font_size=24),
            Text("• Still requires O(n) shifts in worst case", font_size=24),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        
        # Position elements
        time_complexity.move_to(UP * 2 + LEFT * 3)
        space_complexity.next_to(time_complexity, DOWN, buff=1)
        features.next_to(space_complexity, DOWN, buff=1)
        
        # Animate
        self.play(Write(time_complexity))
        self.wait(1)
        self.play(Write(space_complexity))
        self.wait(1)
        self.play(Write(features))
        self.wait(3)