
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
      opacity={1} // Always full opacity - no background dimming
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
      onTransformEnd={isInteractive ? (e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        
        // Reset scale and apply to dimensions
        node.scaleX(1);
        node.scaleY(1);
        
        onUpdate({
          x: node.x() / zoom,
          y: plateOffsetY !== undefined ? (node.y() - plateOffsetY) / zoom : node.y() / zoom,
          width: Math.max(10, node.width() * Math.abs(scaleX) / zoom),
          height: Math.max(10, node.height() * Math.abs(scaleY) / zoom),
          rotation: node.rotation()
        });
      } : undefined}
    />
  );
});
