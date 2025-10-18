import React from 'react';
import { Rect, Circle, Line, Star, Group } from 'react-konva';
import type Konva from 'konva';
import { ShapeElement } from '../../core/types';

interface ShapeElementProps {
  element: ShapeElement;
  zoom: number;
  plateOffsetY: number;
  isInteractive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<ShapeElement>) => void;
  bumpOverlay: () => void;
}

export const ShapeElementComponent: React.FC<ShapeElementProps> = ({
  element,
  zoom,
  plateOffsetY,
  isInteractive,
  onSelect,
  onUpdate,
  bumpOverlay,
}) => {
  // Use a ref to track the node for smooth transformations
  const nodeRef = React.useRef<Konva.Group>(null);
  
  const renderShape = () => {
    const fill = element.fillType === 'solid' ? element.fillColor : 'transparent';
    const stroke = element.fillType === 'outline' ? element.strokeColor : undefined;
    const strokeWidth = element.fillType === 'outline' ? element.strokeWidth * zoom : 0;

    // Common props for the individual shapes (without positioning - that's handled by the Group)
    // Set listening to true so shapes can be clicked
    const shapeProps = {
      fill,
      stroke,
      strokeWidth,
      listening: true, // Allow shapes to receive click events
      perfectDrawEnabled: false, // Improve performance
    };

    switch (element.shapeType) {
      case 'rectangle':
        return (
          <Rect
            {...shapeProps}
            width={element.width * zoom}
            height={element.height * zoom}
          />
        );

      case 'circle':
        return (
          <Circle
            {...shapeProps}
            x={(element.width / 2) * zoom}
            y={(element.height / 2) * zoom}
            radius={(Math.min(element.width, element.height) / 2) * zoom}
          />
        );

      case 'triangle':
        const trianglePoints = [
          element.width / 2, 0,  // Top point
          element.width, element.height,  // Bottom right
          0, element.height,  // Bottom left
        ].map((point) => point * zoom);
        
        return (
          <Line
            {...shapeProps}
            points={trianglePoints}
            closed={true}
          />
        );

      case 'star':
        return (
          <Star
            {...shapeProps}
            x={(element.width / 2) * zoom}
            y={(element.height / 2) * zoom}
            numPoints={5}
            innerRadius={(Math.min(element.width, element.height) / 4) * zoom}
            outerRadius={(Math.min(element.width, element.height) / 2) * zoom}
          />
        );

      case 'hexagon':
        const hexPoints: number[] = [];
        const hexRadius = (Math.min(element.width, element.height) / 2) * zoom;
        const hexCenterX = (element.width / 2) * zoom;
        const hexCenterY = (element.height / 2) * zoom;
        
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          hexPoints.push(hexCenterX + hexRadius * Math.cos(angle));
          hexPoints.push(hexCenterY + hexRadius * Math.sin(angle));
        }
        
        return (
          <Line
            {...shapeProps}
            points={hexPoints}
            closed={true}
          />
        );

      case 'pentagon':
        const pentPoints: number[] = [];
        const pentRadius = (Math.min(element.width, element.height) / 2) * zoom;
        const pentCenterX = (element.width / 2) * zoom;
        const pentCenterY = (element.height / 2) * zoom;
        
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI / 2.5) * i - Math.PI / 2;
          pentPoints.push(pentCenterX + pentRadius * Math.cos(angle));
          pentPoints.push(pentCenterY + pentRadius * Math.sin(angle));
        }
        
        return (
          <Line
            {...shapeProps}
            points={pentPoints}
            closed={true}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Group
      ref={nodeRef}
      id={element.id}
      x={element.x * zoom}
      y={element.y * zoom + plateOffsetY}
      rotation={element.rotation || 0}
      scaleX={element.flippedH ? -1 : 1}
      scaleY={element.flippedV ? -1 : 1}
      offsetX={element.flippedH ? element.width * zoom : 0}
      offsetY={element.flippedV ? element.height * zoom : 0}
      opacity={element.opacity ?? 1}
      draggable={isInteractive}
      listening={isInteractive}
      onClick={(e) => {
        if (isInteractive) {
          e.cancelBubble = true; // Prevent event from bubbling to stage
          onSelect();
        }
      }}
      onTap={(e) => {
        if (isInteractive) {
          e.cancelBubble = true; // Prevent event from bubbling to stage
          onSelect();
        }
      }}
      onMouseEnter={(e) => {
        if (isInteractive) {
          const container = e.target.getStage()?.container();
          if (container) {
            container.style.cursor = 'pointer';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (isInteractive) {
          const container = e.target.getStage()?.container();
          if (container) {
            container.style.cursor = 'default';
          }
        }
      }}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        const newX = e.target.x() / zoom;
        const newY = (e.target.y() - plateOffsetY) / zoom;
        onUpdate({ x: newX, y: newY });
        bumpOverlay();
      }}
      onTransform={(e: Konva.KonvaEventObject<Event>) => {
        const node = e.target as Konva.Group;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        
        // During transform, we keep the scale applied for smooth visual feedback
        // The actual dimension update happens in onTransformEnd
        // Just trigger a redraw for smooth transformation
        const layer = node.getLayer();
        if (layer) {
          layer.batchDraw();
        }
      }}
      onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
        const node = e.target as Konva.Group;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        
        // Calculate new dimensions based on scale
        const newWidth = Math.max(10, element.width * Math.abs(scaleX));
        const newHeight = Math.max(10, element.height * Math.abs(scaleY));
        const newX = node.x() / zoom;
        const newY = (node.y() - plateOffsetY) / zoom;
        
        // Reset scale back to 1 (scale is now absorbed into width/height)
        node.scaleX(element.flippedH ? -1 : 1);
        node.scaleY(element.flippedV ? -1 : 1);
        
        // Update element with new dimensions
        onUpdate({
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          rotation: node.rotation(),
        });
        
        bumpOverlay();
      }}
    >
      {renderShape()}
    </Group>
  );
};
