
/* ================================================================
   IMMUNUM INTEGRATION
   Uses the immunum WASM package for CDR annotation.
   initImmun() and ImmunumAnnotator are provided by immunum-browser.js
================================================================ */

/* ----------------------------------------------------------------
   WASM initialisation — called once on page load
---------------------------------------------------------------- */
let _immunumReady = false;

(async () => {
  try {
    await initImmun('immunum_bg.wasm');
    _immunumReady = true;
    const btn = document.getElementById('run-btn');
    btn.disabled = false;
    btn.textContent = '⚡ Annotate CDRs';
  } catch (e) {
    document.getElementById('run-btn').textContent = '❌ Failed to load';
    showError('Failed to load the immunum WASM module: ' + e.message);
  }
})();

/* ================================================================
   SEQUENCE PARSING
================================================================ */
function parseSeq(raw) {
  return raw.split('\n')
    .filter(l => !l.trimStart().startsWith('>'))
    .join('')
    .toUpperCase()
    .replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
}

/* ================================================================
   ANNOTATION — delegates to immunum
   Returns { residues, chainType, confidence, scheme }
   residues: [{ aa, pos, region }]
================================================================ */
function annotate(seq, chainHint, scheme) {
  // Map UI chain hint to immunum chain codes
  let chains;
  if      (chainHint === 'VH')   chains = ['H'];
  else if (chainHint === 'VK')   chains = ['K'];
  else if (chainHint === 'VL')   chains = ['L'];
  else                           chains = ['H', 'K', 'L']; // auto

  const schemeStr = scheme.toLowerCase(); // 'kabat' or 'imgt'

  const annotator = new ImmunumAnnotator(chains, schemeStr);
  try {
    const numResult  = annotator.number(seq);
    const segResult  = annotator.segment(seq);

    if (numResult.error || !numResult.numbering) return null;
    if (segResult.error) return null;

    const { chain, confidence, numbering, query_start } = numResult;
    const { prefix='', fr1='', cdr1='', fr2='', cdr2='',
            fr3='', cdr3='', fr4='', postfix='' } = segResult;

    // Build per-residue region array from segmentation
    const regionArr = [];
    for (const [region, s] of [
      ['unknown', prefix],  ['FR1', fr1],   ['CDR1', cdr1],
      ['FR2', fr2],         ['CDR2', cdr2], ['FR3', fr3],
      ['CDR3', cdr3],       ['FR4', fr4],   ['unknown', postfix]
    ]) {
      for (const _aa of s) regionArr.push(region);
    }

    // Build per-residue position labels from the ordered numbering Map
    const posLabels = new Array(seq.length).fill(null);
    let idx = query_start;
    for (const [pos] of numbering.entries()) {
      if (idx < seq.length) posLabels[idx] = pos;
      idx++;
    }

    const residues = Array.from(seq, (aa, i) => ({
      aa,
      pos:    posLabels[i],
      region: regionArr[i] || 'unknown'
    }));

    const chainMap = { H: 'VH', K: 'VK', L: 'VL' };
    return { residues, chainType: chainMap[chain] || chain, confidence, scheme };
  } finally {
    annotator.free();
  }
}

/* ================================================================
   REGION CLASS HELPER
================================================================ */
function regionClass(region) {
  if (region === 'CDR1') return 'cdr1';
  if (region === 'CDR2') return 'cdr2';
  if (region === 'CDR3') return 'cdr3';
  if (region === 'FR1' || region === 'FR2' || region === 'FR3' || region === 'FR4') return 'fr';
  return 'unk';
}

/* ================================================================
   RENDERING — Annotated Sequence
================================================================ */
function renderAnnotated(res) {
  const html = res.residues.map(r => {
    const cls = regionClass(r.region);
    const tip = r.pos ? `${r.pos} · ${r.region}` : r.region;
    return `<span class="res ${cls}" data-tip="${tip}">${r.aa}</span>`;
  }).join('');
  document.getElementById('seq-display').innerHTML = html;
}

/* ================================================================
   RENDERING — CDR Table
================================================================ */
function renderCDRTable(res) {
  const { residues, chainType, scheme } = res;
  const cdrs = [
    { name: 'CDR1', cls: 'c1', seq: '', start: null, end: null },
    { name: 'CDR2', cls: 'c2', seq: '', start: null, end: null },
    { name: 'CDR3', cls: 'c3', seq: '', start: null, end: null }
  ];
  let queryPos = 1;
  for (const r of residues) {
    for (const cdr of cdrs) {
      if (r.region === cdr.name) {
        cdr.seq += r.aa;
        if (cdr.start === null) cdr.start = queryPos;
        cdr.end = queryPos;
      }
    }
    queryPos++;
  }

  let html = `<thead><tr>
    <th>CDR</th><th>Sequence</th><th>Length</th>
    <th>Query position (1-based)</th><th>Scheme</th>
  </tr></thead><tbody>`;
  cdrs.forEach(cdr => {
    const pos = cdr.start != null ? `${cdr.start}–${cdr.end}` : '—';
    const seq = cdr.seq || '—';
    html += `<tr>
      <td><strong>${cdr.name}</strong></td>
      <td><span class="cdr-seq ${cdr.cls}">${seq}</span></td>
      <td>${cdr.seq.length || 0}</td>
      <td><span class="pos-badge">${pos}</span></td>
      <td><span class="pos-badge">${scheme}</span></td>
    </tr>`;
  });
  html += '</tbody>';
  document.getElementById('cdr-table').innerHTML = html;
}

/* ================================================================
   RENDERING — Numbered Alignment View
   Each column width = max(3, length of position label).
   All three rows (position / residue / region) use the same width
   per column so they stay aligned even for insertion codes like 100A.
================================================================ */
function renderNumbered(res) {
  const { residues } = res;
  const COLS = 30;

  function regionAbbr(region) {
    if (region === 'CDR1') return 'C1';
    if (region === 'CDR2') return 'C2';
    if (region === 'CDR3') return 'C3';
    if (region.startsWith('FR')) return region; // FR1..FR4 (3 chars)
    return '?';
  }

  let html = '';
  for (let start = 0; start < residues.length; start += COLS) {
    const chunk = residues.slice(start, start + COLS);

    // Per-column widths: fit position label, minimum 3
    const widths = chunk.map(r => Math.max(3, (r.pos ?? '?').length));

    // Position row (plain text)
    let posRow = '';
    for (let i = 0; i < chunk.length; i++) {
      posRow += (chunk[i].pos ?? '?').padStart(widths[i]);
    }

    // Sequence row (colored spans)
    let seqRow = '';
    for (let i = 0; i < chunk.length; i++) {
      const r   = chunk[i];
      const cls = regionClass(r.region);
      seqRow += `<span class="nk ${cls}">${r.aa.padStart(widths[i])}</span>`;
    }

    // Region row (plain text)
    let regRow = '';
    for (let i = 0; i < chunk.length; i++) {
      regRow += regionAbbr(chunk[i].region).padStart(widths[i]);
    }

    html += `<div class="num-block">
      <div class="num-pos-row">${posRow}</div>
      <div class="num-seq-row">${seqRow}</div>
      <div class="num-reg-row">${regRow}</div>
    </div>`;
  }
  document.getElementById('num-display').innerHTML = html;
}

/* ================================================================
   RENDERING — Info bar
================================================================ */
function renderInfoBar(res) {
  const { residues, chainType, confidence, scheme } = res;
  const cdr1 = residues.filter(r => r.region === 'CDR1').map(r => r.aa).join('');
  const cdr2 = residues.filter(r => r.region === 'CDR2').map(r => r.aa).join('');
  const cdr3 = residues.filter(r => r.region === 'CDR3').map(r => r.aa).join('');
  const confPct = confidence != null ? (confidence * 100).toFixed(1) + '%' : '—';

  document.getElementById('info-bar').innerHTML = `
    <span class="info-chip">Chain: <strong>${chainType}</strong></span>
    <span class="info-chip">Scheme: <strong>${scheme}</strong></span>
    <span class="info-chip">Confidence: <strong>${confPct}</strong></span>
    <span class="info-chip cdr1">CDR1: <strong>${cdr1 || '—'}</strong> (${cdr1.length} aa)</span>
    <span class="info-chip cdr2">CDR2: <strong>${cdr2 || '—'}</strong> (${cdr2.length} aa)</span>
    <span class="info-chip cdr3">CDR3: <strong>${cdr3 || '—'}</strong> (${cdr3.length} aa)</span>
  `;
}

/* ================================================================
   EXPORT HELPERS
================================================================ */
let _lastResult = null;

function copyFASTA() {
  if (!_lastResult) return;
  const { residues, chainType, scheme } = _lastResult;
  const cdrs = ['CDR1','CDR2','CDR3'];
  let text = '';
  for (const name of cdrs) {
    const seq = residues.filter(r => r.region === name).map(r => r.aa).join('');
    if (seq) text += `>${chainType}_${name}_${scheme}\n${seq}\n`;
  }
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); // eslint-disable-line -- deprecated but widely supported fallback
    document.body.removeChild(ta);
  });
}

function downloadTSV() {
  if (!_lastResult) return;
  const { residues, chainType, scheme } = _lastResult;
  let tsv = `# Antibody CDR Annotator | Scheme: ${scheme} | Chain: ${chainType}\n`;
  tsv += 'QueryPos\tAA\tPos\tRegion\n';
  residues.forEach((r, i) => {
    tsv += `${i+1}\t${r.aa}\t${r.pos ?? ''}\t${r.region}\n`;
  });
  const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cdr_annotation_${scheme}.tsv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ================================================================
   UI HANDLERS
================================================================ */
function showError(msg) {
  const box = document.getElementById('error-box');
  box.textContent = msg;
  box.style.display = 'block';
}
function clearError() {
  document.getElementById('error-box').style.display = 'none';
}

function showTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
}

function runAnnotation() {
  if (!_immunumReady) { showError('Annotation engine is still loading. Please wait a moment.'); return; }
  clearError();
  const raw = document.getElementById('seq-input').value.trim();
  if (!raw) { showError('Please paste a sequence.'); return; }

  const seq = parseSeq(raw);
  if (seq.length < 50) {
    showError('Sequence too short (< 50 amino acids). Please provide a complete VH or VL variable domain.');
    return;
  }
  if (seq.length > 600) {
    showError('Sequence too long (> 600 amino acids). Please provide a single variable domain.');
    return;
  }

  const chainHint = document.querySelector('input[name=chain]:checked').value;
  const scheme = document.getElementById('scheme-select').value;

  let res;
  try {
    res = annotate(seq, chainHint, scheme);
  } catch (e) {
    showError('Annotation failed: ' + e.message);
    return;
  }
  if (!res) {
    showError('Alignment failed — the sequence could not be numbered. Check it is a valid antibody variable domain.');
    return;
  }

  _lastResult = res;

  // Warnings
  const warnArea = document.getElementById('warning-area');
  const warns = [];
  const fr4Count = res.residues.filter(r => r.region === 'FR4').length;
  if (fr4Count === 0) warns.push('FR4 (J-gene) region not found — the sequence may be truncated before FR4.');
  if (res.residues.filter(r => r.region === 'CDR3').length === 0) warns.push('No CDR3 residues identified. The sequence may end before the CDR3.');
  if (res.confidence != null && res.confidence < 0.7) warns.push(`Low alignment confidence (${(res.confidence*100).toFixed(1)}%) — results may be inaccurate for this sequence.`);
  if (chainHint === 'auto') warns.push(`Chain auto-detected as <strong>${res.chainType}</strong>.`);
  warnArea.innerHTML = warns.map(w => `<div class="warning-box">⚠️ ${w}</div>`).join('');

  renderInfoBar(res);
  renderAnnotated(res);
  renderCDRTable(res);
  renderNumbered(res);

  document.getElementById('results-section').style.display = 'block';
  document.getElementById('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function loadExample() {
  document.getElementById('seq-input').value =
`>Trastuzumab_VH (IGHV3-66/IGHV3-23 family)
EVQLVESGGGLVQPGGSLRLSCAASGFNIKDTYIHWVRQAPGKGLEWVARIYPTNGYTRYADSVKGRFTIS
ADTSKNTAYLQMNSLRAEDTAVYYCSRWGGDGFYAMDYWGQGTLVTVSS`;
  document.querySelector('input[name=chain][value=auto]').checked = true;
  document.getElementById('scheme-select').value = 'Kabat';
}
