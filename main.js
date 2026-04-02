/**
 * main.js
 * ─────────────────────────────────────────────────────────────
 * Glue layer: binds UI controls → ArrayDS operations → ArrayRenderer.
 * Never touches raw canvas or array internals directly.
 */

(function () {
  'use strict';

  // ── Init ───────────────────────────────────────────────────
  const arrayDS   = new ArrayDS();
  const canvas    = document.getElementById('arrayCanvas');
  const renderer  = new ArrayRenderer(canvas);
  const emptyState = document.getElementById('emptyState');
  const logBody   = document.getElementById('logBody');

  // Seed with a few values to get started
  const seed = [14, 37, 9, 52, 28];
  seed.forEach(v => arrayDS.insert(v));
  renderer.renderSnapshot(arrayDS.data);
  updateEmptyState();

  // ── UI References ──────────────────────────────────────────
  const $ = id => document.getElementById(id);

  // ── Operations ─────────────────────────────────────────────

  function doInsert() {
    const rawVal   = $('inputInsertValue').value.trim();
    const rawIdx   = $('inputInsertIndex').value.trim();

    if (rawVal === '') { showError('Please enter a value to insert.'); return; }
    const value = parseInt(rawVal, 10);
    const index = rawIdx === '' ? null : parseInt(rawIdx, 10);

    const result = arrayDS.insert(value, index);
    handleResult(result, 'insert');

    $('inputInsertValue').value = '';
    $('inputInsertIndex').value = '';
  }

  function doUpdate() {
    const rawIdx = $('inputUpdateIndex').value.trim();
    const rawVal = $('inputUpdateValue').value.trim();

    if (rawIdx === '' || rawVal === '') { showError('Please enter both index and new value.'); return; }
    const index    = parseInt(rawIdx, 10);
    const newValue = parseInt(rawVal, 10);

    const result = arrayDS.update(index, newValue);
    handleResult(result, 'update');

    $('inputUpdateIndex').value = '';
    $('inputUpdateValue').value = '';
  }

  function doDelete() {
    const rawIdx = $('inputDeleteIndex').value.trim();
    if (rawIdx === '') { showError('Please enter the index to delete.'); return; }
    const index = parseInt(rawIdx, 10);

    const result = arrayDS.delete(index);
    handleResult(result, 'delete');

    $('inputDeleteIndex').value = '';
  }

  function doReset() {
    const result = arrayDS.reset();
    handleResult(result, 'reset');
  }

  // ── Result Handler ─────────────────────────────────────────

  function handleResult(result, type) {
    if (!result.ok) {
      showError(result.error);
      return;
    }

    // Play each step; log the label of the last step
    renderer.play(result.steps, () => {
      updateEmptyState();
    });

    const lastStep = result.steps[result.steps.length - 1];
    appendLog(lastStep.label, type);
  }

  // ── Log ────────────────────────────────────────────────────

  function appendLog(message, type) {
    const line = document.createElement('div');
    line.className = `log-line log-line--${type}`;

    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
    line.innerHTML = `<span class="log-time">${ts}</span><span class="log-msg">${message}</span>`;

    logBody.prepend(line);
    // keep max 50 log entries
    while (logBody.children.length > 50) logBody.removeChild(logBody.lastChild);
  }

  function showError(msg) {
    appendLog('⚠ ' + msg, 'error');
    // flash the canvas border
    canvas.parentElement.classList.add('canvas-error');
    setTimeout(() => canvas.parentElement.classList.remove('canvas-error'), 600);
  }

  // ── Empty State ────────────────────────────────────────────

  function updateEmptyState() {
    emptyState.style.display = arrayDS.length === 0 ? 'flex' : 'none';
  }

  // ── Event Listeners ────────────────────────────────────────

  $('btnInsert').addEventListener('click', doInsert);
  $('btnUpdate').addEventListener('click', doUpdate);
  $('btnDelete').addEventListener('click', doDelete);
  $('btnReset').addEventListener('click', doReset);
  $('btnClearLog').addEventListener('click', () => { logBody.innerHTML = ''; });

  // Enter key support for inputs
  ['inputInsertValue', 'inputInsertIndex'].forEach(id =>
    $(id).addEventListener('keydown', e => { if (e.key === 'Enter') doInsert(); }));
  ['inputUpdateIndex', 'inputUpdateValue'].forEach(id =>
    $(id).addEventListener('keydown', e => { if (e.key === 'Enter') doUpdate(); }));
  $('inputDeleteIndex').addEventListener('keydown', e => { if (e.key === 'Enter') doDelete(); });

  // Cleanup on page unload to avoid memory leaks
  window.addEventListener('beforeunload', () => renderer.destroy());

})();
