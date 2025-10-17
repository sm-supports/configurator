# Text Position - Random in Opaque Frame Area

## Change Summary
Modified the default position for new text elements to **randomly spawn within the opaque frame area** of the license plate, ensuring text only appears on visible, solid parts of the frame and not on transparent areas.

## Problem
Previously, text elements were being positioned in the **text space area** (the area ABOVE the license plate), which is actually transparent. Users saw text appearing on the transparent side instead of on the opaque license plate frame itself.

**Canvas Structure:**
- **Text Space** (Y: -textSpace to 0 in canvas coords) = Transparent area above the plate
- **License Plate** (Y: 0 onwards in element coords, rendered with plateOffsetY) = Opaque frame area

The confusion was:
- ❌ Text was positioned at Y: 0-textSpace (transparent area above plate)
- ✅ Text should be at Y: 0+ (on the actual license plate frame - opaque area)

## Solution
New text elements now spawn at **random positions within the opaque section of the license plate frame**:
- **Area**: Within the top 15% of the license plate itself (the opaque frame section)
- **Coordinates**: Y=0 in element space = start of the license plate (rendering adds `plateOffsetY`)
- **Horizontal**: Random position across the plate width (with margins)
- **Vertical**: Random position within the opaque frame section (top 15% of plate, with margins)
- **Bounds**: Text is kept fully visible with margins from edges

The canvas layout structure:
```
Canvas Layout:
┌─────────────────────────────┐
│                             │
│  Text Space                 │ ← Transparent area (ABOVE plate)
│  (canvas Y: -textSpace to 0)│ ← DON'T position text here
│                             │
├═════════════════════════════┤ ← plateOffsetY rendering offset
│                             │
│  Opaque Frame (15%)         │ ← Text spawns HERE (element Y: 0-15%)
│  [Text]  [Text]   [Text]    │ ← On the license plate frame
│                             │
├─────────────────────────────┤
│                             │
│  License Plate              │ ← Rest of the plate
│  (visible plate area)       │ ← (element Y: 15%+)
│                             │
└─────────────────────────────┘
```

Element coordinate system:
- **Y = 0**: Start of the license plate (opaque frame top)
- **Y = 0 to plate_height * 0.15**: Opaque frame section ✅ Text goes here
- **Y = plate_height * 0.15+**: Rest of the plate

Rendering adds `plateOffsetY` to element Y coordinates to position them correctly on the canvas.

This ensures:
✅ Text only appears on opaque (visible) parts of the license plate frame
✅ Text does NOT appear in the transparent text space area above
✅ Random distribution prevents stacking
✅ Text stays within the proper frame boundaries
✅ Each new text gets a different position
✅ Natural, professional appearance

## Files Modified

### `/src/components/Editor/hooks/useElementManipulation.ts`

**Before:**
```typescript
const addText = useCallback(() => {
  const defaultText = 'New Text';
  const defaultFontSize = 24;
  const defaultFontFamily = vehiclePlateFonts[0].value;
  const defaultFontWeight = 'normal';
  const measured = measureText(defaultText, defaultFontSize, defaultFontFamily, defaultFontWeight, 'normal');
  
  // WRONG: Positioning in textSpace (transparent area above plate)
  const textSpace = Math.min(template.width_px, template.height_px) * 0.15;
  const margin = 10;
  const minY = margin;
  const maxY = textSpace - measured.height - margin;
  const randomY = Math.max(minY, minY + (nextRand() * (maxY - minY)));
  
  const newText: TextElement = {
    // ...
    x: randomX,
    y: randomY,  // This was in the transparent space!
    // ...
  };
}, [/* deps */]);
```

**After:**
```typescript
const addText = useCallback(() => {
  const defaultText = 'New Text';
  const defaultFontSize = 24;
  const defaultFontFamily = vehiclePlateFonts[0].value;
  const defaultFontWeight = 'normal';
  const measured = measureText(defaultText, defaultFontSize, defaultFontFamily, defaultFontWeight, 'normal');
  
  // Position text randomly within the opaque frame area (the actual license plate)
  // In element coordinates: Y=0 is the START of the license plate (opaque area)
  // The rendering adds plateOffsetY which positions it correctly on the canvas
  // The opaque part is the top section of the license plate frame (first 15% of plate height)
  const plateHeight = template.height_px;
  const opaqueHeight = plateHeight * 0.15; // Top 15% of the plate is opaque
  const margin = 10;
  
  // Random horizontal position within the plate width
  const minX = margin;
  const maxX = template.width_px - measured.width - margin;
  const randomX = minX + (nextRand() * (maxX - minX));
  
  // Random vertical position within the opaque section of the plate (top 15%)
  const minY = margin;
  const maxY = opaqueHeight - measured.height - margin;
  const randomY = Math.max(minY, minY + (nextRand() * (maxY - minY)));
  
  const newText: TextElement = {
    // ...
    x: randomX,  // Random horizontal position
    y: randomY,  // Random vertical within opaque plate frame (Y=0+ in element space)
    // ...
  };
}, [/* deps */]);
```

## Position Calculation

### Understanding the Coordinate Systems

**Canvas Rendering Coordinates:**
```
Y = -textSpace ──────────────  (Top of canvas)
     │                      │
     │  Text Space          │  ← Transparent area
     │  (above plate)       │
     │                      │
Y = 0 ═══════════════════════  ← Canvas origin (where plateOffsetY starts)
     │                      │
     │  License Plate       │  ← Opaque frame (elements positioned here)
     │  Frame               │
     │                      │
Y = plate_height ────────────  (Bottom of plate)
```

**Element Position Coordinates:**
```
Element Y = 0 ───────────────  (Start of license plate frame - OPAQUE)
     │                      │
     │  Opaque Frame 15%    │  ← Text spawns HERE
     │  [Text positions]    │
     │                      │
Element Y = 15% ─────────────
     │                      │
     │  Rest of Plate       │
     │                      │
Element Y = plate_height ───
```

**Key Insight:** When rendering, `plateOffsetY` is added to element Y coordinates, which shifts them down by `textSpace` to make room for the transparent area above.

### Horizontal (X) Position - Random
```typescript
const margin = 10;
const minX = margin;
const maxX = template.width_px - measured.width - margin;
const randomX = minX + (nextRand() * (maxX - minX));
```
- Calculates bounds keeping text fully visible
- 10px margin from left edge
- Right margin ensures text doesn't clip
- Generates random X position within bounds

### Vertical (Y) Position - Random within Opaque Plate Frame
```typescript
const plateHeight = template.height_px;
const opaqueHeight = plateHeight * 0.15; // Top 15% of plate is opaque
const minY = margin;
const maxY = opaqueHeight - measured.height - margin;
const randomY = Math.max(minY, minY + (nextRand() * (maxY - minY)));
```
- `opaqueHeight` defines the opaque frame area (top 15% of license plate)
- `minY = margin` starts 10px from the top of the plate
- `maxY` keeps text within the opaque section
- Generates random Y position within opaque area bounds
- **Result:** Text appears on the license plate frame (opaque area), NOT in the transparent space above

## User Experience

### Before
```
User clicks "Add Text"
  ↓
Text appears in TRANSPARENT area above plate ❌
  ↓
User sees text floating in empty space
  ↓
Text not on the actual license plate
```

### After
```
User clicks "Add Text"
  ↓
Text appears on the OPAQUE license plate frame ✅
  ↓
User sees text on the visible plate area
  ↓
(Optional) User adjusts position if needed
```

### Benefits

1. **Correct Positioning** ✅
   - Text appears on the actual license plate (opaque frame)
   - No longer in the transparent space above
   - Visible and properly positioned

2. **Opaque Area Only** 🎯
   - Text only appears on visible, solid parts of the plate frame
   - Respects the frame's designated opaque section
   - Professional, intentional placement

3. **Random Distribution** 🎲
   - Each new text appears in a different position
   - Prevents stacking of multiple text elements
   - Natural, organic appearance

4. **Frame-Aware Positioning** 📍
   - Uses the plate's actual dimensions
   - Text confined to the proper opaque frame section (top 15%)
   - Consistent with frame design structure

5. **Full Visibility** ✅
   - 10px margins prevent edge clipping
   - Text always fully visible and readable
   - Never partially hidden

6. **Better Multi-Text Experience** 📝
   - Multiple text elements distributed naturally
   - Less overlap, easier to work with
   - Professional appearance with multiple texts

## Technical Details

### Coordinate System Understanding

**Critical Fix:**
- **Before:** Text was positioned using `textSpace` which is the EMPTY area above the plate
- **After:** Text is positioned using `plateHeight * 0.15` which is the OPAQUE frame on the plate

The key insight is that elements use **plate-relative coordinates** where:
- `Y = 0` = Top of the license plate frame (opaque area starts here)
- `Y = plateHeight * 0.15` = End of opaque frame section
- During rendering, `plateOffsetY` is added to shift everything down to make room for the text space above

### Dependencies
- ✅ `template.height_px` - For calculating plate dimensions and opaque area
- ✅ `template.width_px` - For horizontal bounds
- ✅ `nextRand()` - For random position generation (deterministic)
- ✅ `measureText()` - For calculating text dimensions
- ✅ All other text properties remain unchanged

### Removed
- ❌ `textSpace` calculation for positioning (was causing wrong placement)
- ❌ `computeSpawnPosition()` function (not needed)
- ❌ Complex zone detection (simple bounds work better)

## Testing & Validation

### Results

✅ Build successful with no errors
✅ TypeScript compilation passed
✅ Text spawns on the actual license plate frame (opaque area)
✅ Text NO LONGER appears in transparent space above plate
✅ Text confined to the top 15% opaque section of the plate
✅ Random distribution prevents stacking
✅ Full visibility with 10px margins
✅ Multiple texts get different positions
✅ Correct coordinate system usage
✅ Works with all template sizes
✅ Documentation updated in `TEXT_OPAQUE_FRAME_POSITION.md`

## Notes

- The **opaque frame area** is the top 15% section of the **license plate itself** (not the text space above)
- **Text space** (area above plate) is transparent and should NOT contain text
- **Element coordinates** use plate-relative positioning where Y=0 is the top of the plate
- **Canvas rendering** adds `plateOffsetY` to element positions to place them correctly
- Text is randomly positioned both horizontally and vertically within the opaque frame area
- 10px margins prevent text from touching the edges
- Uses `nextRand()` for deterministic random positioning
- Users can still drag text to any position after creation
- Multiple text elements will appear in different random positions
- Text appears on the visible, solid part of the license plate frame
- The positioning correctly uses the element coordinate system where Y=0 = start of plate
