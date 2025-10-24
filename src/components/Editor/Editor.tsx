"use client";

import React from 'react';
import type Konva from 'konva';
import { EditorProps, Element } from './core/types';

// Context and Services
import { EditorProvider, useEditorContext } from './core/context/EditorContext';

// UI Components
import { EditorLayout } from './ui/layout/EditorLayout';
import { EditorContent } from './ui/layout/EditorContent';
import { DownloadDialog } from './ui/panels/DownloadDialog';
import { LayersPanel } from './ui/panels/LayersPanel';
import { Toolbar } from './ui/panels/Toolbar';
import { EditorErrorBoundary } from './ui/ErrorBoundary';

// Utility functions
import { measureText } from './canvas/utils/canvasUtils';

const EditorCore: React.FC = () => {
  const {
    // Core state
    state,
    setState,
    template,
    stageRef,
    
    // Services
    stateManager,
    
    // UI state
    isSaving,
    saveSuccess,
    saveError,
    isDownloading,
    showDownloadDropdown,
    setShowDownloadDropdown,
    showLayersPanel,
    setShowLayersPanel,
    showRulers,
    
    // Background images
    bgImage,
    licensePlateFrame,
    
    // History operations
    undo,
    redo,
    canUndo,
    canRedo,
    pushHistory,
    
    // Zoom operations
    zoom,
    view,
    zoomIn,
    zoomOut,
    resetZoom,
    bumpOverlay,
    
    // Element operations
    addText,
    addImage,
    selectElement,
    updateElement,
    deleteElement,
    flipHorizontal,
    flipVertical,
    toggleLayer,
    finishTextEdit,
    changeFrameSize,
    
    // Paint tool operations
    setActiveTool,
    setPaintSettings,
    startPainting,
    addPaintPoint,
    finishPainting,
    eraseAtPoint,
    
    // Shape tool operations
    setShapeSettings,
    addShape,
    addCenterline,
    
    // Save/Export operations
    handleSaveDesign,
    handleDownload,
    
    // Auth context
    isAdmin,
  } = useEditorContext();

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const isBackground = e.target === e.target.getStage() || e.target.name?.() === 'background';
    if (isBackground) {
      // If in text edit mode, finish editing (this will delete empty text)
      if (state.editingTextId) {
        finishTextEdit(true, false);
      }
      setState(prev => ({ ...prev, selectedId: null }));
    }
  };

  const toolbar = (
    <Toolbar
      template={template}
      undo={undo}
      canUndo={canUndo()}
      redo={redo}
      canRedo={canRedo()}
      showLayersPanel={showLayersPanel}
      setShowLayersPanel={setShowLayersPanel}
      state={state}
      setState={setState}
      pushHistory={pushHistory}
      toggleLayer={toggleLayer}
      addText={addText}
      addImage={addImage}
      deleteElement={deleteElement}
      handleSaveDesign={handleSaveDesign}
      isSaving={isSaving}
      saveSuccess={saveSuccess}
      saveError={saveError}
      isAdmin={isAdmin}
      isDownloading={isDownloading}
      showDownloadDropdown={showDownloadDropdown}
      setShowDownloadDropdown={setShowDownloadDropdown}
      handleDownload={handleDownload}
      updateElement={updateElement}
      measureText={measureText}
      flipHorizontal={flipHorizontal}
      flipVertical={flipVertical}
      setActiveTool={setActiveTool}
      setPaintSettings={setPaintSettings}
      setShapeSettings={setShapeSettings}
      addShape={addShape}
      addCenterline={addCenterline}
      zoom={zoom}
      zoomIn={zoomIn}
      zoomOut={zoomOut}
      resetZoom={resetZoom}
      changeFrameSize={changeFrameSize}
    />
  );

  const sidePanel = (
    <LayersPanel
      isOpen={showLayersPanel}
      onClose={() => setShowLayersPanel(false)}
      state={state}
      selectElement={selectElement}
      deleteElement={deleteElement}
      duplicateElement={stateManager?.duplicateElement}
      moveElementUp={stateManager?.moveElementUp}
      moveElementDown={stateManager?.moveElementDown}
      moveElementToFront={stateManager?.moveElementToFront}
      moveElementToBack={stateManager?.moveElementToBack}
      toggleLayer={toggleLayer}
    />
  );

  return (
    <>
      <EditorLayout
        toolbar={toolbar}
        sidePanel={sidePanel}
        showSidePanel={showLayersPanel}
      >
        <EditorContent
          template={template}
          zoom={zoom}
          view={view}
          stageRef={stageRef}
          handleStageClick={handleStageClick}
          bgImage={bgImage}
          licensePlateFrame={licensePlateFrame}
          state={state}
          selectElement={selectElement}
          setActiveTool={setActiveTool}
          updateElement={updateElement}
          bumpOverlay={bumpOverlay}
          startPainting={startPainting}
          addPaintPoint={addPaintPoint}
          finishPainting={finishPainting}
          eraseAtPoint={eraseAtPoint}
          showRulers={showRulers}
        />
      </EditorLayout>

      <DownloadDialog
        isOpen={showDownloadDropdown}
        onClose={() => setShowDownloadDropdown(false)}
        onDownload={handleDownload}
        isDownloading={isDownloading}
        templateName={template.name}
      />
    </>
  );
};

const Editor: React.FC<EditorProps> = ({ template, existingDesign }) => {
  return (
    <EditorErrorBoundary>
      <EditorProvider 
        template={template} 
        existingDesign={existingDesign?.design_json ? { 
          design_json: {
            elements: existingDesign.design_json.elements as unknown as Element[]
          }
        } : undefined}
        existingDesignId={existingDesign?.id}
        existingDesignName={existingDesign?.name}
      >
        <EditorCore />
      </EditorProvider>
    </EditorErrorBoundary>
  );
};

export default React.memo(Editor);