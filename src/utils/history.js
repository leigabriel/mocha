/** Linear undo/redo stack of serialized designs. */
export class DesignHistory {
  constructor(limit = 60) {
    this.limit = limit;
    this.stack = [];
    this.index = -1;
  }

  get current() {
    return this.stack[this.index] ?? null;
  }

  get canUndo() {
    return this.index > 0;
  }

  get canRedo() {
    return this.index < this.stack.length - 1;
  }

  /** Records a new state; identical consecutive states are ignored. Returns true if recorded. */
  push(state) {
    if (state === this.current) return false;
    this.stack.length = this.index + 1; // a new edit discards the redo branch
    this.stack.push(state);
    if (this.stack.length > this.limit) this.stack.shift();
    this.index = this.stack.length - 1;
    return true;
  }

  undo() {
    if (!this.canUndo) return null;
    this.index--;
    return this.current;
  }

  redo() {
    if (!this.canRedo) return null;
    this.index++;
    return this.current;
  }
}
