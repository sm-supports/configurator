# Frame Thickness Indicator Feature

## Overview
Added a visual frame thickness indicator that displays measurements directly on the canvas beside the license plate frame. The feature is activated via a toggle button on the toolbar (positioned beside the ruler button) and shows pencil-drawn style annotations with arrows pointing to each frame edge.

## Features

### 1. **Toggle Button**
- **Location**: Next to the ruler toggle button in the left section of the toolbar
- **Icon**: Pencil icon (drawing tool)
- **States**: 
  - Inactive: Gray with hover effect
  - Active: Amber background with glow shadow
- **Function**: Toggles the frame thickness indicator on/off

### 2. **Visual Indicator on Canvas**
- **Pencil Writing Style**: Uses 'Patrick Hand' handwriting font for authentic hand-drawn appearance
- **Arrows with Labels**: Arrows point from labels to the actual frame edges
- **Measurement Display**: Shows thickness in millimeters (mm) for each frame side
- **Frame Visualization**: 
  - Outer dashed yellow border shows canvas boundary
  - Inner dashed orange border shows the inner frame edge
  - Light amber background for text visibility
- **Dynamic Updates**: Automatically updates when frame size changes

### 3. **Frame Thickness Measurements**

#### Slim Size
- **Top**: 11mm
- **Left**: 11mm
- **Right**: 11mm
- **Bottom**: 15mm

#### Standard Size
- **Top**: 15mm
- **Left**: 15mm
- **Right**: 15mm
- **Bottom**: 24mm

#### XL Size
- **Top**: 18mm
- **Left**: 18mm
- **Right**: 18mm
- **Bottom**: 29mm

## Implementation Details

### Files Created/Modified

#### 1. `/src/components/Editor/canvas/FrameThicknessIndicator.tsx` ⭐ NEW
**Purpose**: Renders the frame thickness measurements on the canvas using Konva shapes

**Key Features**:
- Renders arrows pointing to each frame edge (top, left, right, bottom)
- Displays measurements in millimeters with handwriting font
- Shows visual frame boundaries with dashed lines
- Calculates pixel dimensions from mm values
- Positions labels outside the frame with proper spacing

**Props**:
- `frameSize`: Current frame size ('slim' | 'std' | 'xl')
- `canvasWidth`: Canvas width in pixels (with zoom)
- `canvasHeight`: Canvas height in pixels (with zoom)
- `zoom`: Current zoom level

#### 2. `/src/components/Editor/ui/panels/Toolbar.tsx`
**Changes**:
- Added toggle button for frame thickness indicator
- Uses context hook to access `showFrameThickness` state
- Button style matches ruler and centerline toggles
- Located after the ruler button

**Added Code**:
```tsx
{/* Frame Thickness Toggle Button */}
<button
  onClick={() => setShowFrameThickness(!showFrameThickness)}
  className={`p-2 rounded-lg transition-all ${
    showFrameThickness
      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
      : 'text-slate-300 hover:text-white hover:bg-slate-700'
  }`}
  title={showFrameThickness ? "Hide Frame Thickness" : "Show Frame Thickness Measurements"}
>
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
</button>
```

#### 3. `/src/components/Editor/core/context/EditorContext.tsx`
**Changes**:
- Added `showFrameThickness` state variable
- Added `setShowFrameThickness` setter function
- Included in context value and dependencies

**Added State**:
```tsx
const [showFrameThickness, setShowFrameThickness] = useState(false);
```

#### 4. `/src/components/Editor/canvas/Canvas.tsx`
**Changes**:
- Added `showFrameThickness` prop to CanvasProps
- Imported `FrameThicknessIndicator` component
- Added conditional Layer for frame thickness indicator
- Positioned after Rulers layer

**Added Layer**:
```tsx
{/* Frame Thickness Indicator Layer */}
{showFrameThickness && (
  <Layer offsetX={-view.x} offsetY={-view.y}>
    <FrameThicknessIndicator
      frameSize={state.frameSize}
      canvasWidth={template.width_px * zoom}
      canvasHeight={template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2)}
      zoom={zoom}
    />
  </Layer>
)}
```

#### 5. `/src/components/Editor/Editor.tsx`
**Changes**:
- Imported `showFrameThickness` from context
- Passed to `EditorContent` component

#### 6. `/src/components/Editor/ui/layout/EditorContent.tsx`
**Changes**:
- Added `showFrameThickness` prop to interface
- Passed through to `Canvas` component

#### 7. `/src/app/globals.css`
**Added**:
```css
/* Import handwriting font for pencil-style text */
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');

/* Custom handwriting font utility */
.font-handwriting {
  font-family: 'Patrick Hand', cursive;
}
```

## User Experience

### Interaction
1. User clicks the pencil icon button in the toolbar
2. Frame thickness indicator appears on the canvas
3. The indicator shows:
   - Arrows pointing from labels to frame edges
   - Measurements in millimeters for all four sides (TOP, LEFT, RIGHT, BOTTOM)
   - Visual frame boundaries with dashed lines
   - Light amber background for visibility
4. Click the button again to hide the indicator

### Visual Feedback
- **Button States**: 
  - Inactive: Gray with hover effect
  - Active: Amber background with shadow glow
- **Canvas Overlay**: 
  - Arrows with amber color pointing to frame edges
  - Handwriting font for measurements
  - Dashed borders showing frame boundaries
  - Non-intrusive positioning outside the main design area

## Technical Details

### Konva Components Used
- `Arrow` - For pointing lines from labels to frame edges
- `Text` - For measurements and labels with handwriting font
- `Rect` - For frame boundary visualization
- `Group` - For organizing related elements
- `Layer` - For canvas layering and offset management

### Measurement Conversion
- Converts millimeters to pixels: `1mm ≈ 3.78 pixels` at 96 DPI
- Formula: `mmToPixels = mm * 3.7795275591`

### Positioning Strategy
- Labels positioned outside frame with 60px offset
- Arrows point from labels to frame edges
- Background rectangle provides subtle visibility enhancement
- Layer uses same offset as rulers for proper alignment

### Colors
- Arrow/Text Color: `#78350f` (Amber-900)
- Frame Border: `#fbbf24` (Yellow-400) with dashed pattern
- Inner Frame: `#f59e0b` (Amber-500) with dashed pattern
- Background: `#fef3c7` (Amber-50) with 10% opacity

### Font Integration
- Uses Google Fonts 'Patrick Hand' for handwriting style
- Loaded via CSS import in globals.css
- Applied directly in Konva Text component via `fontFamily` prop

## Benefits

1. **Visual Reference**: Users can see frame measurements directly on the canvas
2. **Precise Measurements**: Shows exact thickness in millimeters for each side
3. **Context-Aware**: Automatically updates based on selected frame size
4. **Toggle Control**: Easy on/off control via toolbar button
5. **Professional Look**: Handwritten style with clear arrow annotations
6. **Non-Blocking**: Positioned outside the design area, doesn't interfere with work

## Future Enhancements (Optional)

- Add animation when toggling on/off
- Include visual frame cross-section diagram
- Add unit toggle (mm/inches) with conversion
- Animate arrows when frame size changes
- Add keyboard shortcut (e.g., `Shift+F`) to toggle display
- Show frame area percentage of total canvas
