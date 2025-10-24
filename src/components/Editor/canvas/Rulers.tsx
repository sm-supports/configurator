import React, { useState, useEffect } from 'react';
import { Group, Text, Line, Rect } from 'react-konva';
import type { ReactNode } from 'react';

interface RulersProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  stageRef: React.RefObject<any>;
}

// Constants for ruler
const PIXELS_PER_INCH = 96; // Standard screen DPI
const MM_PER_INCH = 25.4;
const RULER_WIDTH = 30; // Width of ruler in pixels
const MAJOR_TICK_INTERVAL = 1; // Every 1 inch
const MINOR_TICK_INTERVAL = 0.25; // Every 1/4 inch

interface PointerPos {
  x: number;
  y: number;
}

export const Rulers: React.FC<RulersProps> = ({
  canvasWidth,
  canvasHeight,
  zoom,
  stageRef,
}) => {
  const [pointerPos, setPointerPos] = useState<PointerPos>({ x: 0, y: 0 });

  useEffect(() => {
    if (!stageRef.current) return;

    const stage = stageRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      // Get mouse position relative to the stage
      const pointerPos = stage.getPointerPosition();
      if (pointerPos) {
        // Konva already gives us the position in stage coordinates
        setPointerPos({ x: pointerPos.x, y: pointerPos.y });
      }
    };

    const handleMouseLeave = () => {
      setPointerPos({ x: -1000, y: -1000 });
    };

    stage.on('mousemove', handleMouseMove);
    stage.container().addEventListener('mouseleave', handleMouseLeave);

    return () => {
      stage.off('mousemove', handleMouseMove);
      stage.container().removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [stageRef]);

  // Generate horizontal ruler markers
  const generateHorizontalMarkers = (): ReactNode[] => {
    const markers: ReactNode[] = [];
    const pixelsPerInch = PIXELS_PER_INCH;
    const spacing = pixelsPerInch;

    // Major ticks (1 inch) - bright white
    for (let inch = 0; inch <= canvasWidth / spacing + 2; inch++) {
      const x = inch * spacing;

      markers.push(
        <Line
          key={`h-major-${inch}`}
          x={x}
          y={0}
          points={[0, 0, 0, RULER_WIDTH - 2]}
          stroke="#FFFFFF"
          strokeWidth={2}
          opacity={1}
        />
      );

      // Minor ticks (1/4 inch) - bright white
      for (let quarter = 1; quarter < 4; quarter++) {
        const minorX = x + (quarter * spacing) / 4;
        markers.push(
          <Line
            key={`h-minor-${inch}-${quarter}`}
            x={minorX}
            y={0}
            points={[0, 0, 0, RULER_WIDTH / 2]}
            stroke="#FFFFFF"
            strokeWidth={1}
            opacity={0.8}
          />
        );
      }
    }

    // Pointer indicator for horizontal - bright cyan line
    if (pointerPos.x >= 0 && pointerPos.x <= canvasWidth) {
      markers.push(
        <Line
          key="h-pointer"
          x={pointerPos.x}
          y={0}
          points={[0, 0, 0, RULER_WIDTH]}
          stroke="#00FFFF"
          strokeWidth={2}
          opacity={1}
        />
      );
    }

    return markers;
  };

  // Generate vertical ruler markers
  const generateVerticalMarkers = (): ReactNode[] => {
    const markers: ReactNode[] = [];
    const pixelsPerInch = PIXELS_PER_INCH;
    const spacing = pixelsPerInch;

    // Major ticks (1 inch) - bright white
    for (let inch = 0; inch <= canvasHeight / spacing + 2; inch++) {
      const y = inch * spacing;

      markers.push(
        <Line
          key={`v-major-${inch}`}
          x={0}
          y={y}
          points={[0, 0, RULER_WIDTH - 2, 0]}
          stroke="#FFFFFF"
          strokeWidth={2}
          opacity={1}
        />
      );

      // Minor ticks (1/4 inch) - bright white
      for (let quarter = 1; quarter < 4; quarter++) {
        const minorY = y + (quarter * spacing) / 4;
        markers.push(
          <Line
            key={`v-minor-${inch}-${quarter}`}
            x={0}
            y={minorY}
            points={[0, 0, RULER_WIDTH / 2, 0]}
            stroke="#FFFFFF"
            strokeWidth={1}
            opacity={0.8}
          />
        );
      }
    }

    // Pointer indicator for vertical - bright cyan line
    if (pointerPos.y >= 0 && pointerPos.y <= canvasHeight) {
      markers.push(
        <Line
          key="v-pointer"
          x={0}
          y={pointerPos.y}
          points={[0, 0, RULER_WIDTH, 0]}
          stroke="#00FFFF"
          strokeWidth={2}
          opacity={1}
        />
      );
    }

    return markers;
  };

  return (
    <Group>
      {/* Horizontal Ruler Background */}
      <Rect
        x={0}
        y={-RULER_WIDTH}
        width={canvasWidth}
        height={RULER_WIDTH}
        fill="#2a2a2a"
        stroke="#444444"
        strokeWidth={1}
      />

      {/* Horizontal Ruler Group */}
      <Group y={-RULER_WIDTH + 5} opacity={0.9}>
        {generateHorizontalMarkers()}
      </Group>

      {/* Vertical Ruler Background */}
      <Rect
        x={-RULER_WIDTH}
        y={0}
        width={RULER_WIDTH}
        height={canvasHeight}
        fill="#2a2a2a"
        stroke="#444444"
        strokeWidth={1}
      />

      {/* Vertical Ruler Group */}
      <Group x={-RULER_WIDTH + 5} opacity={0.9}>
        {generateVerticalMarkers()}
      </Group>

      {/* Corner square */}
      <Rect
        x={-RULER_WIDTH}
        y={-RULER_WIDTH}
        width={RULER_WIDTH}
        height={RULER_WIDTH}
        fill="#1a1a1a"
        stroke="#444444"
        strokeWidth={1}
      />
    </Group>
  );
};
