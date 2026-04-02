/**
 * renderer.js
 * ─────────────────────────────────────────────────────────────
 * Canvas rendering engine for Array Visualizer.
 * Consumes Step objects from ArrayDS and animates them.
 * No data-structure logic lives here.
 */

class ArrayRenderer {
  // ── Config ───────────────────────────────────────────────────
  static CELL = {
    WIDTH: 72,
    HEIGHT: 72,
    GAP: 12,
    RADIUS: 8,
    PADDING_X: 48,
    PADDING_Y: 36,
  };

  static COLOR = {
    BG: '#0d0d0f',
    CELL_BG: '#1a1a1f',
    CELL_BORDER: '#2e2e3a',
    CELL_ACTIVE: '#e8ff47',        // insert highlight
    CELL_UPDATE: '#47c8ff',        // update
    CELL_DELETE: '#ff4757',        // delete
    CELL_SHIFT: '#b388ff',         // shifting
    CELL_NORMAL: '#1a1a1f',
    VALUE_TEXT: '#f0f0f0',
    VALUE_TEXT_ACTIVE: '#0d0d0f',
    INDEX_TEXT: '#555566',
    BRACKET: '#2e2e3a',
    GRID_LINE: '#1a1a1f',
  };

  static FONT = {
    VALUE: 'bold 18px "Space Mono", monospace',
    INDEX: '11px "Space Mono", monospace',
    EMPTY: '14px "Space Mono", monospace',
  };

  static ANIM = {
    STEP_DURATION: 520,   // ms per step
    EASE_FACTOR: 0.12,
  };

  // ── Constructor ──────────────────────────────────────────────

  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    /** @type {CellState[]} current visual cells */
    this._cells = [];

    /** @type {Step[]} pending animation queue */
    this._queue = [];

    /** @type {boolean} is an animation running? */
    this._animating = false;

    /** @type {number|null} rAF handle */
    this._rafHandle = null;

    /** @type {number} timestamp of current step start */
    this._stepStart = 0;

    /** @type {Step|null} */
    this._currentStep = null;

    /** @type {Function|null} callback when queue finishes */
    this._onComplete = null;

    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(canvas.parentElement);
    this._resize();
  }

  // ── Public API ───────────────────────────────────────────────

  /**
   * Enqueue and play animation steps from an operation result.
   * @param {Step[]} steps
   * @param {Function} [onComplete]
   */
  play(steps, onComplete = null) {
    this._onComplete = onComplete;
    this._queue.push(...steps);
    if (!this._animating) this._nextStep();
  }

  /**
   * Hard-render a snapshot with no animation (used for initial state / reset).
   * @param {number[]} data
   */
  renderSnapshot(data) {
    this._cancelAnimation();
    this._cells = data.map((v, i) => this._makeCell(v, i, data.length, 'normal'));
    this._drawFrame();
  }

  /**
   * Destroy renderer and stop all animation loops.
   */
  destroy() {
    this._cancelAnimation();
    this._resizeObserver.disconnect();
  }

  // ── Private: Animation Loop ──────────────────────────────────

  _nextStep() {
    if (this._queue.length === 0) {
      this._animating = false;
      if (this._onComplete) this._onComplete();
      return;
    }

    this._animating = true;
    this._currentStep = this._queue.shift();
    this._stepStart = performance.now();
    this._applyStepStart(this._currentStep);

    const tick = (now) => {
      const t = Math.min((now - this._stepStart) / ArrayRenderer.ANIM.STEP_DURATION, 1);
      this._applyStepProgress(this._currentStep, t);
      this._drawFrame();

      if (t < 1) {
        this._rafHandle = requestAnimationFrame(tick);
      } else {
        this._applyStepEnd(this._currentStep);
        this._drawFrame();
        // small pause between steps
        setTimeout(() => this._nextStep(), 80);
      }
    };

    this._rafHandle = requestAnimationFrame(tick);
  }

  _cancelAnimation() {
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
    this._animating = false;
    this._queue = [];
    this._currentStep = null;
  }

  // ── Private: Step Handlers ───────────────────────────────────

  _applyStepStart(step) {
    const snapshot = step.snapshotBefore ?? step.snapshotAfter ?? this._cells.map(c => c.value);

    switch (step.type) {
      case 'highlight': {
        this._cells = snapshot.map((v, i) => this._makeCell(v, i, snapshot.length,
          step.indices.includes(i) ? 'active' : 'normal'));
        break;
      }
      case 'shift': {
        const shifted = step.from !== undefined
          ? snapshot.map((_, i) => i >= step.from)
          : [];
        this._cells = snapshot.map((v, i) => this._makeCell(v, i, snapshot.length,
          shifted[i] ? 'shift' : 'normal'));
        break;
      }
      case 'inserted': {
        this._cells = step.snapshotAfter.map((v, i) => this._makeCell(v, i, step.snapshotAfter.length,
          i === step.index ? 'active' : 'normal'));
        break;
      }
      case 'updated': {
        this._cells = step.snapshotAfter.map((v, i) => this._makeCell(v, i, step.snapshotAfter.length,
          i === step.index ? 'update' : 'normal'));
        break;
      }
      case 'removed': {
        this._cells = snapshot.map((v, i) => this._makeCell(v, i, snapshot.length,
          i === step.index ? 'delete' : 'normal'));
        break;
      }
      case 'done':
      case 'reset': {
        const s = step.snapshotAfter ?? [];
        this._cells = s.map((v, i) => this._makeCell(v, i, s.length, 'normal'));
        break;
      }
    }
  }

  _applyStepProgress(step, t) {
    // animate opacity / scale for the active cell
    this._cells.forEach(cell => {
      if (cell.state === 'active' || cell.state === 'update' || cell.state === 'delete') {
        cell.animT = t;
      }
      if (cell.state === 'shift') {
        cell.animT = t;
      }
    });
  }

  _applyStepEnd(step) {
    // after delete animation — reindex
    if (step.type === 'removed' && step.snapshotAfter) {
      this._cells = step.snapshotAfter.map((v, i) =>
        this._makeCell(v, i, step.snapshotAfter.length, 'normal'));
    }
    // normalize all animT
    this._cells.forEach(c => { c.animT = 1; });
  }

  // ── Private: Draw ────────────────────────────────────────────

  _drawFrame() {
    const { ctx, canvas } = this;
    const C = ArrayRenderer.COLOR;
    const CELL = ArrayRenderer.CELL;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // background
    ctx.fillStyle = C.BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (this._cells.length === 0) return;

    const totalWidth = this._cells.length * (CELL.WIDTH + CELL.GAP) - CELL.GAP;
    const startX = Math.max(CELL.PADDING_X, (canvas.width - totalWidth) / 2);
    const centerY = canvas.height / 2 - 12;

    // Draw bracket [ ]
    this._drawBrackets(startX, centerY, totalWidth);

    // Draw each cell
    this._cells.forEach((cell, i) => {
      const x = startX + i * (CELL.WIDTH + CELL.GAP);
      this._drawCell(cell, x, centerY, i);
    });
  }

  _drawBrackets(startX, cy, totalWidth) {
    const { ctx } = this;
    const C = ArrayRenderer.COLOR;
    const CELL = ArrayRenderer.CELL;
    const bH = CELL.HEIGHT + 16;
    const bY = cy - CELL.HEIGHT / 2 - 8;
    const bW = 10;
    const bThick = 2.5;

    ctx.strokeStyle = C.BRACKET;
    ctx.lineWidth = bThick;
    ctx.lineCap = 'square';

    // left bracket [
    ctx.beginPath();
    ctx.moveTo(startX - 16 + bW, bY);
    ctx.lineTo(startX - 16, bY);
    ctx.lineTo(startX - 16, bY + bH);
    ctx.lineTo(startX - 16 + bW, bY + bH);
    ctx.stroke();

    // right bracket ]
    const rx = startX + totalWidth + 16;
    ctx.beginPath();
    ctx.moveTo(rx - bW, bY);
    ctx.lineTo(rx, bY);
    ctx.lineTo(rx, bY + bH);
    ctx.lineTo(rx - bW, bY + bH);
    ctx.stroke();
  }

  _drawCell(cell, x, cy, index) {
    const { ctx } = this;
    const C = ArrayRenderer.COLOR;
    const CELL = ArrayRenderer.CELL;
    const t = cell.animT ?? 1;

    const cellX = x;
    const cellY = cy - CELL.HEIGHT / 2;
    const w = CELL.WIDTH;
    const h = CELL.HEIGHT;

    // determine colors based on state
    let bgColor = C.CELL_BG;
    let borderColor = C.CELL_BORDER;
    let textColor = C.VALUE_TEXT;
    let scale = 1;
    let alpha = 1;
    let glowColor = null;

    switch (cell.state) {
      case 'active':
        bgColor = this._lerpColor(C.CELL_BG, C.CELL_ACTIVE, this._easeOut(t));
        borderColor = C.CELL_ACTIVE;
        textColor = this._lerpColor(C.VALUE_TEXT, C.VALUE_TEXT_ACTIVE, this._easeOut(t));
        scale = 1 + 0.06 * Math.sin(t * Math.PI);
        glowColor = C.CELL_ACTIVE;
        break;
      case 'update':
        bgColor = this._lerpColor(C.CELL_BG, C.CELL_UPDATE, this._easeOut(t));
        borderColor = C.CELL_UPDATE;
        textColor = this._lerpColor(C.VALUE_TEXT, C.VALUE_TEXT_ACTIVE, this._easeOut(t));
        scale = 1 + 0.05 * Math.sin(t * Math.PI);
        glowColor = C.CELL_UPDATE;
        break;
      case 'delete':
        alpha = 1 - this._easeIn(t) * 0.6;
        bgColor = this._lerpColor(C.CELL_BG, C.CELL_DELETE, this._easeOut(Math.min(t * 2, 1)));
        borderColor = C.CELL_DELETE;
        glowColor = C.CELL_DELETE;
        break;
      case 'shift':
        borderColor = C.CELL_SHIFT;
        bgColor = this._lerpColor(C.CELL_BG, C.CELL_SHIFT + '22', this._easeOut(t));
        glowColor = C.CELL_SHIFT;
        break;
    }

    ctx.save();
    ctx.globalAlpha = alpha;

    // glow
    if (glowColor && t > 0.05) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 16 * this._easeOut(t);
    }

    // scale transform
    if (scale !== 1) {
      ctx.translate(cellX + w / 2, cellY + h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(cellX + w / 2), -(cellY + h / 2));
    }

    // cell background
    this._roundRect(cellX, cellY, w, h, CELL.RADIUS);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = cell.state === 'normal' ? 1.5 : 2;
    ctx.stroke();

    // reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // value text
    ctx.fillStyle = textColor;
    ctx.font = ArrayRenderer.FONT.VALUE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(cell.value), cellX + w / 2, cellY + h / 2);

    ctx.restore();

    // index label (always drawn without glow)
    ctx.fillStyle = C.INDEX_TEXT;
    ctx.font = ArrayRenderer.FONT.INDEX;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`[${index}]`, cellX + w / 2, cellY + h + 8);
  }

  // ── Private: Helpers ─────────────────────────────────────────

  _makeCell(value, index, total, state) {
    return { value, index, total, state, animT: state === 'normal' ? 1 : 0 };
  }

  _roundRect(x, y, w, h, r) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  _resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.scale(dpr, dpr);
    this._drawFrame();
  }

  _easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  _easeIn(t)  { return t * t * t; }

  _lerpColor(a, b, t) {
    const pa = this._parseHex(a);
    const pb = this._parseHex(b);
    const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
    const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
    const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
    return `rgb(${r},${g},${bl})`;
  }

  _parseHex(hex) {
    const h = hex.replace('#', '').slice(0, 6);
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
}
