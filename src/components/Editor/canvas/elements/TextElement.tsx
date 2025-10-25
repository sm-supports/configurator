
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
}) {
  const isVertical = element.writingMode === 'vertical';
  
  // For vertical text, format with line breaks between each character
  const displayText = isVertical 
    ? element.text.split('').join('\n')
    : element.text;
  
  return (
    <Group key={element.id}>
      <Text
        id={element.id}
        text={displayText}
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
        align={isVertical ? 'center' : element.textAlign}
        verticalAlign="top"
        lineHeight={isVertical ? 1.1 : 1.5}
        wrap="none"
        ellipsis={false}
        // Add prominent stroke effect for bold text
        stroke={element.fontWeight === 'bold' ? element.color : undefined}
        strokeWidth={element.fontWeight === 'bold' ? 2.5 * zoom : 0}
        rotation={element.rotation || 0}
        scaleX={element.flippedH ? -1 : 1}
        scaleY={element.flippedV ? -1 : 1}
        offsetX={element.flippedH ? (element.width || 100) * zoom : 0}
        offsetY={element.flippedV ? (element.height || 50) * zoom : 0}
        opacity={element.opacity ?? 1}
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
          const transformer = node.getStage()?.findOne('Transformer');
          
          if (transformer) {
            // Get the active anchor to determine scaling mode
            const activeAnchor = (transformer as any).getActiveAnchor();
            
            // Corner anchors: maintain aspect ratio (proportional scaling)
            // Edge/middle anchors: allow free scaling
            const isCornerAnchor = activeAnchor && (
              activeAnchor === 'top-left' ||
              activeAnchor === 'top-right' ||
              activeAnchor === 'bottom-left' ||
              activeAnchor === 'bottom-right'
            );
            
            if (isCornerAnchor) {
              // For corner anchors, enforce proportional scaling
              const scaleX = Math.abs(node.scaleX());
              const scaleY = Math.abs(node.scaleY());
              const avgScale = (scaleX + scaleY) / 2;
              
              // Apply uniform scale while preserving flip state
              node.scaleX(element.flippedH ? -avgScale : avgScale);
              node.scaleY(element.flippedV ? -avgScale : avgScale);
            }
          }
          
          node.getLayer()?.batchDraw();
          bumpOverlay();
        }}
        onTransformEnd={(e) => {
          const node = e.target as unknown as Konva.Text;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          
          const isVertical = element.writingMode === 'vertical';
          
          // Calculate new font size based on the average scale (for proportional feel)
          const absScaleX = Math.abs(scaleX);
          const absScaleY = Math.abs(scaleY);
          const avgScale = (absScaleX + absScaleY) / 2;
          const newFontSize = Math.max(8, Math.round(element.fontSize * avgScale));
          
          // Calculate new dimensions - apply scales independently for free scaling
          let newWidth, newHeight;
          
          if (isVertical) {
            // For vertical text, calculate minimum dimensions needed for all characters
            const charCount = element.text.length;
            const lineHeight = 1.1;
            const minHeight = charCount * newFontSize * lineHeight;
            
            // Use the scaled height, but ensure it's at least the minimum needed
            const scaledHeight = Math.max(10, node.height() * absScaleY);
            newHeight = Math.max(minHeight, scaledHeight) / zoom;
            
            // Width uses the actual scaleX
            newWidth = Math.max(newFontSize * 1.5, node.width() * absScaleX) / zoom;
          } else {
            // For horizontal text, measure the actual text dimensions
            const measured = measureText(element.text, newFontSize, element.fontFamily, element.fontWeight, element.fontStyle);
            
            // Use measured dimensions as minimum, but allow user to scale freely
            const scaledWidth = Math.max(10, node.width() * absScaleX);
            const scaledHeight = Math.max(10, node.height() * absScaleY);
            
            newWidth = Math.max(measured.width, scaledWidth / zoom);
            newHeight = Math.max(measured.height, scaledHeight / zoom);
          }
          
          const newX = node.x() / zoom;
          const newY = (node.y() - plateOffsetY) / zoom;
          
          // Update with the transformed dimensions
          onUpdate(element.id, { 
            x: newX, 
            y: newY, 
            width: newWidth, 
            height: newHeight, 
            rotation: node.rotation(), 
            fontSize: newFontSize 
          });
        }}
      />
    </Group>
  );
});

import { measureText } from '../utils/canvasUtils';
