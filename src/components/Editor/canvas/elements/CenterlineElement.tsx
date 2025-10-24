import React from 'react';
import { Line, Group } from 'react-konva';
import { CenterlineElement as CenterlineElementType } from '../../core/types';

interface CenterlineElementProps {
  element: CenterlineElementType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<CenterlineElementType>) => void;
  stageWidth: number;
  stageHeight: number;
  plateOffsetY: number;
  zoom: number;
}

export const CenterlineElement: React.FC<CenterlineElementProps> = ({
  element,
  isSelected,
  onSelect,
  onUpdate,
  stageWidth,
  stageHeight,
  plateOffsetY,
  zoom,
}) => {
  // Center point of the canvas (scaled by zoom)
  const centerX = element.x * zoom;
  const centerY = element.y * zoom + plateOffsetY;

  // Extend lines beyond canvas boundaries for visibility on all sides
  const extend = Math.max(stageWidth, stageHeight) * 0.5;

  return (
    <Group key={element.id}>
      {/* Horizontal line - spans full width plus extensions */}
      <Line
        x={-extend}
        y={centerY}
        points={[0, 0, stageWidth + extend * 2, 0]}
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

      {/* Vertical line - spans full height plus extensions */}
      <Line
        x={centerX}
        y={-extend}
        points={[0, 0, 0, stageHeight + extend * 2]}
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
