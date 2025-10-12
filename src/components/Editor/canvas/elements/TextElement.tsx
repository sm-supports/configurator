
import React from 'react';
import { Text, Group } from 'react-konva';
import type Konva from 'konva';
import { TextElement as TextElementType, PlateTemplate } from '@/types';

interface TextElementProps {
  element: TextElementType;
  zoom: number;
  plateOffsetY: number;
  isInteractive: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<TextElementType>) => void;
  bumpOverlay: () => void;
  template: PlateTemplate;
}

export const TextElementComponent: React.FC<TextElementProps> = React.memo(function TextComponent({
  element,
  zoom,
  plateOffsetY,
  isInteractive,
  onSelect,
  onUpdate,
  bumpOverlay,
  template,
}) {
  return (
    <Group key={element.id}>
      <Text
        id={element.id}
        text={element.text}
        x={element.x * zoom}
        y={element.y * zoom + plateOffsetY}
        width={(element.width || 100) * zoom}
        height={(element.height || 50) * zoom}
        fontSize={element.fontSize * zoom}
        fontFamily={element.fontFamily}
        fontWeight={element.fontWeight}
        fontStyle={element.fontStyle || 'normal'}
        textDecoration={element.textDecoration || 'none'}
        fill={element.color}
        align={element.textAlign}
        rotation={element.rotation || 0}
        scaleX={element.flippedH ? -1 : 1}
        scaleY={element.flippedV ? -1 : 1}
        offsetX={element.flippedH ? (element.width || 100) * zoom : 0}
        offsetY={element.flippedV ? (element.height || 50) * zoom : 0}
        opacity={1}
        draggable={isInteractive}
        listening={isInteractive}
        onClick={() => onSelect(element.id)}
        onTap={() => onSelect(element.id)}
        onDragEnd={(e) => {
          const newX = e.target.x() / zoom;
          const newY = (e.target.y() - plateOffsetY) / zoom;
          onUpdate(element.id, { x: newX, y: newY });
          bumpOverlay();
        }}
        onTransform={(e) => {
          const node = e.target as unknown as Konva.Text;
          node.getLayer()?.batchDraw();
          bumpOverlay();
        }}
        onTransformEnd={(e) => {
          const node = e.target as unknown as Konva.Text;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          const avgScale = (Math.abs(scaleX) + Math.abs(scaleY)) / 2;
          const newFontSize = Math.max(8, Math.round(element.fontSize * avgScale));
          const measured = measureText(element.text, newFontSize, element.fontFamily, element.fontWeight, element.fontStyle);
          const newX = node.x() / zoom;
          const newY = (node.y() - plateOffsetY) / zoom;
          onUpdate(element.id, { x: newX, y: newY, width: measured.width, height: measured.height, rotation: node.rotation(), fontSize: newFontSize });
        }}
      />
    </Group>
  );
});

import { measureText } from '../utils/canvasUtils';
