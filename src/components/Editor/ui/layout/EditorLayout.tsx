import React from 'react';

export interface EditorLayoutProps {
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  sidePanel?: React.ReactNode;
  showSidePanel?: boolean;
}

export const EditorLayout: React.FC<EditorLayoutProps> = ({
  children,
  toolbar,
  sidePanel,
  showSidePanel = false,
}) => {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Toolbar */}
      {toolbar && (
        <div className="flex-shrink-0 z-20">
          {toolbar}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center p-8 pt-24 overflow-auto" 
             style={{ paddingTop: '5rem' }}>
          {children}
        </div>

        {/* Side panel */}
        {showSidePanel && sidePanel && (
          <div className="w-80 bg-white border-l border-gray-200 shadow-lg flex-shrink-0">
            {sidePanel}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorLayout;