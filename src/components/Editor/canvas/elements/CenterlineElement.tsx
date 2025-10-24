import React from 'react';
import { Line, Group } from 'react-konva';
import { CenterlineElement as CenterlineElementType } from '../../core/types';

interface CenterlineElementProps {
  element: CenterlineElementType;
  onSelect: () => void;
  stageWidth: number;
  stageHeight: number;
  plateOffsetY: number;
}

export const CenterlineElement: React.FC<CenterlineElementProps> = ({
  element,
  onSelect,
  stageWidth,
  stageHeight,
  plateOffsetY,
}) => {
  // Center point of the actual canvas
  // The actual stage/canvas height includes the plate height + text space (plateOffsetY)
  // So the total height is: stageHeight + plateOffsetY
  const totalCanvasHeight = stageHeight + plateOffsetY;
  
  // X center is at the middle of the width
  const centerX = (stageWidth / 2);
  // Y center is at the middle of the TOTAL canvas height (including text space)
  const centerY = totalCanvasHeight / 2;

  // Extend lines beyond canvas boundaries for visibility on all sides
  const extend = Math.max(stageWidth, stageHeight) * 0.5;

  return (
    <Group key={element.id}>
      {/* Horizontal line - spans full width centered at centerY */}
      <Line
        x={0}
        y={centerY}
        points={[0, 0, stageWidth, 0]}
        stroke={element.color}
        strokeWidth={element.strokeWidth}
        opacity={element.opacity}
        lineCap="round"
        lineJoin="round"
        onClick={onSelect}
        onTap={onSelect}
        pointerEvents="auto"
        listening={true}
      />

      {/* Vertical line - spans full height centered at centerX */}
      <Line
        x={centerX}
        y={0}
        points={[0, 0, 0, stageHeight]}
        stroke={element.color}
        strokeWidth={element.strokeWidth}
        opacity={element.opacity}
        lineCap="round"
        lineJoin="round"
        onClick={onSelect}
        onTap={onSelect}
        pointerEvents="auto"
        listening={true}
      />

      {/* Left segment - horizontal line extension to the left */}
      <Line
        x={-extend}
        y={centerY}
        points={[0, 0, extend, 0]}
        stroke={element.color}
        strokeWidth={element.strokeWidth * 1.5}
        opacity={element.opacity}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />

      {/* Right segment - horizontal line extension to the right */}
      <Line
        x={stageWidth}
        y={centerY}
        points={[0, 0, extend, 0]}
        stroke={element.color}
        strokeWidth={element.strokeWidth * 1.5}
        opacity={element.opacity}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />

      {/* Top segment - vertical line extension upward */}
      <Line
        x={centerX}
        y={-extend}
        points={[0, 0, 0, extend]}
        stroke={element.color}
        strokeWidth={element.strokeWidth * 1.5}
        opacity={element.opacity}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />

      {/* Bottom segment - vertical line extension downward */}
      <Line
        x={centerX}
        y={stageHeight}
        points={[0, 0, 0, extend]}
        stroke={element.color}
        strokeWidth={element.strokeWidth * 1.5}
        opacity={element.opacity}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
    </Group>
  );
};
