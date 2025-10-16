# Paint Element Smooth Dragging Fix

## Issue
Paint elements were not dragging smoothly and seamlessly like text and image elements. The dragging felt jerky and unresponsive.

## Root Cause
Paint elements were using `onDragMove` to update position continuously during drag, which caused:
- Continuous re-renders on every drag event
- Fighting with Konva's native drag animation
- Performance overhead
- Different behavior from text/image elements

## Solution
Changed paint element drag handlers to use **`onDragEnd` only**, matching the pattern used by TextElement and ImageElement:

```typescript
// ✅ CORRECT - Smooth dragging
<Group 
  draggable={isSelected}
  onDragEnd={(e) => {
    if (isSelected) {
      const newX = e.target.x() / zoom;
      const newY = (e.target.y() - plateOffsetY) / zoom;
      updateElement(element.id, { x: newX, y: newY });
      e.target.position({ x: 0, y: 0 });
    }
  }}
>
```

```typescript
// ❌ PREVIOUS - Jerky dragging
<Group 
  draggable={isSelected}
  onDragMove={(e) => {
    if (isSelected) {
      const newX = e.target.x() / zoom;
      const newY = (e.target.y() - plateOffsetY) / zoom;
      updateElement(element.id, { x: newX, y: newY });
      e.target.position({ x: 0, y: 0 }); // Reset on every move = jerky
    }
  }}
  onDragEnd={(e) => {
    if (isSelected) {
      e.target.position({ x: 0, y: 0 });
    }
  }}
>
```

## Why This Works

### Native Konva Animation
- Konva provides smooth drag animation out of the box
- The Group visually moves during drag without triggering React re-renders
- Dragging feels native and responsive

### Update Once at End
- Element position is only updated when drag completes
- Single re-render instead of continuous re-renders
- Group position is reset after element update

### Coordinate Transformation
- Still applies correct transformation: `(e.target.y() - plateOffsetY) / zoom`
- Accounts for zoom level and vertical offset
- Group reset to (0,0) since PaintElement calculates absolute positions

## Files Changed

`/src/components/Editor/canvas/Canvas.tsx` - Three locations:
1. Base layer paint elements (line ~297)
2. Base layer in license plate mode (line ~408)
3. License plate layer paint elements (line ~486)

## Result

✨ **Paint elements now drag smoothly and seamlessly:**
- Native Konva drag animation (no jerkiness)
- Matches text and image element behavior
- No performance overhead from continuous updates
- Accurate final positioning
- Consistent across all layers and zoom levels

## Key Takeaway

**When implementing draggable elements in Konva:**
- Use `onDragEnd` for smooth native dragging
- Avoid `onDragMove` unless you need real-time position tracking
- Let Konva handle the visual feedback during drag
- Update state only when drag completes
