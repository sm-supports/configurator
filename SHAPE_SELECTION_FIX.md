# Shape Selection Fix

## Problem
Shapes could be generated successfully but were not selectable when clicked on the canvas.

## Root Causes Identified

### 1. **Individual Shape Elements Had `listening: false`**
In `ShapeElement.tsx`, all individual shape components (Rectangle, Circle, Triangle, Star, Hexagon, Pentagon) had their `listening` property set to `false`, which prevented them from receiving click events.

```tsx
// BEFORE (incorrect)
const shapeProps = {
  fill,
  stroke,
  strokeWidth,
  listening: false, // Group handles the events ❌
};
```

### 2. **Extra Group Wrapper Interference**
In `Canvas.tsx`, shape elements were being wrapped in an additional `Group` component with opacity, which could interfere with event propagation:

```tsx
// BEFORE (incorrect)
<Group key={element.id} opacity={elementOpacity}>
  <ShapeElementComponent
    element={shapeEl}
    // ...
  />
</Group>
```

### 3. **Event Bubbling Issues**
Click events on shapes could bubble up to the stage, causing the stage's click handler to deselect the element immediately after selection.

## Solutions Implemented

### 1. **Enabled Listening on Shape Elements**
Changed all individual shape components to have `listening: true`:

```tsx
// AFTER (correct)
const shapeProps = {
  fill,
  stroke,
  strokeWidth,
  listening: true, // Allow shapes to receive click events ✅
  perfectDrawEnabled: false, // Improve performance
};
```

### 2. **Removed Extra Group Wrapper**
Removed the unnecessary wrapping Group in Canvas.tsx so ShapeElementComponent renders directly:

```tsx
// AFTER (correct)
<ShapeElementComponent
  key={element.id}
  element={shapeEl}
  zoom={zoom}
  plateOffsetY={plateOffsetY}
  isInteractive={isInteractive}
  onSelect={() => selectElement(element.id)}
  onUpdate={(updates) => updateElement(element.id, updates)}
  bumpOverlay={bumpOverlay}
/>
```

### 3. **Improved Click Event Handling**
Enhanced the Group component in ShapeElement.tsx with proper event handling:

```tsx
onClick={(e) => {
  if (isInteractive) {
    e.cancelBubble = true; // Prevent event from bubbling to stage
    onSelect();
  }
}}
onTap={(e) => {
  if (isInteractive) {
    e.cancelBubble = true; // Prevent event from bubbling to stage
    onSelect();
  }
}}
```

### 4. **Added Visual Feedback**
Implemented cursor changes to indicate shapes are interactive:

```tsx
onMouseEnter={(e) => {
  if (isInteractive) {
    const container = e.target.getStage()?.container();
    if (container) {
      container.style.cursor = 'pointer';
    }
  }
}}
onMouseLeave={(e) => {
  if (isInteractive) {
    const container = e.target.getStage()?.container();
    if (container) {
      container.style.cursor = 'default';
    }
  }
}}
```

## Files Modified

1. **`/src/components/Editor/canvas/elements/ShapeElement.tsx`**
   - Changed `listening: false` to `listening: true` on all shape primitives
   - Added `perfectDrawEnabled: false` for performance optimization
   - Enhanced onClick/onTap handlers with `e.cancelBubble = true`
   - Added onMouseEnter/onMouseLeave for cursor feedback

2. **`/src/components/Editor/canvas/Canvas.tsx`**
   - Removed unnecessary Group wrapper around ShapeElementComponent (3 occurrences)
   - Direct rendering of ShapeElementComponent in both base and license plate layers

## Testing Recommendations

1. **Basic Selection**: Click on various shape types (rectangle, circle, triangle, star, hexagon, pentagon) to ensure they can be selected
2. **Multiple Shapes**: Create multiple shapes and verify each can be selected individually
3. **Layer Testing**: Test selection in both 'base' and 'licenseplate' layers
4. **Paint Tool Interaction**: Verify shapes are not selectable when paint tools are active
5. **Transform Testing**: After selection, verify the transformer appears and shapes can be resized/rotated
6. **Cursor Feedback**: Verify cursor changes to pointer when hovering over shapes
7. **Click Deselection**: Click on empty canvas area and verify shapes are deselected

## Technical Details

### Event Flow
1. User clicks on a shape
2. Shape element receives click event (listening: true)
3. Event handler calls `e.cancelBubble = true` to prevent stage click
4. `onSelect()` is called, updating `state.selectedId`
5. Transformer attaches to the selected shape
6. Visual feedback (cursor, transformer handles) appears

### Performance Considerations
- `perfectDrawEnabled: false` improves rendering performance for shapes
- Event bubbling cancellation prevents unnecessary state updates
- Direct rendering (without extra Group wrapper) reduces node tree depth

## Known Behaviors

- Shapes are not interactive when paint tools (brush, airbrush, spray, eraser) are active
- This is intentional to allow painting over shapes
- Selection is restored when switching back to select tool

## Related Systems

This fix integrates with:
- **Transformer System**: Selected shapes show transform handles
- **Toolbar**: Shape tool buttons and settings panel
- **Layer System**: Shapes respect base/licenseplate layer visibility
- **Paint Tools**: Proper interaction disable when painting
- **Keyboard Shortcuts**: Delete key works on selected shapes
