
import { useState, useCallback, useEffect, useRef } from 'react';
import type Konva from 'konva';
import { PlateTemplate } from '@/types';

const minZoom = 0.1;
const maxZoom = 3;

export const useZoom = (stageRef: React.RefObject<Konva.Stage>, template: PlateTemplate, bumpOverlay: () => void) => {
  const [zoom, setZoom] = useState(0.7);
  const [view, setView] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const clampZoom = useCallback((z: number) => Math.max(minZoom, Math.min(maxZoom, z)), []);

  const zoomIn = useCallback(() => {
    const newZoom = clampZoom(zoom * 1.2);
    setZoom(newZoom);
    setView({ x: 0, y: 0 });
    bumpOverlay();
  }, [zoom, clampZoom, bumpOverlay]);

  const zoomOut = useCallback(() => {
    const newZoom = clampZoom(zoom / 1.2);
    setZoom(newZoom);
    setView({ x: 0, y: 0 });
    bumpOverlay();
  }, [zoom, clampZoom, bumpOverlay]);

  const resetZoom = useCallback(() => {
    setZoom(0.7);
    setView({ x: 0, y: 0 });
    bumpOverlay();
  }, [bumpOverlay]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const container = stage.container();
    
    const accum = { sum: 0, raf: 0 as number | null };
    const onWheel = (e: WheelEvent) => {
      const isZoomGesture = e.ctrlKey || e.altKey;
      if (!isZoomGesture) return;
      e.preventDefault();
      
      accum.sum += e.deltaY;
      if (accum.raf) return;
      
      accum.raf = requestAnimationFrame(() => {
        const sum = accum.sum;
        accum.sum = 0;
        if (accum.raf) cancelAnimationFrame(accum.raf);
        accum.raf = null;
        
        const sensitivity = e.altKey && !e.ctrlKey ? 0.0008 : 0.001;
        let factor = Math.exp(-sum * sensitivity);
        
        factor = Math.max(0.9, Math.min(1.1, factor));
        
        const z0 = zoomRef.current;
        const z1 = clampZoom(z0 * factor);
        
        setZoom(z1);
        setView({ x: 0, y: 0 });
        bumpOverlay();
      });
    };
    
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel as EventListener);
  }, [stageRef, clampZoom, bumpOverlay, template.width_px, template.height_px]);

  return { zoom, view, zoomIn, zoomOut, resetZoom };
};
