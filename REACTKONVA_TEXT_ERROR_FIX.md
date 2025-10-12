# ReactKonva Text Rendering Error Fix

## Error
```
Text components are not supported for now in ReactKonva. Your text is: "0"
Cannot read properties of undefined (reading 'parent')
```

## Root Cause
The error was caused by the **spray brush** implementation in the `PaintElement.tsx` component. The issue occurred because the code was returning a nested array structure instead of flattened JSX elements.

### The Problem Code
```tsx
case 'spray':
  return (
    <Group {...baseProps}>
      {element.points.map((point, index) => {
        const sprayDotPositions = wasmOps.calculateSprayDots(...);
        
        const sprayDots = sprayDotPositions.map((dot, i) => (
          <Circle key={`${index}-${i}`} ... />
        ));
        
        return sprayDots;  // ❌ Returns an array from .map()
      })}
    </Group>
  );
```

### Why This Failed
When using `.map()` inside another `.map()`, React creates a nested array structure:
```
[
  [<Circle />, <Circle />, <Circle />],  // From point 0
  [<Circle />, <Circle />, <Circle />],  // From point 1
  ...
]
```

ReactKonva doesn't handle nested arrays properly, and the rendering engine tried to render the array itself as text (converting it to string), which resulted in:
- "0" appearing as text (the first index of the nested array)
- "Cannot read properties of undefined (reading 'parent')" when trying to attach it to the Konva scene graph

## Solution
Use `.flatMap()` instead of `.map()` to flatten the nested array structure:

```tsx
case 'spray':
  return (
    <Group {...baseProps}>
      {element.points.flatMap((point, index) => {  // ✅ Use flatMap
        const sprayDotPositions = wasmOps.calculateSprayDots(...);
        
        return sprayDotPositions.map((dot, i) => (  // ✅ Return array directly
          <Circle key={`${index}-${i}`} ... />
        ));
      })}
    </Group>
  );
```

### How flatMap() Works
`.flatMap()` automatically flattens the result by one level:
```
[
  <Circle />, <Circle />, <Circle />,  // Flattened from point 0
  <Circle />, <Circle />, <Circle />,  // Flattened from point 1
  ...
]
```

Now ReactKonva receives a flat array of Circle components, which it can render correctly.

## Files Modified
- `src/components/Editor/canvas/elements/PaintElement.tsx`
  - Changed `element.points.map()` to `element.points.flatMap()` in the spray brush case
  - Removed intermediate `sprayDots` variable
  - Directly return the mapped Circle components

## Impact
✅ Spray brush tool now renders correctly without errors
✅ No more "Text components are not supported" errors
✅ No more "Cannot read properties of undefined" errors
✅ All brush types (brush, airbrush, spray) work correctly
✅ Build successful with no issues

## Testing
- ✅ TypeScript compilation passed
- ✅ Build successful with no errors
- ✅ Spray brush renders correctly in the canvas
- ✅ No console errors when using spray brush tool

## Related Concepts

### When to Use flatMap()
Use `.flatMap()` when you need to:
1. Map over an array
2. Each item produces multiple items (another array)
3. You want a flat result instead of nested arrays

### ReactKonva Requirements
- ReactKonva components can only render other ReactKonva components (Group, Shape, etc.)
- Regular React text/numbers cannot be rendered inside Konva components
- Arrays must be flat (one level) for proper rendering
- Nested arrays cause the reconciler to fail

## Prevention
To avoid similar issues in the future:
1. ✅ Use `.flatMap()` when mapping produces arrays
2. ✅ Test all brush types after making changes to paint rendering
3. ✅ Watch for console warnings about text rendering in Konva
4. ✅ Ensure all Konva Group children are valid Konva components
