import React, { useMemo } from 'react';
import { Line, Circle, Group } from 'react-konva';
import { PaintElement } from '../../core/types';

interface PaintElementProps {
  element: PaintElement;
  zoom: number;
  plateOffsetY?: number;
  isInteractive?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<PaintElement>) => void;
}

export const PaintElementComponent: React.FC<PaintElementProps> = React.memo(function PaintComponent({
  element,
  zoom,
  plateOffsetY = 0,
  isInteractive = true,
  onSelect,
  onUpdate
}) {
  // Convert paint points to Konva line points format
  const linePoints = useMemo(() => {
    const points: number[] = [];
    element.points.forEach(point => {
      points.push((element.x + point.x) * zoom);
      points.push((element.y + point.y) * zoom + plateOffsetY);
    });
    return points;
  }, [element.points, element.x, element.y, zoom, plateOffsetY]);

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
        return (
          <Group {...baseProps}>
            {element.points.map((point, index) => {
              const pressure = point.pressure || 1.0;
              const sprayRadius = (element.brushSize * pressure) * zoom;
              
              // Create multiple spray dots around each point
              const sprayDots = [];
              const dotsCount = Math.max(3, Math.floor(sprayRadius / 2));
              
              for (let i = 0; i < dotsCount; i++) {
                const angle = (i / dotsCount) * Math.PI * 2;
                const distance = Math.random() * sprayRadius * 0.7;
                const dotX = (element.x + point.x) * zoom + Math.cos(angle) * distance;
                const dotY = (element.y + point.y) * zoom + plateOffsetY + Math.sin(angle) * distance;
                
                sprayDots.push(
                  <Circle
                    key={`${index}-${i}`}
                    x={dotX}
                    y={dotY}
                    radius={Math.random() * 2 + 0.5}
                    fill={element.color}
                    opacity={element.opacity * pressure * (0.3 + Math.random() * 0.7)}
                  />
                );
              }
              
              return sprayDots;
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
    </Group>
  );
});