import React from 'react';
import { Rect, Ellipse, Line, Star, Group } from 'react-konva';
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
        // Use Ellipse to support independent width/height scaling (oval)
        return (
          <Ellipse
            {...shapeProps}
            x={(element.width / 2) * zoom}
            y={(element.height / 2) * zoom}
            radiusX={(element.width / 2) * zoom}
            radiusY={(element.height / 2) * zoom}
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
        // Use independent radiusX and radiusY for elliptical stars
        return (
          <Star
            {...shapeProps}
            x={(element.width / 2) * zoom}
            y={(element.height / 2) * zoom}
            numPoints={5}
            innerRadius={(Math.min(element.width, element.height) / 4) * zoom}
            outerRadius={(Math.min(element.width, element.height) / 2) * zoom}
            // Apply scale to support oval stars
            scaleX={element.width / Math.min(element.width, element.height)}
            scaleY={element.height / Math.min(element.width, element.height)}
          />
        );

      case 'hexagon':
        // Use independent radiusX and radiusY for elliptical hexagons
        const hexRadiusX = (element.width / 2) * zoom;
        const hexRadiusY = (element.height / 2) * zoom;
        const hexCenterX = (element.width / 2) * zoom;
        const hexCenterY = (element.height / 2) * zoom;
        const hexPoints: number[] = [];
        
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          hexPoints.push(hexCenterX + hexRadiusX * Math.cos(angle));
          hexPoints.push(hexCenterY + hexRadiusY * Math.sin(angle));
        }
        
        return (
          <Line
            {...shapeProps}
            points={hexPoints}
            closed={true}
          />
        );

      case 'pentagon':
        // Use independent radiusX and radiusY for elliptical pentagons
        const pentRadiusX = (element.width / 2) * zoom;
        const pentRadiusY = (element.height / 2) * zoom;
        const pentCenterX = (element.width / 2) * zoom;
        const pentCenterY = (element.height / 2) * zoom;
        const pentPoints: number[] = [];
        
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI / 2.5) * i - Math.PI / 2;
          pentPoints.push(pentCenterX + pentRadiusX * Math.cos(angle));
          pentPoints.push(pentCenterY + pentRadiusY * Math.sin(angle));
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
      }}
      onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
        const node = e.target as Konva.Group;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        
        // Update position, dimensions, and rotation when transform is complete
        const newX = node.x() / zoom;
        const newY = (node.y() - plateOffsetY) / zoom;
        
        // Apply the scales independently for free scaling
        const absScaleX = Math.abs(scaleX);
        const absScaleY = Math.abs(scaleY);
        const newWidth = Math.max(10, element.width * absScaleX);
        const newHeight = Math.max(10, element.height * absScaleY);
        
        // Reset scale back to 1 (dimensions are now stored in width/height)
        node.scaleX(element.flippedH ? -1 : 1);
        node.scaleY(element.flippedV ? -1 : 1);
        
        // Final state update with all changes
        onUpdate({
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          rotation: node.rotation(),
        });
        
        // Bump overlay to ensure transformer is properly updated
        bumpOverlay();
      }}
    >
      {renderShape()}
    </Group>
  );
};
