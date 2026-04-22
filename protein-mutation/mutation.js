
(function () {
  'use strict';

  /* ── Constants ──────────────────────────────────────────── */
  const AA_ONE = [
    ['A','Ala'],['C','Cys'],['D','Asp'],['E','Glu'],['F','Phe'],
    ['G','Gly'],['H','His'],['I','Ile'],['K','Lys'],['L','Leu'],
    ['M','Met'],['N','Asn'],['P','Pro'],['Q','Gln'],['R','Arg'],
    ['S','Ser'],['T','Thr'],['V','Val'],['W','Trp'],['Y','Tyr']
  ];
  const VALID_AA = new Set(AA_ONE.map(([c]) => c));

  const EXAMPLE_FASTA = `>SpCas9_fragment
MDKKYSIGLDIGTNSVGWAVITDEYKVPSKKFKVLGNTDRHSIKKNLIGALLFDSGETAEATRLKRTARRRYTRRKNRICYLQEIFSNEMAKVDDSFFHRLEESFLVEEDKKHERHPIFGNIVDEVAYHEKYPTIYHLRKKLVDSTDKADLRLIYLALAHMIKFRGHFLIEGDLNPDNSDVDKLFIQLVNTLLKQKDTGAFYFLKELGLNLERIIESQLVEEPKKHRAVDLGTLVEKLGIPYQISQNLLDQTLKKLNDLHPQGLAFEQKFNHVFNQKLSSFQPERKPFKDLPQPWFFFQQVQKLKQFKKPKK`;

  /* ── State ───────────────────────────────────────────────── */
  // sequences[i] = { name: string, original: string[], current: string[] }
  let sequences = [];
  let popupTarget = null; // { seqIdx, resIdx }

  /* ── DOM refs ────────────────────────────────────────────── */
  const seqInput      = document.getElementById('seq-input');
  const runBtn        = document.getElementById('run-btn');
  const exampleBtn    = document.getElementById('example-btn');
  const errorBox      = document.getElementById('error-box');
  const editorSection = document.getElementById('editor-section');
  const seqDisplay    = document.getElementById('seq-display');
  const resultsSection= document.getElementById('results-section');
  const fastaOutput   = document.getElementById('fasta-output');
  const mutSummary    = document.getElementById('mut-summary');
  const copyBtn       = document.getElementById('copy-btn');
  const downloadBtn   = document.getElementById('download-btn');
  const resetBtn      = document.getElementById('reset-btn');
  const aaPopup       = document.getElementById('aa-popup');
  const aaGrid        = document.getElementById('aa-grid');
  const popupResLabel = document.getElementById('popup-res-label');
  const popupClose    = document.getElementById('popup-close');
  const tabBtns       = document.querySelectorAll('.tab-btn');
  const tabPanels     = document.querySelectorAll('.tab-panel');
  const seqSelect     = document.getElementById('seq-select');
  const mutationText  = document.getElementById('mutation-text');
  const applyTextBtn  = document.getElementById('apply-text-btn');

  /* ── FASTA parsing ───────────────────────────────────────── */
  function parseFasta(raw) {
    const lines = raw.trim().split(/\r?\n/);
    const result = [];
    let cur = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('>')) {
        if (cur) result.push(cur);
        cur = { name: trimmed.slice(1).trim() || 'Sequence', seq: '' };
      } else {
        if (!cur) cur = { name: 'Sequence', seq: '' };
        cur.seq += trimmed.replace(/\s+/g, '').toUpperCase();
      }
    }
    if (cur) result.push(cur);
    return result;
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
  }
  function clearError() {
    errorBox.style.display = 'none';
    errorBox.textContent = '';
  }

  /* ── Load sequences ──────────────────────────────────────── */
  runBtn.addEventListener('click', () => {
    clearError();
    const raw = seqInput.value.trim();
    if (!raw) { showError('Please enter at least one sequence.'); return; }

    const parsed = parseFasta(raw);
    if (!parsed.length) { showError('Could not parse any sequences from the input.'); return; }

    const invalid = [];
    for (const { name, seq } of parsed) {
      for (let i = 0; i < seq.length; i++) {
        if (!VALID_AA.has(seq[i])) invalid.push(`Sequence "${name}", position ${i + 1}: unknown amino acid "${seq[i]}"`);
      }
    }
    if (invalid.length) {
      showError('Invalid characters found:\n' + invalid.slice(0, 5).join('\n') + (invalid.length > 5 ? `\n…and ${invalid.length - 5} more` : ''));
      return;
    }

    sequences = parsed.map(({ name, seq }) => ({
      name,
      original: seq.split(''),
      current:  seq.split('')
    }));

    buildSeqSelect();
    renderDisplay();
    renderResults();

    editorSection.style.display = 'block';
    resultsSection.style.display = 'block';
    editorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  exampleBtn.addEventListener('click', () => {
    seqInput.value = EXAMPLE_FASTA;
  });

  /* ── Build seq select ────────────────────────────────────── */
  function buildSeqSelect() {
    seqSelect.innerHTML = '';
    sequences.forEach(({ name }, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = name;
      seqSelect.appendChild(opt);
    });
  }

  /* ── Render interactive display ──────────────────────────── */
  function renderDisplay() {
    seqDisplay.innerHTML = '';
    sequences.forEach((seq, si) => {
      const block = document.createElement('div');
      block.className = 'seq-block';

      const nameEl = document.createElement('div');
      nameEl.className = 'seq-name';
      nameEl.textContent = '>' + seq.name;
      block.appendChild(nameEl);

      // Build residues in chunks with ruler ticks
      const CHUNK = 50;
      const total = seq.current.length;
      for (let start = 0; start < total; start += CHUNK) {
        const end = Math.min(start + CHUNK, total);

        // Ruler row — one span per residue, same width as .res (18px); show number at pos 1 and every 10th
        const ruler = document.createElement('div');
        ruler.className = 'ruler';
        for (let i = start; i < end; i++) {
          const tick = document.createElement('span');
          tick.className = 'ruler-tick';
          const pos = i + 1;
          tick.textContent = (pos === 1 || pos % 10 === 0) ? String(pos) : '';
          ruler.appendChild(tick);
        }

        // Residue row
        const resRow = document.createElement('div');
        resRow.className = 'seq-residues';
        resRow.style.marginBottom = '6px';

        for (let i = start; i < end; i++) {
          const span = document.createElement('span');
          span.className = 'res ' + (seq.current[i] !== seq.original[i] ? 'mutated' : 'normal');
          span.textContent = seq.current[i];
          span.title = `${seq.original[i]}${i + 1}${seq.current[i] !== seq.original[i] ? ' → ' + seq.current[i] : ''}`;
          span.dataset.si = si;
          span.dataset.ri = i;
          span.addEventListener('click', onResidueClick);
          resRow.appendChild(span);
        }

        block.appendChild(ruler);
        block.appendChild(resRow);
      }

      seqDisplay.appendChild(block);
    });
  }

  /* ── Popup ───────────────────────────────────────────────── */
  function onResidueClick(e) {
    e.stopPropagation();
    const si = +e.currentTarget.dataset.si;
    const ri = +e.currentTarget.dataset.ri;
    popupTarget = { si, ri };

    const origAA = sequences[si].original[ri];
    const curAA  = sequences[si].current[ri];
    popupResLabel.textContent = `${origAA}${ri + 1} (in ${sequences[si].name})`;

    // Build AA grid
    aaGrid.innerHTML = '';
    AA_ONE.forEach(([code, name]) => {
      const btn = document.createElement('button');
      btn.className = 'aa-btn' + (code === curAA ? ' same' : '');
      btn.textContent = code;
      btn.title = `${code} — ${name}`;
      btn.addEventListener('click', () => applyMutation(si, ri, code));
      aaGrid.appendChild(btn);
    });

    // Position popup near the clicked residue (document-relative for position:absolute)
    const rect = e.currentTarget.getBoundingClientRect();
    const popupW = 230;
    const popupH = 220;
    let left = rect.left + window.scrollX;
    let top  = rect.bottom + window.scrollY + 6;

    if (left + popupW > window.scrollX + window.innerWidth - 8) left = window.scrollX + window.innerWidth - popupW - 8;
    if (top + popupH > window.scrollY + window.innerHeight - 8) top = rect.top + window.scrollY - popupH - 6;

    aaPopup.style.left = left + 'px';
    aaPopup.style.top  = top + 'px';
    aaPopup.classList.add('visible');
  }

  function closePopup() {
    aaPopup.classList.remove('visible');
    popupTarget = null;
  }

  popupClose.addEventListener('click', closePopup);
  document.addEventListener('click', (e) => {
    if (!aaPopup.contains(e.target)) closePopup();
  });

  function applyMutation(si, ri, newAA) {
    sequences[si].current[ri] = newAA;
    closePopup();
    renderDisplay();
    renderResults();
  }

  /* ── Text-mode mutations ─────────────────────────────────── */
  applyTextBtn.addEventListener('click', () => {
    clearError();
    const si = +seqSelect.value;
    const raw = mutationText.value.trim();
    if (!raw) { showError('Please enter at least one mutation.'); return; }

    const tokens = raw.split(',').map(s => s.trim()).filter(Boolean);
    // Pattern: optional origAA, digits, newAA  e.g. A20N or 20N or A20 (latter not useful)
    const pat = /^([A-Za-z]?)(\d+)([A-Za-z])$/;
    const mutations = [];
    for (const tok of tokens) {
      const m = pat.exec(tok);
      if (!m) { showError(`Cannot parse mutation "${tok}". Expected format: [OrigAA]Position[NewAA], e.g. A20N`); return; }
      const origChar = m[1].toUpperCase();
      const pos      = parseInt(m[2], 10);
      const newChar  = m[3].toUpperCase();

      if (origChar && !VALID_AA.has(origChar)) { showError(`Unknown amino acid "${origChar}" in mutation "${tok}".`); return; }
      if (!VALID_AA.has(newChar)) { showError(`Unknown amino acid "${newChar}" in mutation "${tok}".`); return; }
      if (pos < 1 || pos > sequences[si].original.length) {
        showError(`Position ${pos} is out of range for sequence "${sequences[si].name}" (length ${sequences[si].original.length}).`);
        return;
      }

      const ri = pos - 1;
      if (origChar && sequences[si].original[ri] !== origChar) {
        showError(`Mutation "${tok}": expected ${origChar} at position ${pos}, but found ${sequences[si].original[ri]}.`);
        return;
      }

      mutations.push({ ri, newChar });
    }

    mutations.forEach(({ ri, newChar }) => { sequences[si].current[ri] = newChar; });
    mutationText.value = '';
    renderDisplay();
    renderResults();
  });

  /* ── Reset ───────────────────────────────────────────────── */
  resetBtn.addEventListener('click', () => {
    sequences.forEach(seq => { seq.current = [...seq.original]; });
    renderDisplay();
    renderResults();
  });

  /* ── Tabs ────────────────────────────────────────────────── */
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  /* ── Results ─────────────────────────────────────────────── */
  function buildFasta() {
    return sequences.map(seq => {
      const seqStr = seq.current.join('');
      const lines = [];
      for (let i = 0; i < seqStr.length; i += 60) lines.push(seqStr.slice(i, i + 60));
      return '>' + seq.name + '\n' + lines.join('\n');
    }).join('\n\n');
  }

  function renderResults() {
    // Mutation summary
    const chips = [];
    sequences.forEach(seq => {
      seq.original.forEach((origAA, i) => {
        if (seq.current[i] !== origAA) {
          chips.push(`${origAA}${i + 1}${seq.current[i]}`);
        }
      });
    });

    mutSummary.innerHTML = '';
    if (chips.length === 0) {
      const none = document.createElement('span');
      none.className = 'mut-chip-none';
      none.textContent = 'No mutations applied yet.';
      mutSummary.appendChild(none);
    } else {
      chips.forEach(label => {
        const chip = document.createElement('span');
        chip.className = 'mut-chip';
        chip.textContent = label;
        mutSummary.appendChild(chip);
      });
    }

    fastaOutput.textContent = buildFasta();
  }

  /* ── Copy / Download ─────────────────────────────────────── */
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(buildFasta()).then(() => {
      const orig = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = orig; }, 1500);
    });
  });

  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([buildFasta()], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'mutated_sequences.fasta';
    a.click();
    URL.revokeObjectURL(url);
  });

})();
