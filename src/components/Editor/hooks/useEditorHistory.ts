
import { useCallback, useRef } from 'react';
import EditorHistory from '@/lib/editorHistory';
import { EditorState } from '../core/types';

export const useEditorHistory = (state: EditorState, setState: React.Dispatch<React.SetStateAction<EditorState>>) => {
  const historyRef = useRef<EditorHistory<EditorState>>(new EditorHistory<EditorState>());

  const pushHistory = useCallback((prevState: EditorState) => {
    historyRef.current.push(prevState);
  }, []);

  const canUndo = useCallback(() => historyRef.current.canUndo(), []);
  const canRedo = useCallback(() => historyRef.current.canRedo(), []);

  const undo = useCallback(() => {
    historyRef.current.undo(state, (s) => setState(s));
  }, [state, setState]);

  const redo = useCallback(() => {
    historyRef.current.redo(state, (s) => setState(s));
  }, [state, setState]);

  return { pushHistory, canUndo, canRedo, undo, redo };
};
