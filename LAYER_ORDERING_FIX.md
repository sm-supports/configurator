# Layer Ordering Fix

## Problem
Text and image layer shuffling wasn't working correctly. When moving an image layer above a text layer, the text would not go under the image layer as expected. However, image-to-image layer ordering worked fine.

## Root Cause
The Canvas.tsx component was rendering different element types (images, text, paint) in **separate rendering blocks** within each layer. This caused all elements of one type to render either above or below all elements of another type, regardless of their `zIndex` values.

### Previous Structure (Incorrect)
```tsx
// Base Layer
<Layer>
  {/* Only images rendered here */}
  {sortedElements.filter(el => el.type === 'image' && el.layer === 'base').map(...)}
</Layer>

// License Plate Layer  
<Layer>
  <Group>
    {/* Step 1: Images */}
    {sortedElements.filter(el => el.type === 'image' && el.layer === 'licenseplate').map(...)}
    
    {/* Step 2: Text - ALWAYS renders on top of all images */}
    {sortedElements.filter(el => el.type === 'text').map(...)}
    
    {/* Step 3: Paint */}
    {sortedElements.filter(el => el.type === 'paint').map(...)}
  </Group>
</Layer>
```

This structure meant:
- ❌ All images rendered first (lowest)
- ❌ Then ALL text elements (middle) 
- ❌ Then all paint elements (highest)
- ❌ `zIndex` only worked within each type, not across types

## Solution
Render **all element types together in a single sorted list**, respecting their `zIndex` values across all element types.

### New Structure (Correct)
```tsx
// Base Layer
<Layer>
  {sortedElements
    .filter(element => element.layer === 'base')
    .map(element => {
      if (element.type === 'image') return <ImageElement />
      else if (element.type === 'text') return <TextElement />
      else if (element.type === 'paint') return <PaintElement />
    })}
</Layer>

// License Plate Layer
<Layer>
  <Group>
    {sortedElements
      .filter(element => element.layer === 'licenseplate')
      .map(element => {
        if (element.type === 'image') return <ImageElement />
        else if (element.type === 'text') return <TextElement />
        else if (element.type === 'paint') return <PaintElement />
      })}
  </Group>
</Layer>
```

This structure now:
- ✅ Sorts ALL elements by `zIndex` (ascending order)
- ✅ Renders them in that exact order
- ✅ Layer ordering works across all element types (text, image, paint)
- ✅ Lower `zIndex` = rendered first = appears behind
- ✅ Higher `zIndex` = rendered last = appears on top

## Changes Made
**File: `src/components/Editor/canvas/Canvas.tsx`**

### 1. Base Layer Section (lines ~220-320)
- **Before**: Only rendered images with `element.type === 'image' && element.layer === 'base'`
- **After**: Renders ALL element types with `element.layer === 'base'`
- Uses type checking (`if (element.type === 'image')`, `else if (element.type === 'text')`, etc.)

### 2. License Plate Layer Section (lines ~338-420)
- **Before**: Three separate rendering blocks (images, then text, then paint)
- **After**: Single unified rendering loop for all element types
- Maintains the masking functionality for the license plate layer

## Testing
✅ Build successful with no errors
✅ TypeScript compilation passed
✅ All element types now respect `zIndex` ordering
✅ Text elements can be placed behind image elements
✅ Image elements can be placed behind text elements
✅ Paint elements properly integrate into the layer order

## Impact
- **Layer ordering now works correctly** for all element type combinations
- No breaking changes to existing functionality
- All elements maintain their interactive properties and opacity behavior
- The fix applies to both Base Layer and License Plate Layer

## Related Files
- `src/components/Editor/canvas/Canvas.tsx` - Main fix
- `src/components/Editor/services/EditorStateManager.ts` - Contains layer manipulation methods (moveElementUp, moveElementDown, etc.)
- `src/components/Editor/ui/panels/LayersPanel.tsx` - UI for managing layers
