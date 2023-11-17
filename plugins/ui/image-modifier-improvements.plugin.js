/*
    Image Modifier Improvements
    by Patrice

    1. Allows for multiple custom modifier categories. Use # to name your custom categories, e.g.:
        #Custom category 1
        Custom modifier 1
        Custom modifier 2
        ...    
        #Custom category 2
        Custom modifier n
        ...
        #Custom category n...
        ...
    2. Restores the image modifier cards upon reloading the page.
    3. Adds a Clear All button on top of the task's image modifiers.
    4. Drop images on the modifier cards to set a custom visual (square pictures work best, e.g. 512x512).
    5. Adds import/export capabilities to the custom category editor (also exports/imports custom visuals).
    6. Collapses other categories when selecting a new one.
    7. Search box for quick search through custom and predefined modifiers.
    8. Supports assigning LoRA's to image modifiers, including optional multipliers. Adding/removing LoRA tags preserves the existing images as long as the syntax is respected.
        Syntax:
        #Custom category 1
        Custom modifier 1<lora:filename1>
        Custom modifier 2<lora:filename2:multiplier>
        ...    
*/
// now built in