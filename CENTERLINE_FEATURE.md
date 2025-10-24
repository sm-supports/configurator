# Centerline Feature Implementation

## Overview
Added a centerline feature that displays horizontal and vertical lines at the center of the canvas when a button is clicked.

## Components Added/Modified

### 1. **New Centerline Element Type** (`src/components/Editor/core/types.ts`)
- Added `CenterlineElement` interface with properties:
  - `x`, `y`: Center position
  - `width`, `height`: Canvas dimensions
  - `color`: Line color (default: red)
  - `strokeWidth`: Line thickness (default: 1)
  - `opacity`: Line opacity (default: 0.5)
  - Plus standard element properties

### 2. **New CenterlineElement Component** (`src/components/Editor/canvas/elements/CenterlineElement.tsx`)
- React component that renders both horizontal and vertical lines
- Lines span the full canvas width and height
- Supports selection and clicking

### 3. **Updated useElementManipulation Hook** (`src/components/Editor/hooks/useElementManipulation.ts`)
- Added `addCenterline()` function that creates a centerline element positioned at the canvas center
- Centerline properties:
  - Color: Red (#FF0000)
  - Stroke Width: 1px
  - Opacity: 0.5 (semi-transparent)

### 4. **Updated EditorContext** (`src/components/Editor/core/context/EditorContext.tsx`)
- Exposed `addCenterline` function in context
- Added to context value object and dependency array

### 5. **Updated Editor Component** (`src/components/Editor/Editor.tsx`)
- Passed `addCenterline` to Toolbar component

### 6. **Updated Toolbar Component** (`src/components/Editor/ui/panels/Toolbar.tsx`)
- Added `addCenterline` button to the toolbar with teal color (#14b8a6)
- Button shows icon of crossed horizontal and vertical lines
- Button positioned after the Shape Tools button
- Title: "Add Centerline (Horizontal & Vertical Lines)"

### 7. **Updated Canvas Component** (`src/components/Editor/canvas/Canvas.tsx`)
- Added CenterlineElement import
- Added centerline rendering in both:
  - Base layer elements (when in license plate mode)
  - License plate layer elements
- Lines render with proper zoom scaling

## Usage
1. Click the teal centerline button in the toolbar (looks like a crosshair ✝)
2. A horizontal and vertical line will appear at the center of the canvas
3. The lines are semi-transparent (50% opacity) in red color
4. Can be selected and managed like any other element

## Styling
- Button Color: Teal (#14b8a6)
- Line Color: Red (#FF0000)
- Line Opacity: 50%
- Line Width: 1px
- Hover effect: Darker teal (#0d9488)

## Technical Details
- Centerline elements are stored in the state and can be saved/exported
- Lines span the full canvas dimensions
- Both horizontal and vertical lines rendered in a Group
- Supports zoom scaling automatically
- Can be selected but not transformed (lines are reference guides)
