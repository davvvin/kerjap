/**
 * array-ds.js
 * ─────────────────────────────────────────────────────────────
 * Pure Array Data Structure module.
 * Zero dependency on DOM / Canvas / rendering.
 * Returns descriptive result objects so the renderer can animate steps.
 */

class ArrayDS {
  constructor() {
    /** @type {number[]} */
    this._data = [];
  }

  // ── Getters ─────────────────────────────────────────────────

  get data() {
    return [...this._data];
  }

  get length() {
    return this._data.length;
  }

  // ── Operations ───────────────────────────────────────────────

  /**
   * Insert a value at a given index (default: append to end).
   * @param {number} value
   * @param {number|null} index
   * @returns {{ ok: boolean, steps: Step[], error?: string }}
   */
  insert(value, index = null) {
    const targetIndex = index === null ? this._data.length : index;

    if (targetIndex < 0 || targetIndex > this._data.length) {
      return {
        ok: false,
        steps: [],
        error: `Index ${targetIndex} is out of bounds (valid: 0 – ${this._data.length})`,
      };
    }

    const steps = [];

    // Step 1 — highlight insertion point
    steps.push({
      type: 'highlight',
      indices: [targetIndex],
      label: `Inserting ${value} at index ${targetIndex}`,
      snapshotBefore: [...this._data],
    });

    // Step 2 — shift elements (if mid-array insert)
    if (targetIndex < this._data.length) {
      steps.push({
        type: 'shift',
        from: targetIndex,
        direction: 'right',
        label: `Shifting elements [${targetIndex}..${this._data.length - 1}] right`,
        snapshotBefore: [...this._data],
      });
    }

    // Mutate
    this._data.splice(targetIndex, 0, value);

    // Step 3 — show final state with new element highlighted
    steps.push({
      type: 'inserted',
      index: targetIndex,
      value,
      label: `✓ Inserted ${value} at index ${targetIndex}`,
      snapshotAfter: [...this._data],
    });

    return { ok: true, steps };
  }

  /**
   * Update the value at a given index.
   * @param {number} index
   * @param {number} newValue
   * @returns {{ ok: boolean, steps: Step[], error?: string }}
   */
  update(index, newValue) {
    if (index < 0 || index >= this._data.length) {
      return {
        ok: false,
        steps: [],
        error: `Index ${index} is out of bounds (valid: 0 – ${this._data.length - 1})`,
      };
    }

    const oldValue = this._data[index];
    const steps = [];

    // Step 1 — access / highlight target
    steps.push({
      type: 'highlight',
      indices: [index],
      label: `Accessing index ${index} (current value: ${oldValue})`,
      snapshotBefore: [...this._data],
    });

    // Mutate
    this._data[index] = newValue;

    // Step 2 — show updated state
    steps.push({
      type: 'updated',
      index,
      oldValue,
      newValue,
      label: `✓ Updated index ${index}: ${oldValue} → ${newValue}`,
      snapshotAfter: [...this._data],
    });

    return { ok: true, steps };
  }

  /**
   * Delete the element at a given index.
   * @param {number} index
   * @returns {{ ok: boolean, steps: Step[], error?: string }}
   */
  delete(index) {
    if (index < 0 || index >= this._data.length) {
      return {
        ok: false,
        steps: [],
        error: `Index ${index} is out of bounds (valid: 0 – ${this._data.length - 1})`,
      };
    }

    const removedValue = this._data[index];
    const steps = [];

    // Step 1 — highlight target
    steps.push({
      type: 'highlight',
      indices: [index],
      label: `Targeting index ${index} (value: ${removedValue}) for deletion`,
      snapshotBefore: [...this._data],
    });

    // Step 2 — mark as removed (before shifting)
    steps.push({
      type: 'removed',
      index,
      value: removedValue,
      label: `Removing element ${removedValue}`,
      snapshotBefore: [...this._data],
    });

    // Mutate
    this._data.splice(index, 1);

    // Step 3 — shift elements left
    if (index < this._data.length) {
      steps.push({
        type: 'shift',
        from: index,
        direction: 'left',
        label: `Shifting elements [${index}..${this._data.length - 1}] left`,
        snapshotAfter: [...this._data],
      });
    }

    // Step 4 — final state
    steps.push({
      type: 'done',
      label: `✓ Deleted index ${index} (was: ${removedValue})`,
      snapshotAfter: [...this._data],
    });

    return { ok: true, steps };
  }

  /**
   * Reset — clear the array.
   */
  reset() {
    this._data = [];
    return {
      ok: true,
      steps: [{ type: 'reset', label: '✓ Array cleared', snapshotAfter: [] }],
    };
  }
}
