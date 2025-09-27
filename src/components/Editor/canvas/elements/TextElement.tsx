
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
  onDblClick: (id: string) => void;
  editingTextId: string | null;
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
  onDblClick,
  editingTextId,
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
        visible={editingTextId !== element.id}
        opacity={1}
        draggable={isInteractive}
        listening={isInteractive}
        dragBoundFunc={isInteractive ? (pos) => {
          const stageW = template.width_px * zoom;
          const stageH = template.height_px * zoom + (Math.min(template.width_px, template.height_px) * zoom * 0.2);
          const x = Math.max(0, Math.min(stageW - (element.width || 100) * zoom, pos.x));
          const y = Math.max(0, Math.min(stageH - (element.height || 50) * zoom, pos.y));
          bumpOverlay();
          return { x, y };
        } : undefined}
        onClick={() => onSelect(element.id)}
        onTap={() => onSelect(element.id)}
        onDblClick={() => onDblClick(element.id)}
        onDblTap={() => onDblClick(element.id)}
        onDragEnd={(e) => {
          const newX = e.target.x() / zoom;
          const newY = (e.target.y() - plateOffsetY) / zoom;
          const stageMinX = 0;
          const stageMinY = -plateOffsetY / zoom;
          const stageMaxX = (template.width_px - (element.width || 100));
          const stageMaxY = (template.height_px + Math.min(template.width_px, template.height_px) * 0.2) - (element.height || 50);
          const cx = Math.max(stageMinX, Math.min(stageMaxX, newX));
          const cy = Math.max(stageMinY, Math.min(stageMaxY, newY));
          onUpdate(element.id, { x: cx, y: cy });
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
          const stageMinX = 0;
          const stageMinY = -plateOffsetY / zoom;
          const stageMaxX = (template.width_px - measured.width);
          const stageMaxY = (template.height_px + Math.min(template.width_px, template.height_px) * 0.2) - measured.height;
          const cx = Math.max(stageMinX, Math.min(stageMaxX, newX));
          const cy = Math.max(stageMinY, Math.min(stageMaxY, newY));
          onUpdate(element.id, { x: cx, y: cy, width: measured.width, height: measured.height, rotation: node.rotation(), fontSize: newFontSize });
        }}
      />
    </Group>
  );
});

import { measureText } from '../utils/canvasUtils';
