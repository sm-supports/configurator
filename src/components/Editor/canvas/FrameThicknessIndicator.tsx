import React from 'react';
import { Group, Text, Line } from 'react-konva';

interface FrameThicknessIndicatorProps {
  frameSize: 'slim' | 'std' | 'xl';
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
}

export const FrameThicknessIndicator: React.FC<FrameThicknessIndicatorProps> = ({
  frameSize,
  canvasWidth,
  canvasHeight,
  zoom,
}) => {
  // Frame thickness values in mm
  const thicknessValues = {
    slim: { top: 11, left: 11, right: 11, bottom: 15 },
    std: { top: 15, left: 15, right: 15, bottom: 24 },
    xl: { top: 18, left: 18, right: 18, bottom: 29 },
  };

  const thickness = thicknessValues[frameSize];
  
  // Red handwritten style like in reference
  const textColor = '#ef4444'; // Red
  const arrowColor = '#ef4444';
  const fontSize = 22;
  const fontFamily = 'Patrick Hand, cursive';

  return (
    <Group>
      {/* Top measurement - handwritten text with arrow */}
      <Text
        x={canvasWidth / 2 - 60}
        y={-40}
        text={`${thickness.top}mm`}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fill={textColor}
        fontStyle="bold"
      />
      {/* Top arrow - curved line pointing to top frame */}
      <Line
        points={[
          canvasWidth / 2 - 20, -35,
          canvasWidth / 2 - 10, -20,
          canvasWidth / 2, -10,
          canvasWidth / 2, 0
        ]}
        stroke={arrowColor}
        strokeWidth={3}
        tension={0.3}
        lineCap="round"
        lineJoin="round"
      />

      {/* Left measurement - handwritten text with arrow */}
      <Text
        x={-80}
        y={canvasHeight / 2 - 30}
        text={`${thickness.left}mm`}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fill={textColor}
        fontStyle="bold"
      />
      {/* Left arrow - curved line pointing to left frame */}
      <Line
        points={[
          -35, canvasHeight / 2 - 10,
          -20, canvasHeight / 2,
          -10, canvasHeight / 2 + 10,
          0, canvasHeight / 2 + 15
        ]}
        stroke={arrowColor}
        strokeWidth={3}
        tension={0.3}
        lineCap="round"
        lineJoin="round"
      />

      {/* Right measurement - handwritten text with arrow */}
      <Text
        x={canvasWidth + 30}
        y={canvasHeight / 2 - 30}
        text={`${thickness.right}mm`}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fill={textColor}
        fontStyle="bold"
      />
      {/* Right arrow - curved line pointing to right frame */}
      <Line
        points={[
          canvasWidth + 20, canvasHeight / 2 - 20,
          canvasWidth + 10, canvasHeight / 2 - 5,
          canvasWidth + 5, canvasHeight / 2 + 5,
          canvasWidth, canvasHeight / 2 + 10
        ]}
        stroke={arrowColor}
        strokeWidth={3}
        tension={0.3}
        lineCap="round"
        lineJoin="round"
      />

      {/* Bottom measurement - handwritten text with arrow */}
      <Text
        x={canvasWidth / 2 + 20}
        y={canvasHeight + 25}
        text={`${thickness.bottom}mm`}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fill={textColor}
        fontStyle="bold"
      />
      {/* Bottom arrow - curved line pointing to bottom frame */}
      <Line
        points={[
          canvasWidth / 2 + 10, canvasHeight + 20,
          canvasWidth / 2, canvasHeight + 10,
          canvasWidth / 2 - 10, canvasHeight + 5,
          canvasWidth / 2 - 15, canvasHeight
        ]}
        stroke={arrowColor}
        strokeWidth={3}
        tension={0.3}
        lineCap="round"
        lineJoin="round"
      />
    </Group>
  );
};
