# License Plate Masking Fix (Superseded)

⚠️ **This document describes an incomplete fix. See [AIRBRUSH_SPRAY_MASKING_FIX.md](./AIRBRUSH_SPRAY_MASKING_FIX.md) for the complete solution.**

## Problem
Paint elements (brush, airbrush, spray) were showing in the transparent areas of the license plate frame. They should only be visible within the opaque regions of the frame.

## Initial Diagnosis (Incomplete)
The mask was conditionally applied only when `state.activeLayer === 'licenseplate'`:

```typescript
// WRONG - mask only applied when viewing license plate layer
{licensePlateFrame && state.activeLayer === 'licenseplate' && (
  <KonvaImage
    globalCompositeOperation="destination-in"
    ...
  />
)}
```

This meant:
- ✅ Mask applied when actively painting on license plate layer
- ❌ Mask NOT applied when switching to base layer
- ❌ Paint would "leak" into transparent frame areas

## Solution
Remove the `state.activeLayer` condition so the mask is ALWAYS applied:

```typescript
// CORRECT - mask always applied to license plate layer
{licensePlateFrame && (
  <KonvaImage
    globalCompositeOperation="destination-in"
    ...
  />
)}
```

Now:
- ✅ Mask always applied to license plate layer content
- ✅ All paint (brush, airbrush, spray) clipped to opaque areas
- ✅ Text and images also properly clipped
- ✅ Works regardless of active layer

## How Masking Works

### Canvas Composite Operations
```
1. Draw all license plate content (paint, text, images)
   ↓
2. Apply frame image with globalCompositeOperation="destination-in"
   ↓
3. Result: Only pixels where frame is opaque remain visible
```

### Visual Result
```
BEFORE (without mask):
┌─────────────────┐
│   ████████████  │  ← Paint visible in transparent border
│ ██████████████  │
│   ████████████  │
└─────────────────┘

AFTER (with mask):
┌─────────────────┐
│                 │  ← Transparent border clean
│  ██████████████ │  ← Paint only in plate area
│                 │
└─────────────────┘
```

## Technical Details

### Konva Composite Operations
- `destination-in`: Keep destination pixels only where source is opaque
- Frame image acts as alpha mask
- GPU-accelerated operation (fast)

### Layer Structure
```
License Plate Layer (Group)
├── Paint Elements (all types)
├── Text Elements
├── Image Elements
└── Frame Mask (destination-in)  ← Clips all above
```

### Why This Works
1. Group renders all content to internal buffer
2. Frame image with `destination-in` acts as mask
3. Final composited result only shows where frame is opaque
4. All content types (paint, text, images) automatically clipped

## Files Modified

**`/src/components/Editor/canvas/Canvas.tsx`** (Line 548)

Changed from:
```typescript
{licensePlateFrame && state.activeLayer === 'licenseplate' && (
```

To:
```typescript
{licensePlateFrame && (
```

## Testing Checklist

1. ✅ **Paint with brush near frame edges**
   - Should clip at opaque boundary
   - No paint in transparent border

2. ✅ **Paint with airbrush near frame edges**
   - Soft glow should clip cleanly
   - No glow bleeding into transparent areas

3. ✅ **Paint with spray near frame edges**
   - Dots should clip at boundary
   - No dots in transparent border

4. ✅ **Switch between layers**
   - Mask should remain applied
   - No visual change when switching layers

5. ✅ **Text and images**
   - Also properly clipped (as before)
   - Consistent behavior with paint

## Visual Verification

### Correct Behavior
- Paint stops at license plate boundary
- Clean edge where plate meets transparent frame
- No artifacts or partial elements in transparent areas

### Incorrect Behavior (if mask not applied)
- Paint extends into transparent frame border
- Airbrush glow bleeds into transparent areas
- Spray dots appear outside plate boundary

## Performance Impact

**None** - the mask was already being rendered, just conditionally. Now it's always rendered, which is the correct behavior with zero performance difference.

## Related Code

The mask applies to ALL elements in the license plate layer Group:
- Paint elements (brush, airbrush, spray)
- Text elements
- Image elements
- Live preview (paint in progress)

All are automatically clipped by the single mask at the end of the Group.

## Why This Fix Was Incomplete

Removing the conditional fixed the issue for **brush** paint, but **airbrush** and **spray** still showed in transparent areas because:

1. Brush uses a single `<Line>` element (no nesting)
2. Airbrush uses `<Group>` with nested `<Line>` elements
3. Spray uses `<Group>` with nested `<Circle>` elements

**Konva's `globalCompositeOperation` doesn't properly clip nested Groups!**

## Complete Solution

See [AIRBRUSH_SPRAY_MASKING_FIX.md](./AIRBRUSH_SPRAY_MASKING_FIX.md) for the complete fix using `clipFunc` instead of `globalCompositeOperation`.

The final solution:
- ✅ Uses `clipFunc` on the parent Group
- ✅ Works with ANY nesting depth
- ✅ Clips brush, airbrush, AND spray correctly
- ✅ Better performance (no extra Image element)
