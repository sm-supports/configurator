
import { useEffect } from 'react';
import { EditorState } from '../core/types';

export const useKeyboardShortcuts = (
  state: EditorState,
  deleteElement: (id: string) => void,
  undo: () => void,
  redo: () => void
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = (document.activeElement as HTMLElement | null);
      const target = (e.target as HTMLElement | null);
      const isEditable = (node: HTMLElement | null | undefined) => {
        if (!node) return false;
        const tag = node.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || node.isContentEditable) return true;
        return false;
      };
      if (isEditable(active) || isEditable(target) || state.editingTextId) return;

      const key = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedId) {
          e.preventDefault();
          deleteElement(state.selectedId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedId, state.editingTextId, deleteElement, undo, redo]);
};
