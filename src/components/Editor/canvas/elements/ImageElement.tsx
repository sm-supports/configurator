
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
        
        // Just trigger visual redraw - let keepRatio handle proportions
        // State update happens only in onTransformEnd to avoid re-render lag
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
        
        // Use the same scale for both dimensions to maintain proportions
        // This works with keepRatio={true} on the Transformer
        const scale = Math.abs(scaleX);
        const newWidth = Math.max(10, (element.width || 100) * scale);
        const newHeight = Math.max(10, (element.height || 100) * scale);
        
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
