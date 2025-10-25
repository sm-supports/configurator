
import React, { useState, useEffect } from 'react';
import { Image as KonvaImage, Group, Text } from 'react-konva';
import { ImageElement } from '@/types';

interface ImageElementProps {
  element: ImageElement;
  zoom: number;
  plateOffsetY?: number;
  isInteractive?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ImageElement>) => void;
}

export const ImageElementComponent: React.FC<ImageElementProps> = React.memo(function ImageComponent({
  element,
  zoom,
  plateOffsetY,
  isInteractive = true,
  onSelect,
  onUpdate
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.onerror = () => console.error('Failed to load image:', element.imageUrl);
    img.src = element.imageUrl;
  }, [element.imageUrl]);

  if (!image) {
    // Show loading placeholder
    return (
      <Group>
        <Text
          x={element.x * zoom}
          y={element.y * zoom + (plateOffsetY || 0)}
          text="Loading..."
          fontSize={14 * zoom}
          fill="#666"
        />
      </Group>
    );
  }

  return (
    <KonvaImage
      id={element.id}
      image={image}
      x={element.x * zoom}
      y={element.y * zoom + (plateOffsetY || 0)}
      width={(element.width || 100) * zoom}
      height={(element.height || 100) * zoom}
      rotation={element.rotation || 0}
      scaleX={element.flippedH ? -1 : 1}
      scaleY={element.flippedV ? -1 : 1}
      offsetX={element.flippedH ? (element.width || 100) * zoom : 0}
      offsetY={element.flippedV ? (element.height || 100) * zoom : 0}
      opacity={element.opacity ?? 1}
      draggable={isInteractive}
      listening={isInteractive}
      onClick={isInteractive ? onSelect : undefined}
      onTap={isInteractive ? onSelect : undefined}
      onDragEnd={isInteractive ? (e) => {
        onUpdate({
          x: e.target.x() / zoom,
          y: plateOffsetY !== undefined ? (e.target.y() - plateOffsetY) / zoom : e.target.y() / zoom
        });
      } : undefined}
      onTransform={isInteractive ? (e) => {
        const node = e.target;
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
        
        // Trigger visual redraw for smooth transformation
        const layer = node.getLayer();
        if (layer) {
          layer.batchDraw();
        }
      } : undefined}
      onTransformEnd={isInteractive ? (e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        
        // Update position, dimensions, and rotation when transform is complete
        const newX = node.x() / zoom;
        const newY = plateOffsetY !== undefined ? (node.y() - plateOffsetY) / zoom : node.y() / zoom;
        
        // Apply the scales independently for free scaling
        const absScaleX = Math.abs(scaleX);
        const absScaleY = Math.abs(scaleY);
        const newWidth = Math.max(10, (element.width || 100) * absScaleX);
        const newHeight = Math.max(10, (element.height || 100) * absScaleY);
        
        // Reset scale back to 1 (dimensions are now stored in width/height)
        node.scaleX(element.flippedH ? -1 : 1);
        node.scaleY(element.flippedV ? -1 : 1);
        
        // Final state update with all changes
        onUpdate({
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          rotation: node.rotation()
        });
      } : undefined}
    />
  );
});
