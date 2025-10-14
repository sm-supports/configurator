# Brush Type Synchronization Fix (Updated)

## Problem

Airbrush and spray tools were painting like regular brush - all three tools produced identical solid lines instead of their distinct effects (soft glow for airbrush, scattered dots for spray).

**Update**: This issue reappeared after git revert and needed to be fixed again.

## Root Cause
The Toolbar buttons were only updating `activeTool` but NOT updating `paintSettings.brushType`. 

When a paint stroke was saved, it used `state.paintSettings.brushType` (which stayed at default 'brush'), not `state.activeTool`.

## Solution
Added `setPaintSettings({ brushType: 'brush/airbrush/spray' })` to each button's onClick handler.

### Files Changed
**`/src/components/Editor/ui/panels/Toolbar.tsx`** (Lines 197, 215, 233)

```typescript
// Before (BROKEN)
<button onClick={() => {
  setActiveTool('brush');  // Only sets tool
  setShowPaintSettings(false);
}}>

// After (FIXED)
<button onClick={() => {
  setActiveTool('brush');
  setPaintSettings({ brushType: 'brush' });  // ✅ Also sets brush type!
  setShowPaintSettings(false);
}}>
```

## Verification
The paint element creation correctly uses `brushType`:
```typescript
// In useElementManipulation.ts line 369
const newPaintElement: PaintElement = {
  ...
  brushType: state.paintSettings.brushType,  // ✅ This is used
  ...
};
```

## Testing
1. **Select regular brush** → Paint a stroke → Should see solid line
2. **Select airbrush** → Paint a stroke → Should see soft, glowing line  
3. **Select spray** → Paint a stroke → Should see dotted/dashed line

All three should now look different! 🎨

## Technical Flow
```
User clicks button
  ↓
setActiveTool('airbrush')           ← Changes cursor/behavior
  +
setPaintSettings({ brushType: 'airbrush' })  ← Sets visual effect
  ↓
User paints
  ↓
finishPainting() creates PaintElement with brushType: 'airbrush'
  ↓
PaintElement.tsx renders with switch(element.brushType)
  ↓
Correct visual effect applied!
```

## Previous Issue Chain
1. User clicked "Airbrush" button
2. Only `activeTool` changed to 'airbrush'
3. `paintSettings.brushType` stayed at 'brush' (default)
4. Paint stroke saved with `brushType: 'brush'`
5. Rendered as regular brush ❌

## Fixed Flow
1. User clicks "Airbrush" button
2. Both `activeTool` AND `paintSettings.brushType` change to 'airbrush' ✅
3. Paint stroke saved with `brushType: 'airbrush'` ✅
4. Rendered with shadowBlur (GPU-accelerated glow) ✅

Now all three brush types should render with their unique visual effects! 🎨✨
