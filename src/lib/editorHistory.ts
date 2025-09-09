export interface EditorStateShape<Element> {
  elements: Element[];
  selectedId: string | null;
  editingTextId: string | null;
}

/**
 * Simple in-memory history manager for editor state.
 * Keeps shallow-cloned element arrays to avoid sharing mutable references.
 */
export class EditorHistory<T extends EditorStateShape<unknown>> {
  private undoStack: T[] = [];
  private redoStack: T[] = [];

  push(prev: T) {
  // Create a deep-clone snapshot via structured serialization to avoid
  // sharing mutable references and to satisfy lint rules (no-explicit-any).
  const snapshot: T = JSON.parse(JSON.stringify({ ...prev, editingTextId: null })) as T;
    this.undoStack.push(snapshot);
    this.redoStack = [];
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo(current: T, apply: (s: T) => void) {
    if (!this.canUndo()) return;
  const currentSnapshot: T = JSON.parse(JSON.stringify({ ...current, editingTextId: null })) as T;
  const prev = this.undoStack.pop()!;
    this.redoStack.push(currentSnapshot);
    apply({ ...prev });
  }

  redo(current: T, apply: (s: T) => void) {
    if (!this.canRedo()) return;
  const currentSnapshot: T = JSON.parse(JSON.stringify({ ...current, editingTextId: null })) as T;
  const next = this.redoStack.pop()!;
    this.undoStack.push(currentSnapshot);
    apply({ ...next });
  }

  // For debugging or UI if needed
  getUndoLength() { return this.undoStack.length; }
  getRedoLength() { return this.redoStack.length; }
}

export default EditorHistory;
