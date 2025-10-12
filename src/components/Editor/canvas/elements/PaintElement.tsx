import React, { useMemo } from 'react';
import { Line, Circle, Group } from 'react-konva';
import { PaintElement } from '../../core/types';
import { wasmOps } from '@/lib/wasmBridge';

interface PaintElementProps {
  element: PaintElement;
  zoom: number;
  plateOffsetY?: number;
  isInteractive?: boolean;
  isSelected?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<PaintElement>) => void;
}

export const PaintElementComponent: React.FC<PaintElementProps> = React.memo(function PaintComponent({
  element,
  zoom,
  plateOffsetY = 0,
  isInteractive = true,
  isSelected = false,
  onSelect,
  onUpdate
}) {
  // Convert paint points to Konva line points format
  const linePoints = useMemo(() => {
    const points: number[] = [];
    element.points.forEach(point => {
      // Points are already in canvas coordinates, just scale by zoom
      points.push((element.x + point.x) * zoom);
      points.push((element.y + point.y) * zoom);
    });
    return points;
  }, [element.points, element.x, element.y, zoom]);

  // Render different brush types
  const renderBrushStroke = () => {
    const baseProps = {
      listening: isInteractive,
      onClick: isInteractive ? onSelect : undefined,
      onTap: isInteractive ? onSelect : undefined,
    };

    switch (element.brushType) {
      case 'brush':
        return (
          <Line
            {...baseProps}
            points={linePoints}
            stroke={element.color}
            strokeWidth={element.brushSize * zoom}
            opacity={element.opacity}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
          />
        );

      case 'airbrush':
        // Airbrush effect using multiple lines with decreasing opacity
        return (
          <Group {...baseProps}>
            {[0.3, 0.5, 0.7, 1.0].map((opacityMultiplier, index) => (
              <Line
                key={index}
                points={linePoints}
                stroke={element.color}
                strokeWidth={(element.brushSize + index * 2) * zoom}
                opacity={element.opacity * opacityMultiplier * 0.3}
                lineCap="round"
                lineJoin="round"
                tension={0.5}
              />
            ))}
            <Line
              points={linePoints}
              stroke={element.color}
              strokeWidth={element.brushSize * zoom}
              opacity={element.opacity}
              lineCap="round"
              lineJoin="round"
              tension={0.5}
            />
          </Group>
        );

      case 'spray':
        // Spray effect using circles for each point with pressure variation
        // Use WASM for faster spray dot generation
        return (
          <Group {...baseProps}>
            {element.points.flatMap((point, index) => {
              const pressure = point.pressure || 1.0;
              const sprayRadius = (element.brushSize * pressure) * zoom;
              
              // Use WASM to calculate spray dot positions (much faster for many dots)
              const dotsCount = Math.max(3, Math.floor(sprayRadius / 2));
              // Points are already in canvas coordinates, just scale by zoom
              const centerX = (element.x + point.x) * zoom;
              const centerY = (element.y + point.y) * zoom;
              
              // Calculate spray dots with WASM (falls back to JS if unavailable)
              const sprayDotPositions = wasmOps.calculateSprayDots(
                centerX,
                centerY,
                sprayRadius * 0.7,
                dotsCount
              );
              
              return sprayDotPositions.map((dot, i) => (
                <Circle
                  key={`${index}-${i}`}
                  x={dot.x}
                  y={dot.y}
                  radius={Math.random() * 2 + 0.5}
                  fill={element.color}
                  opacity={element.opacity * pressure * (0.3 + Math.random() * 0.7)}
                />
              ));
            })}
          </Group>
        );

      default:
        return null;
    }
  };

  return (
    <Group>
      {renderBrushStroke()}
      {/* Selection rectangle */}
      {isSelected && element.width && element.height && (
        <React.Fragment>
          {/* Semi-transparent background for clickability */}
          <Circle
            x={(element.x + (element.width / 2)) * zoom}
            y={(element.y + (element.height / 2)) * zoom}
            radius={Math.max(element.width, element.height) * zoom * 0.6}
            fill="rgba(59, 130, 246, 0.1)"
            listening={false}
          />
          {/* Selection corners */}
          {[
            { x: element.x, y: element.y },
            { x: element.x + element.width, y: element.y },
            { x: element.x + element.width, y: element.y + element.height },
            { x: element.x, y: element.y + element.height },
          ].map((corner, i) => (
            <Circle
              key={i}
              x={corner.x * zoom}
              y={corner.y * zoom}
              radius={4}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={1}
              listening={false}
            />
          ))}
        </React.Fragment>
      )}
    </Group>
  );
});