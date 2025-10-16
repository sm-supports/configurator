import React, { useMemo } from 'react';
import { Line, Circle, Group } from 'react-konva';
import { PaintElement } from '../../core/types';

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
  // Points are relative to element position, not absolute
  const linePoints = useMemo(() => {
    const points: number[] = [];
    element.points.forEach(point => {
      // Render points relative to parent Group (which will be positioned at element.x, element.y)
      points.push(point.x * zoom);
      points.push(point.y * zoom);
    });
    return points;
  }, [element.points, zoom]);

  // Render different brush types
  const renderBrushStroke = () => {
    const baseProps = {
      listening: isInteractive,
      onClick: isInteractive ? onSelect : undefined,
      onTap: isInteractive ? onSelect : undefined,
    };

    switch (element.brushType) {
      case 'brush':
        // ============================================================
        // PAINT BRUSH: Solid, clean, continuous stroke
        // - Single solid line with sharp, defined edges
        // - Most efficient rendering (1 Line element)
        // - Mimics: Paintbrush, marker, pen
        // ============================================================
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
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />
        );

      case 'airbrush':
        // ============================================================
        // AIRBRUSH: Soft, fuzzy, gradient effect with buildable opacity
        // - Wide outer glow + denser center = soft circular gradient
        // - Strokes blend smoothly when overlapping
        // - 2 layers for clear visual distinction (still performant)
        // - Mimics: Real airbrush tool, spray paint with distance
        // - Returns array of elements (not Fragment) for Konva compatibility
        // ============================================================
        return [
          // Wide, soft outer glow - creates the "fuzzy" airbrush halo
          <Line
            key="airbrush-outer"
            {...baseProps}
            points={linePoints}
            stroke={element.color}
            strokeWidth={(element.brushSize * 2.5) * zoom}
            opacity={element.opacity * 0.15}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />,
          // Dense center stroke - provides color buildup and definition
          <Line
            key="airbrush-center"
            {...baseProps}
            points={linePoints}
            stroke={element.color}
            strokeWidth={element.brushSize * zoom}
            opacity={element.opacity * 0.5}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />
        ];

      case 'spray':
        // ============================================================
        // SPRAY: Speckled, random dots scattered in circular pattern
        // - Each point generates multiple random dots within radius
        // - Dots have varying sizes and opacity for natural spray look
        // - Uses fast seeded random for stable rendering (no jitter)
        // - Optimized: 5-8 dots per point (not hundreds)
        // - Mimics: Spray can, splatter effect
        // - Returns flat array of elements for Konva compatibility
        // ============================================================
        
        // Fast seeded random generator (deterministic, no Math.random jitter)
        const fastRandom = (seed: number) => {
          const x = Math.sin(seed) * 10000;
          return x - Math.floor(x);
        };
        
        // Flatten all spray dots into a single array
        const sprayDots: React.ReactElement[] = [];
        element.points.forEach((point, pointIndex) => {
          // Render dots relative to parent Group (no element.x/y or plateOffsetY)
          const centerX = point.x * zoom;
          const centerY = point.y * zoom;
          const sprayRadius = (element.brushSize * 0.8) * zoom;
          
          // Optimized dot count: 5-8 dots per point (visible spray pattern)
          const dotCount = 6;
          const baseSeed = point.x * 1000 + point.y * 100 + pointIndex;
          
          // Generate spray dots
          for (let i = 0; i < dotCount; i++) {
            const seed = baseSeed + i;
            const angle = fastRandom(seed * 2) * Math.PI * 2;
            const distance = fastRandom(seed * 3 + 100) * sprayRadius;
            const dotSize = (fastRandom(seed * 5 + 500) * 1.5 + 0.8) * zoom;
            const dotOpacity = element.opacity * (fastRandom(seed * 7 + 1000) * 0.4 + 0.6);
            
            sprayDots.push(
              <Circle
                {...baseProps}
                key={`${pointIndex}-${i}`}
                x={centerX + Math.cos(angle) * distance}
                y={centerY + Math.sin(angle) * distance}
                radius={dotSize}
                fill={element.color}
                opacity={dotOpacity}
                perfectDrawEnabled={false}
              />
            );
          }
        });
        
        return sprayDots;

      default:
        return null;
    }
  };

  return (
    <Group>
      {renderBrushStroke()}
      {/* Selection rectangle - relative to parent Group position */}
      {isSelected && element.width && element.height && (
        <React.Fragment>
          {/* Semi-transparent background for clickability */}
          <Circle
            x={(element.width / 2) * zoom}
            y={(element.height / 2) * zoom}
            radius={Math.max(element.width, element.height) * zoom * 0.6}
            fill="rgba(59, 130, 246, 0.1)"
            listening={false}
          />
          {/* Selection corners */}
          {[
            { x: 0, y: 0 },
            { x: element.width, y: 0 },
            { x: element.width, y: element.height },
            { x: 0, y: element.height },
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