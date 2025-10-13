# Canvas Masking Logic – Mode-Based Element Visibility

## Overview
The license plate configurator uses **Konva.js** to render a canvas with two distinct modes:
1. **Base Mode** – Elements visible across the entire canvas (no masking)
2. **License Plate Mode** – ALL elements clipped to the opaque regions of `license-plate-frame.png` (strict masking)

---

## Problem Statement
In License Plate Mode, all design elements (base layer images, license plate designs, text, paint strokes, uploaded images) must be **visible ONLY within the opaque areas** of the license plate frame PNG. Elements should never appear in transparent regions or outside the intended plate boundaries.

---

## Solution Implementation

### Mode-Based Rendering Strategy

The canvas uses **conditional layer rendering** based on `state.activeLayer`:

#### **BASE MODE** (`state.activeLayer === 'base'`)
```tsx
// Base layer elements rendered in their own layer WITHOUT masking
<Layer offsetX={-view.x} offsetY={-view.y}>
  {/* All base layer elements (images, text, paint) */}
  {/* No clipping - elements visible across entire canvas */}
</Layer>

<Layer>
  {/* License plate frame at 30% opacity (reference only) */}
</Layer>

<Layer>
  {/* License plate layer elements */}
  {/* In base mode, these elements are dimmed (40% opacity) */}
</Layer>
```

**Result**: All elements can be placed anywhere on the canvas without restrictions.

---

#### **LICENSE PLATE MODE** (`state.activeLayer === 'licenseplate'`)
```tsx
// White background layer
<Layer>
  <Rect fill="#FFFFFF" /> {/* Simulates printed plate background */}
</Layer>

// License plate frame at full opacity
<Layer>
  <KonvaImage image={licensePlateFrame} opacity={1} />
</Layer>

// MASKED LAYER - ALL elements clipped to frame's opaque areas
<Layer>
  <Group>
    {/* BASE LAYER ELEMENTS - rendered here in License Plate Mode */}
    {state.activeLayer === 'licenseplate' && baseElements.map(...)}
    
    {/* LICENSE PLATE LAYER ELEMENTS */}
    {licensePlateElements.map(...)}
    
    {/* LIVE PAINT PREVIEW */}
    {state.isPainting && <Line />}
    
    {/* THE MASK - Applied last with destination-in composite operation */}
    {licensePlateFrame && state.activeLayer === 'licenseplate' && (
      <KonvaImage
        image={licensePlateFrame}
        globalCompositeOperation="destination-in"
      />
    )}
  </Group>
</Layer>
```

**Result**: All elements (base + license plate layers) are clipped to only the opaque regions of the license plate frame PNG.

---

## Key Technical Details

### 1. **`globalCompositeOperation="destination-in"`**
This is the core masking technique:
- **Renders ALL content first** (base elements + license plate elements + paint strokes)
- **Applies the frame PNG last** with `destination-in` operation
- **Result**: Only pixels that overlap with the opaque areas of the frame PNG remain visible
- Everything outside or in transparent areas of the frame is clipped/hidden

### 2. **Conditional Element Rendering**
```tsx
// BASE MODE: Base layer elements in separate layer (no mask)
{state.activeLayer === 'base' && <Layer>{baseElements}</Layer>}

// LICENSE PLATE MODE: Base layer elements inside masked Group
{state.activeLayer === 'licenseplate' && baseElements.map(...)}
```

Base layer elements are rendered in **different locations** depending on the mode:
- **Base Mode**: In their own unmasked layer
- **License Plate Mode**: Inside the masked Group so they get clipped

### 3. **Layer Rendering Order (License Plate Mode)**
```
1. Background image (template background)
2. White background rect (simulates plate material)
3. License plate frame (100% opacity, reference layer)
4. Masked Group containing:
   - Base layer elements
   - License plate layer elements  
   - Live paint preview
   - Frame mask (destination-in)
5. Selection transformer (separate layer, not masked)
6. Paint cursor preview (not masked)
```

### 4. **Opacity Indicators**
- **Active layer elements**: 100% opacity (fully visible, editable)
- **Inactive layer elements**: 40% opacity (dimmed but still visible)
- This visual distinction helps users understand which layer elements belong to

---

## Why This Works

### The Masking Group Pattern
```tsx
<Group>
  {/* 1. Render content */}
  <ImageElement />
  <TextElement />
  <PaintStrokes />
  
  {/* 2. Apply mask last */}
  <KonvaImage 
    image={maskImage} 
    globalCompositeOperation="destination-in" 
  />
</Group>
```

Konva processes the Group as a **single canvas context**:
1. All content renders to the Group's internal canvas
2. The `destination-in` operation keeps only pixels where:
   - Content exists (from steps 1)
   - AND mask image is opaque

This is the standard canvas compositing technique for alpha masking.

---

## Testing Checklist

### Base Mode
- [ ] Base layer elements visible across entire canvas
- [ ] License plate elements visible at 40% opacity
- [ ] License plate frame visible at 30% opacity (reference)
- [ ] No masking/clipping applied
- [ ] All elements editable and draggable

### License Plate Mode
- [ ] White background visible
- [ ] License plate frame at 100% opacity
- [ ] Base layer elements ONLY visible in opaque frame areas
- [ ] License plate elements ONLY visible in opaque frame areas
- [ ] Paint strokes ONLY visible in opaque frame areas
- [ ] NO elements visible in transparent frame regions
- [ ] NO elements visible outside frame boundaries
- [ ] All elements editable and draggable
- [ ] Base layer elements dimmed to 40% opacity

### Mode Switching
- [ ] Smooth transition between modes
- [ ] No flickering or rendering artifacts
- [ ] Masking correctly enabled/disabled
- [ ] Selection handles remain visible (not masked)

---

## Performance Considerations

1. **Group Caching**: Konva automatically handles group rendering efficiently
2. **Conditional Rendering**: Elements only rendered in their respective mode layers
3. **Single Composite Operation**: Only one `destination-in` operation per frame
4. **Layer Separation**: Transformer and cursor in separate layers (not affected by masking)

---

## Common Issues & Solutions

### Issue: Elements visible outside mask in License Plate Mode
**Cause**: Elements not inside the masked Group
**Solution**: Ensure ALL elements are children of the Group with the `destination-in` mask

### Issue: Mask not applying correctly
**Cause**: Mask image not loaded or composite operation applied to wrong element
**Solution**: Verify `licensePlateFrame` image is loaded and `destination-in` is on the mask image (last element in Group)

### Issue: Elements flickering between modes
**Cause**: React re-rendering causing layer recreation
**Solution**: Use conditional rendering (`&&`) to show/hide layers based on mode

---

## Code Location
**File**: `src/components/Editor/canvas/Canvas.tsx`
**Lines**: 228-560 (layer rendering section)

## Related Files
- `src/components/Editor/Editor.tsx` - Mode switching logic
- `src/components/Editor/ui/panels/LayersPanel.tsx` - Layer UI controls
- `public/license-plate-frame.png` - The mask image

---

## Summary

✅ **License Plate Mode**: ALL elements masked to frame's opaque areas using `destination-in`  
✅ **Base Mode**: No masking, elements visible across entire canvas  
✅ **Mode switching**: Clean enable/disable of masking via conditional rendering  
✅ **Performance**: Efficient single-composite-operation approach  
✅ **User Experience**: Clear visual feedback with opacity indicators
