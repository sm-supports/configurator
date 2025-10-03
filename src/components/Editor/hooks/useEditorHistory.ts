import { useCallback, useRef } from 'react';
import { EditorState } from '../core/types';

/**
 * Custom hook for managing editor history (undo/redo)
 * Implements a simple stack-based history system
 */
export const useEditorHistory = (state: EditorState, setState: React.Dispatch<React.SetStateAction<EditorState>>) => {
  const undoStackRef = useRef<EditorState[]>([]);
  const redoStackRef = useRef<EditorState[]>([]);

  const pushHistory = useCallback((prevState: EditorState) => {
    // Create a deep-clone snapshot to avoid sharing mutable references
    const snapshot: EditorState = JSON.parse(JSON.stringify({ ...prevState, editingTextId: null }));
    undoStackRef.current.push(snapshot);
    redoStackRef.current = [];
  }, []);

  const canUndo = useCallback(() => undoStackRef.current.length > 0, []);
  const canRedo = useCallback(() => redoStackRef.current.length > 0, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    
    const currentSnapshot: EditorState = JSON.parse(JSON.stringify({ ...state, editingTextId: null }));
    const prev = undoStackRef.current.pop()!;
    
    redoStackRef.current.push(currentSnapshot);
    setState({ ...prev });
  }, [state, setState]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    
    const currentSnapshot: EditorState = JSON.parse(JSON.stringify({ ...state, editingTextId: null }));
    const next = redoStackRef.current.pop()!;
    
    undoStackRef.current.push(currentSnapshot);
    setState({ ...next });
  }, [state, setState]);

  return { pushHistory, canUndo, canRedo, undo, redo };
};
