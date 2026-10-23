(function () {
  'use strict';

  const BLOCK = 60;
  const CELL_W = 14;
  const ROW_H = 20;
  const TRACK_H = 17;
  const TRACK_BAR_H = 10;
  const RULER_H = 16;
  const PAD = 20;
  const LABEL_W = 118;
  const LABEL_GAP = 10;
  const TRACK_GAP = 6;
  const BLOCK_GAP = 22;

  const SEQ_FONT = '700 13px "Courier New", Courier, monospace';
  const RULER_FONT = '500 10px "Segoe UI", system-ui, sans-serif';
  const LABEL_FONT = '600 12px "Segoe UI", system-ui, sans-serif';
  const TRACK_LABEL_FONT = '600 11px "Segoe UI", system-ui, sans-serif';
  const NOTE_FONT = '600 11px "Segoe UI", system-ui, sans-serif';

  const PALETTE = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const EXAMPLE_SEQ = '>Ubiquitin\nMQIFVKTLTGKTITLEVEPSDTIENVKAKIQDKEGIPPDQQRLIFAGKQLEDGRTLSDYNIQKESTLHLVLRLRGG';

  const EXAMPLE_ANNOTATIONS = [
    { label: 'Ubiquitin fold', start: 1, end: 76, color: '#3b82f6', note: 'Ubiquitin-like fold' },
    { label: 'K48 linkage', start: 48, end: 48, color: '#ef4444', note: 'K48' },
    { label: 'C-terminal tail', start: 72, end: 76, color: '#10b981', note: 'LRGG motif' }
  ];

  const state = {
    name: '',
    seq: '',
    annotations: [],
    selection: null,
    nextId: 1,
    layout: null,
    drag: null
  };

  const els = {
    nameInput: document.getElementById('seq-name'),
    seqInput: document.getElementById('seq-input'),
    renderBtn: document.getElementById('render-btn'),
    exampleBtn: document.getElementById('example-btn'),
    clearBtn: document.getElementById('clear-btn'),
    errorBox: document.getElementById('error-box'),
    warnBox: document.getElementById('warn-box'),
    workspace: document.getElementById('workspace'),
    rowsContainer: document.getElementById('rows-container'),
    emptyRows: document.getElementById('empty-rows'),
    addRowBtn: document.getElementById('add-row-btn'),
    clearSelectionBtn: document.getElementById('clear-selection-btn'),
    selectionInfo: document.getElementById('selection-info'),
    figureMeta: document.getElementById('figure-meta'),
    hoverInfo: document.getElementById('hover-info'),
    canvas: document.getElementById('figure-canvas'),
    saveBtn: document.getElementById('save-png-btn')
  };

  let pendingRender = 0;
  let hoverPos = null;

  function tr(en, zh) {
    return document.documentElement.lang === 'zh-CN' ? zh : en;
  }

  function showError(msg) {
    els.errorBox.textContent = msg;
    els.errorBox.style.display = 'block';
  }

  function showWarn(msg) {
    els.warnBox.textContent = msg;
    els.warnBox.style.display = 'block';
  }

  function clearMessages() {
    els.errorBox.textContent = '';
    els.errorBox.style.display = 'none';
    els.warnBox.textContent = '';
    els.warnBox.style.display = 'none';
  }

  function parseSequence(raw) {
    const lines = raw.split(/\r?\n/);
    let name = '';
    let seq = '';
    let headerCount = 0;
    let multiple = false;

    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith('>')) {
        headerCount++;
        if (headerCount === 1 && !seq) {
          name = t.slice(1).trim();
        } else {
          multiple = true;
          break;
        }
        continue;
      }
      seq += t.replace(/\s+/g, '').toUpperCase();
    }

    return { name, seq, multiple };
  }

  function mk(tag, className, attrs) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'text') el.textContent = attrs[key];
        else if (key === 'value') el.value = attrs[key];
        else el.setAttribute(key, attrs[key]);
      });
    }
    return el;
  }

  function fitText(ctx, text, maxWidth) {
    if (!text) return '';
    if (ctx.measureText(text).width <= maxWidth) return text;
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const candidate = text.slice(0, mid) + '\u2026';
      if (ctx.measureText(candidate).width <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return lo > 0 ? text.slice(0, lo) + '\u2026' : '';
  }

  function contrastColor(color) {
    let c = String(color || '#3b82f6').replace('#', '');
    if (c.length === 3) c = c.split('').map(function (ch) { return ch + ch; }).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(c)) return '#ffffff';
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 155 ? '#1e293b' : '#ffffff';
  }

  function drawRoundedBar(ctx, x, y, w, h, color, roundLeft, roundRight) {
    const r = Math.min(5, w / 2, h / 2);
    const tl = roundLeft ? r : 0;
    const bl = roundLeft ? r : 0;
    const tr = roundRight ? r : 0;
    const br = roundRight ? r : 0;
    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function computeLayout() {
    const len = state.seq.length;
    const visible = state.annotations.filter(function (a) { return a.visible !== false; });
    const blockCount = Math.max(1, Math.ceil(len / BLOCK));
    const seqLeft = PAD + LABEL_W + LABEL_GAP;
    const blockWidth = BLOCK * CELL_W;
    const width = seqLeft + blockWidth + PAD;
    const blocks = [];
    let y = PAD;

    for (let b = 0; b < blockCount; b++) {
      const start = b * BLOCK + 1;
      const end = Math.min((b + 1) * BLOCK, len);
      const rulerY = y;
      const seqTop = y + RULER_H;
      const tracksTop = seqTop + ROW_H + TRACK_GAP;
      const tracks = visible.map(function (ann, i) {
        return { ann: ann, top: tracksTop + i * TRACK_H };
      });
      const blockBottom = tracksTop + visible.length * TRACK_H;
      blocks.push({
        index: b,
        start: start,
        end: end,
        rulerY: rulerY,
        seqTop: seqTop,
        tracksTop: tracksTop,
        tracks: tracks,
        blockTop: y,
        blockBottom: blockBottom
      });
      y = blockBottom + BLOCK_GAP;
    }

    return {
      width: width,
      height: Math.max(1, y - BLOCK_GAP + PAD),
      blocks: blocks,
      seqLeft: seqLeft,
      blockWidth: blockWidth
    };
  }

  function drawTrackNote(ctx, ann, x1, x2, yMid, seqLeft, blockWidth) {
    const gap = 4;
    const barW = x2 - x1;
    ctx.font = NOTE_FONT;
    const textW = ctx.measureText(ann.note).width;

    if (textW + 8 <= barW) {
      ctx.fillStyle = contrastColor(ann.color);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ann.note, x1 + barW / 2, yMid);
      return;
    }

    if (barW >= 36) {
      const txt = fitText(ctx, ann.note, barW - 8);
      if (txt) {
        ctx.fillStyle = contrastColor(ann.color);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, x1 + barW / 2, yMid);
      }
      return;
    }

    const blockRight = seqLeft + blockWidth;
    const availRight = blockRight - x2 - gap;
    if (availRight >= Math.min(textW, 28)) {
      const txt = fitText(ctx, ann.note, availRight);
      if (txt) {
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, x2 + gap, yMid);
      }
      return;
    }

    const availLeft = x1 - gap - seqLeft;
    if (availLeft > 0) {
      const txt = fitText(ctx, ann.note, availLeft);
      if (txt) {
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, x1 - gap, yMid);
      }
    }
  }

  function drawFigure(ctx, layout, scale, includeSelection) {
    const width = layout.width;
    const height = layout.height;
    const seqLeft = layout.seqLeft;
    const blockWidth = layout.blockWidth;
    const sel = includeSelection ? state.selection : null;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    layout.blocks.forEach(function (block) {
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(seqLeft - 6, block.rulerY);
      ctx.lineTo(seqLeft - 6, block.blockBottom);
      ctx.stroke();

      ctx.font = LABEL_FONT;
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(fitText(ctx, state.name || 'Sequence', LABEL_W), PAD + LABEL_W, block.seqTop + ROW_H / 2);

      ctx.font = RULER_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let pos = block.start; pos <= block.end; pos++) {
        const x = seqLeft + (pos - block.start) * CELL_W + CELL_W / 2;
        if (pos === block.start || pos % 10 === 0 || pos === block.end) {
          ctx.fillStyle = '#64748b';
          ctx.fillText(String(pos), x, block.rulerY);
        } else if (pos % 5 === 0) {
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(x - 0.5, block.rulerY + 10, 1, 4);
        }
      }

      if (sel) {
        const s = Math.max(sel.start, block.start);
        const e = Math.min(sel.end, block.end);
        if (s <= e) {
          const x1 = seqLeft + (s - block.start) * CELL_W;
          const x2 = seqLeft + (e - block.start + 1) * CELL_W;
          ctx.fillStyle = '#dbeafe';
          ctx.fillRect(x1, block.seqTop, x2 - x1, ROW_H);
          ctx.fillStyle = '#93c5fd';
          ctx.fillRect(x1, block.seqTop + ROW_H - 2, x2 - x1, 2);
        }
      }

      ctx.font = SEQ_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let pos = block.start; pos <= block.end; pos++) {
        const x = seqLeft + (pos - block.start) * CELL_W + CELL_W / 2;
        const isSel = sel && pos >= sel.start && pos <= sel.end;
        ctx.fillStyle = isSel ? '#1d4ed8' : '#1e293b';
        ctx.fillText(state.seq[pos - 1], x, block.seqTop + ROW_H / 2);
      }

      block.tracks.forEach(function (track) {
        const ann = track.ann;
        const top = track.top;
        const y1 = top + (TRACK_H - TRACK_BAR_H) / 2;

        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(seqLeft, y1, blockWidth, TRACK_BAR_H);

        ctx.font = TRACK_LABEL_FONT;
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(fitText(ctx, ann.label || '', LABEL_W), PAD + LABEL_W, top + TRACK_H / 2);

        const s = Math.max(ann.start, block.start);
        const e = Math.min(ann.end, block.end);
        if (s > e) return;

        const x1 = seqLeft + (s - block.start) * CELL_W;
        const x2 = seqLeft + (e - block.start + 1) * CELL_W;
        drawRoundedBar(ctx, x1, y1, x2 - x1, TRACK_BAR_H, ann.color || '#3b82f6', s === ann.start, e === ann.end);

        if (ann.note && s === ann.start) {
          drawTrackNote(ctx, ann, x1, x2, y1 + TRACK_BAR_H / 2, seqLeft, blockWidth);
        }
      });
    });

    ctx.restore();
  }

  function renderCanvas() {
    if (!state.seq) return;
    const layout = computeLayout();
    state.layout = layout;
    const canvas = els.canvas;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(layout.width * dpr);
    canvas.height = Math.round(layout.height * dpr);
    canvas.style.width = layout.width + 'px';
    canvas.style.height = layout.height + 'px';
    const ctx = canvas.getContext('2d');
    drawFigure(ctx, layout, dpr, true);
    updateFigureMeta();
  }

  function scheduleRender() {
    if (pendingRender) return;
    pendingRender = requestAnimationFrame(function () {
      pendingRender = 0;
      renderCanvas();
    });
  }

  function updateFigureMeta() {
    if (!els.figureMeta) return;
    const len = state.seq.length;
    if (!len) {
      els.figureMeta.textContent = '';
      return;
    }
    const blocks = Math.max(1, Math.ceil(len / BLOCK));
    const visible = state.annotations.filter(function (a) { return a.visible !== false; }).length;
    const blockText = blocks === 1 ? tr(' block', ' \u6bb5') : tr(' blocks', ' \u6bb5');
    const rowText = visible === 1 ? tr(' visible row', ' \u6761\u53ef\u89c1\u6807\u6ce8') : tr(' visible rows', ' \u6761\u53ef\u89c1\u6807\u6ce8');
    els.figureMeta.textContent = len + ' aa \u00b7 ' + blocks + blockText + ' \u00b7 ' + visible + rowText;
  }

  function updateSelectionUI() {
    const el = els.selectionInfo;
    if (!state.selection) {
      el.textContent = tr(
        'No selection \u2014 drag across the sequence to select a residue or fragment.',
        '\u672a\u9009\u62e9 \u2014 \u5728\u5e8f\u5217\u4e0a\u62d6\u52a8\u4ee5\u9009\u62e9\u6b8b\u57fa\u6216\u7247\u6bb5\u3002'
      );
      el.classList.remove('active');
      return;
    }
    const start = state.selection.start;
    const end = state.selection.end;
    const n = end - start + 1;
    const snippet = state.seq.slice(start - 1, end);
    let text = tr('Selected ', '\u5df2\u9009\u62e9 ') +
      tr(n === 1 ? 'residue ' : 'residues ', '\u6b8b\u57fa ') +
      start + '\u2013' + end + tr(' (', '\uff08') + n + ' aa' + tr(')', '\uff09');
    if (snippet.length <= 40) text += ' \u00b7 ' + snippet;
    el.textContent = text;
    el.classList.add('active');
  }

  function setHover(pos) {
    if (pos === hoverPos) return;
    hoverPos = pos;
    if (!els.hoverInfo) return;
    if (pos === null) {
      els.hoverInfo.textContent = tr(
        'Hover over a residue to see its position.',
        '\u5c06\u9f20\u6807\u60ac\u505c\u5728\u6b8b\u57fa\u4e0a\u4ee5\u67e5\u770b\u5176\u4f4d\u7f6e\u3002'
      );
      return;
    }
    els.hoverInfo.textContent = tr('Residue ', '\u6b8b\u57fa ') + pos + ': ' + state.seq[pos - 1];
  }

  function positionInBlock(block, x, layout) {
    const maxCell = Math.max(0, block.end - block.start);
    let cell = Math.floor((x - layout.seqLeft) / CELL_W);
    cell = Math.max(0, Math.min(cell, maxCell));
    return block.start + cell;
  }

  function eventToPosition(e, allowClamp) {
    const layout = state.layout;
    if (!layout) return null;
    const rect = els.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = (e.clientX - rect.left) * (layout.width / rect.width);
    const y = (e.clientY - rect.top) * (layout.height / rect.height);

    if (!allowClamp) {
      for (const block of layout.blocks) {
        if (y >= block.seqTop && y <= block.seqTop + ROW_H &&
            x >= layout.seqLeft && x <= layout.seqLeft + layout.blockWidth) {
          return positionInBlock(block, x, layout);
        }
      }
      return null;
    }

    let best = null;
    let bestDist = Infinity;
    for (const block of layout.blocks) {
      const center = block.seqTop + ROW_H / 2;
      const d = Math.abs(y - center);
      if (d < bestDist) {
        bestDist = d;
        best = block;
      }
    }
    if (!best) return null;
    return positionInBlock(best, x, layout);
  }

  function onPointerDown(e) {
    if (!state.seq) return;
    if (e.button !== undefined && e.button !== 0) return;
    const pos = eventToPosition(e, false);
    if (pos === null) return;
    e.preventDefault();
    state.drag = { anchor: pos };
    state.selection = { start: pos, end: pos };
    updateSelectionUI();
    renderCanvas();
    try { els.canvas.setPointerCapture(e.pointerId); } catch (err) {}
  }

  function onPointerMove(e) {
    if (!state.drag) {
      setHover(eventToPosition(e, false));
      return;
    }
    const pos = eventToPosition(e, true);
    if (pos === null) return;
    const anchor = state.drag.anchor;
    state.selection = { start: Math.min(anchor, pos), end: Math.max(anchor, pos) };
    updateSelectionUI();
    scheduleRender();
  }

  function onPointerLeave() {
    if (!state.drag) setHover(null);
  }

  function onPointerUp(e) {
    if (!state.drag) return;
    state.drag = null;
    try { els.canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    updateSelectionUI();
    renderCanvas();
  }

  function refreshI18n() {
    if (typeof window.setLang === 'function') {
      window.setLang(document.documentElement.lang === 'zh-CN' ? 'zh' : 'en');
    }
  }

  function rebuildRows() {
    els.rowsContainer.innerHTML = '';
    els.emptyRows.style.display = state.annotations.length ? 'none' : 'block';

    state.annotations.forEach(function (ann) {
      const row = mk('div', 'ann-row' + (ann.visible === false ? ' hidden-row' : ''));
      row.dataset.id = ann.id;

      const top = mk('div', 'ann-row-top');

      const color = mk('input', 'ann-color', { type: 'color', title: tr('Color', '\u989c\u8272') });
      color.value = ann.color;
      color.addEventListener('input', function () {
        ann.color = color.value;
        scheduleRender();
      });
      top.appendChild(color);

      const label = mk('input', 'ann-label', {
        type: 'text',
        placeholder: 'Track label',
        title: tr('Track label', '\u6807\u6ce8\u540d\u79f0'),
        'data-i18n-placeholder': 'anno.track-label'
      });
      label.value = ann.label;
      label.addEventListener('input', function () {
        ann.label = label.value;
        scheduleRender();
      });
      top.appendChild(label);

      const vis = mk('button', 'icon-btn ann-visible' + (ann.visible === false ? ' off' : ''), {
        type: 'button',
        title: tr('Show / hide row', '\u663e\u793a / \u9690\u85cf\u8be5\u884c')
      });
      vis.textContent = ann.visible === false ? '\uD83D\uDEAB' : '\uD83D\uDC41';
      vis.addEventListener('click', function () {
        ann.visible = ann.visible === false;
        vis.textContent = ann.visible === false ? '\uD83D\uDEAB' : '\uD83D\uDC41';
        vis.classList.toggle('off', ann.visible === false);
        row.classList.toggle('hidden-row', ann.visible === false);
        renderCanvas();
      });
      top.appendChild(vis);

      const del = mk('button', 'icon-btn danger ann-delete', { type: 'button', title: tr('Delete row', '\u5220\u9664\u8be5\u884c') });
      del.textContent = '\uD83D\uDDD1';
      del.addEventListener('click', function () {
        const i = state.annotations.indexOf(ann);
        if (i >= 0) state.annotations.splice(i, 1);
        rebuildRows();
        renderCanvas();
      });
      top.appendChild(del);

      const bottom = mk('div', 'ann-row-bottom');

      const start = mk('input', 'ann-start', { type: 'number', min: '1', step: '1', title: tr('Start', '\u8d77\u70b9') });
      start.value = ann.start;
      start.max = String(state.seq.length);
      start.addEventListener('change', function () {
        let v = parseInt(start.value, 10);
        if (!Number.isFinite(v)) v = ann.start;
        v = Math.max(1, Math.min(v, ann.end, state.seq.length));
        ann.start = v;
        start.value = v;
        renderCanvas();
      });
      bottom.appendChild(start);

      bottom.appendChild(mk('span', 'range-sep', { text: '\u2013' }));

      const end = mk('input', 'ann-end', { type: 'number', min: '1', step: '1', title: tr('End', '\u7ec8\u70b9') });
      end.value = ann.end;
      end.max = String(state.seq.length);
      end.addEventListener('change', function () {
        let v = parseInt(end.value, 10);
        if (!Number.isFinite(v)) v = ann.end;
        v = Math.max(ann.start, Math.min(v, state.seq.length));
        ann.end = v;
        end.value = v;
        renderCanvas();
      });
      bottom.appendChild(end);

      const useSel = mk('button', 'icon-btn ann-use-sel', { type: 'button', title: tr('Use current selection', '\u4f7f\u7528\u5f53\u524d\u9009\u62e9') });
      useSel.textContent = '\u2316';
      useSel.addEventListener('click', function () {
        if (!state.selection) return;
        ann.start = state.selection.start;
        ann.end = state.selection.end;
        start.value = ann.start;
        end.value = ann.end;
        renderCanvas();
      });
      bottom.appendChild(useSel);

      const note = mk('input', 'ann-note', {
        type: 'text',
        placeholder: 'Text on bar (optional)',
        title: tr('Text on bar (optional)', '\u6761\u4e0a\u6587\u5b57\uff08\u53ef\u9009\uff09'),
        'data-i18n-placeholder': 'anno.note'
      });
      note.value = ann.note;
      note.addEventListener('input', function () {
        ann.note = note.value;
        scheduleRender();
      });
      bottom.appendChild(note);

      row.appendChild(top);
      row.appendChild(bottom);
      els.rowsContainer.appendChild(row);
    });

    refreshI18n();
  }

  function addRow() {
    if (!state.seq) return;
    const n = state.nextId++;
    const sel = state.selection;
    const ann = {
      id: n,
      label: tr('Annotation ', '\u6807\u6ce8 ') + n,
      start: sel ? sel.start : 1,
      end: sel ? sel.end : state.seq.length,
      color: PALETTE[(n - 1) % PALETTE.length],
      note: '',
      visible: true
    };
    state.annotations.push(ann);
    rebuildRows();
    renderCanvas();
    requestAnimationFrame(function () {
      const row = els.rowsContainer.querySelector('[data-id="' + ann.id + '"]');
      if (!row) return;
      row.scrollIntoView({ block: 'nearest' });
      const input = row.querySelector('.ann-label');
      if (input) {
        input.focus();
        input.select();
      }
    });
  }

  function renderSequence() {
    clearMessages();
    const raw = els.seqInput.value.trim();
    if (!raw) {
      showError('Please enter a sequence.');
      return;
    }

    const parsed = parseSequence(raw);
    if (!parsed.seq) {
      showError('No sequence could be parsed from the input.');
      return;
    }

    const invalid = [];
    for (let i = 0; i < parsed.seq.length; i++) {
      if (!/[A-Z*.-]/.test(parsed.seq[i])) invalid.push(parsed.seq[i]);
    }
    if (invalid.length) {
      const uniq = invalid.filter(function (ch, i) { return invalid.indexOf(ch) === i; });
      showError('Invalid characters found: ' + uniq.slice(0, 12).join(' ') + (uniq.length > 12 ? ' \u2026' : ''));
      return;
    }

    const warnings = [];
    if (parsed.multiple) warnings.push('Only the first sequence in the FASTA input is used.');
    if (parsed.seq.length > 5000) warnings.push('Long sequence \u2014 rendering may be slow.');
    if (warnings.length) showWarn(warnings.join(' '));

    state.name = els.nameInput.value.trim() || parsed.name || 'Sequence';
    state.seq = parsed.seq;
    state.annotations = [];
    state.selection = null;
    state.nextId = 1;
    state.drag = null;
    hoverPos = null;

    els.workspace.style.display = 'grid';
    rebuildRows();
    renderCanvas();
    updateSelectionUI();
    els.workspace.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function loadExample() {
    els.nameInput.value = 'Ubiquitin';
    els.seqInput.value = EXAMPLE_SEQ;
    renderSequence();
    state.annotations = EXAMPLE_ANNOTATIONS.map(function (a, i) {
      return {
        id: i + 1,
        label: a.label,
        start: a.start,
        end: a.end,
        color: a.color,
        note: a.note,
        visible: true
      };
    });
    state.nextId = state.annotations.length + 1;
    rebuildRows();
    renderCanvas();
    updateSelectionUI();
  }

  function clearAll() {
    els.seqInput.value = '';
    els.nameInput.value = '';
    clearMessages();
    state.name = '';
    state.seq = '';
    state.annotations = [];
    state.selection = null;
    state.nextId = 1;
    state.drag = null;
    state.layout = null;
    els.workspace.style.display = 'none';
    els.rowsContainer.innerHTML = '';
    els.emptyRows.style.display = 'block';
    els.selectionInfo.textContent = '';
    els.selectionInfo.classList.remove('active');
  }

  function savePNG() {
    if (!state.seq) return;
    const layout = computeLayout();
    const scale = Math.max(2, window.devicePixelRatio || 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(layout.width * scale);
    canvas.height = Math.round(layout.height * scale);
    const ctx = canvas.getContext('2d');
    drawFigure(ctx, layout, scale, false);
    canvas.toBlob(function (blob) {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (state.name || 'sequence').replace(/[\\/:*?"<>|\s]+/g, '_') + '_annotation.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }, 'image/png');
  }

  function clearSelection() {
    if (!state.selection) return;
    state.selection = null;
    updateSelectionUI();
    renderCanvas();
  }

  function syncDynamicText() {
    updateSelectionUI();
    updateFigureMeta();
    if (!state.seq || !els.hoverInfo) return;
    if (hoverPos === null) {
      els.hoverInfo.textContent = tr(
        'Hover over a residue to see its position.',
        '\u5c06\u9f20\u6807\u60ac\u505c\u5728\u6b8b\u57fa\u4e0a\u4ee5\u67e5\u770b\u5176\u4f4d\u7f6e\u3002'
      );
    } else {
      els.hoverInfo.textContent = tr('Residue ', '\u6b8b\u57fa ') + hoverPos + ': ' + state.seq[hoverPos - 1];
    }
  }

  if (typeof window.setLang === 'function') {
    const baseSetLang = window.setLang;
    window.setLang = function (lang) {
      baseSetLang(lang);
      syncDynamicText();
    };
  }

  els.renderBtn.addEventListener('click', renderSequence);
  els.exampleBtn.addEventListener('click', loadExample);
  els.clearBtn.addEventListener('click', clearAll);
  els.addRowBtn.addEventListener('click', addRow);
  els.clearSelectionBtn.addEventListener('click', clearSelection);
  els.saveBtn.addEventListener('click', savePNG);
  els.canvas.addEventListener('pointerdown', onPointerDown);
  els.canvas.addEventListener('pointermove', onPointerMove);
  els.canvas.addEventListener('pointerup', onPointerUp);
  els.canvas.addEventListener('pointercancel', onPointerUp);
  els.canvas.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') clearSelection();
  });
}());
