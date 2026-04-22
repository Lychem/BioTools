
/* ================================================================
   SUBSTITUTION MATRICES
================================================================ */

const BLOSUM62 = {
  A:{A:4,  R:-1, N:-2, D:-2, C:0,  Q:-1, E:-1, G:0,  H:-2, I:-1, L:-1, K:-1, M:-1, F:-2, P:-1, S:1,  T:0,  W:-3, Y:-2, V:0 },
  R:{A:-1, R:5,  N:0,  D:-2, C:-3, Q:1,  E:0,  G:-2, H:0,  I:-3, L:-2, K:2,  M:-1, F:-3, P:-2, S:-1, T:-1, W:-3, Y:-2, V:-3},
  N:{A:-2, R:0,  N:6,  D:1,  C:-3, Q:0,  E:0,  G:0,  H:1,  I:-3, L:-3, K:0,  M:-2, F:-3, P:-2, S:1,  T:0,  W:-4, Y:-2, V:-3},
  D:{A:-2, R:-2, N:1,  D:6,  C:-3, Q:0,  E:2,  G:-1, H:-1, I:-3, L:-4, K:-1, M:-3, F:-3, P:-1, S:0,  T:-1, W:-4, Y:-3, V:-3},
  C:{A:0,  R:-3, N:-3, D:-3, C:9,  Q:-3, E:-4, G:-3, H:-3, I:-1, L:-1, K:-3, M:-1, F:-2, P:-3, S:-1, T:-1, W:-2, Y:-2, V:-1},
  Q:{A:-1, R:1,  N:0,  D:0,  C:-3, Q:5,  E:2,  G:-2, H:0,  I:-3, L:-2, K:1,  M:0,  F:-3, P:-1, S:0,  T:-1, W:-2, Y:-1, V:-2},
  E:{A:-1, R:0,  N:0,  D:2,  C:-4, Q:2,  E:5,  G:-2, H:0,  I:-3, L:-3, K:1,  M:-2, F:-3, P:-1, S:0,  T:-1, W:-3, Y:-2, V:-2},
  G:{A:0,  R:-2, N:0,  D:-1, C:-3, Q:-2, E:-2, G:6,  H:-2, I:-4, L:-4, K:-2, M:-3, F:-3, P:-2, S:0,  T:-2, W:-2, Y:-3, V:-3},
  H:{A:-2, R:0,  N:1,  D:-1, C:-3, Q:0,  E:0,  G:-2, H:8,  I:-3, L:-3, K:-1, M:-2, F:-1, P:-2, S:-1, T:-2, W:-2, Y:2,  V:-3},
  I:{A:-1, R:-3, N:-3, D:-3, C:-1, Q:-3, E:-3, G:-4, H:-3, I:4,  L:2,  K:-3, M:1,  F:0,  P:-3, S:-2, T:-1, W:-3, Y:-1, V:3 },
  L:{A:-1, R:-2, N:-3, D:-4, C:-1, Q:-2, E:-3, G:-4, H:-3, I:2,  L:4,  K:-2, M:2,  F:0,  P:-3, S:-2, T:-1, W:-2, Y:-1, V:1 },
  K:{A:-1, R:2,  N:0,  D:-1, C:-3, Q:1,  E:1,  G:-2, H:-1, I:-3, L:-2, K:5,  M:-1, F:-3, P:-1, S:0,  T:-1, W:-3, Y:-2, V:-2},
  M:{A:-1, R:-1, N:-2, D:-3, C:-1, Q:0,  E:-2, G:-3, H:-2, I:1,  L:2,  K:-1, M:5,  F:0,  P:-2, S:-1, T:-1, W:-1, Y:-1, V:1 },
  F:{A:-2, R:-3, N:-3, D:-3, C:-2, Q:-3, E:-3, G:-3, H:-1, I:0,  L:0,  K:-3, M:0,  F:6,  P:-4, S:-2, T:-2, W:1,  Y:3,  V:-1},
  P:{A:-1, R:-2, N:-2, D:-1, C:-3, Q:-1, E:-1, G:-2, H:-2, I:-3, L:-3, K:-1, M:-2, F:-4, P:7,  S:-1, T:-1, W:-4, Y:-3, V:-2},
  S:{A:1,  R:-1, N:1,  D:0,  C:-1, Q:0,  E:0,  G:0,  H:-1, I:-2, L:-2, K:0,  M:-1, F:-2, P:-1, S:4,  T:1,  W:-3, Y:-2, V:-2},
  T:{A:0,  R:-1, N:0,  D:-1, C:-1, Q:-1, E:-1, G:-2, H:-2, I:-1, L:-1, K:-1, M:-1, F:-2, P:-1, S:1,  T:5,  W:-2, Y:-2, V:0 },
  W:{A:-3, R:-3, N:-4, D:-4, C:-2, Q:-2, E:-3, G:-2, H:-2, I:-3, L:-2, K:-3, M:-1, F:1,  P:-4, S:-3, T:-2, W:11, Y:2,  V:-3},
  Y:{A:-2, R:-2, N:-2, D:-3, C:-2, Q:-1, E:-2, G:-3, H:2,  I:-1, L:-1, K:-2, M:-1, F:3,  P:-3, S:-2, T:-2, W:2,  Y:7,  V:-1},
  V:{A:0,  R:-3, N:-3, D:-3, C:-1, Q:-2, E:-2, G:-3, H:-3, I:3,  L:1,  K:-2, M:1,  F:-1, P:-2, S:-2, T:0,  W:-3, Y:-1, V:4 }
};

const PAM250 = {
  A:{A:2,  R:-2, N:0,  D:0,  C:-2, Q:0,  E:0,  G:1,  H:-1, I:-1, L:-2, K:-1, M:-1, F:-3, P:1,  S:1,  T:1,  W:-6, Y:-3, V:0 },
  R:{A:-2, R:6,  N:0,  D:-1, C:-4, Q:1,  E:-1, G:-3, H:2,  I:-2, L:-3, K:3,  M:0,  F:-4, P:0,  S:0,  T:-1, W:2,  Y:-4, V:-2},
  N:{A:0,  R:0,  N:2,  D:2,  C:-4, Q:1,  E:1,  G:0,  H:2,  I:-2, L:-3, K:1,  M:-2, F:-3, P:0,  S:1,  T:0,  W:-4, Y:-2, V:-2},
  D:{A:0,  R:-1, N:2,  D:4,  C:-5, Q:2,  E:3,  G:1,  H:1,  I:-2, L:-4, K:0,  M:-3, F:-6, P:-1, S:0,  T:0,  W:-7, Y:-4, V:-2},
  C:{A:-2, R:-4, N:-4, D:-5, C:12, Q:-5, E:-5, G:-3, H:-3, I:-2, L:-6, K:-5, M:-5, F:-4, P:-3, S:0,  T:-2, W:-8, Y:0,  V:-2},
  Q:{A:0,  R:1,  N:1,  D:2,  C:-5, Q:4,  E:2,  G:-1, H:3,  I:-2, L:-2, K:1,  M:-1, F:-5, P:0,  S:-1, T:-1, W:-5, Y:-4, V:-2},
  E:{A:0,  R:-1, N:1,  D:3,  C:-5, Q:2,  E:4,  G:0,  H:1,  I:-2, L:-3, K:0,  M:-2, F:-5, P:-1, S:0,  T:0,  W:-7, Y:-4, V:-2},
  G:{A:1,  R:-3, N:0,  D:1,  C:-3, Q:-1, E:0,  G:5,  H:-2, I:-3, L:-4, K:-2, M:-3, F:-5, P:0,  S:1,  T:0,  W:-7, Y:-5, V:-1},
  H:{A:-1, R:2,  N:2,  D:1,  C:-3, Q:3,  E:1,  G:-2, H:6,  I:-2, L:-2, K:0,  M:-2, F:-2, P:0,  S:-1, T:-1, W:-3, Y:0,  V:-2},
  I:{A:-1, R:-2, N:-2, D:-2, C:-2, Q:-2, E:-2, G:-3, H:-2, I:5,  L:2,  K:-2, M:2,  F:1,  P:-2, S:-1, T:0,  W:-5, Y:-1, V:4 },
  L:{A:-2, R:-3, N:-3, D:-4, C:-6, Q:-2, E:-3, G:-4, H:-2, I:2,  L:6,  K:-3, M:4,  F:2,  P:-3, S:-3, T:-2, W:-2, Y:-1, V:2 },
  K:{A:-1, R:3,  N:1,  D:0,  C:-5, Q:1,  E:0,  G:-2, H:0,  I:-2, L:-3, K:5,  M:0,  F:-5, P:-1, S:0,  T:0,  W:-3, Y:-4, V:-2},
  M:{A:-1, R:0,  N:-2, D:-3, C:-5, Q:-1, E:-2, G:-3, H:-2, I:2,  L:4,  K:0,  M:6,  F:0,  P:-2, S:-2, T:-1, W:-4, Y:-2, V:2 },
  F:{A:-3, R:-4, N:-3, D:-6, C:-4, Q:-5, E:-5, G:-5, H:-2, I:1,  L:2,  K:-5, M:0,  F:9,  P:-5, S:-3, T:-3, W:0,  Y:7,  V:-1},
  P:{A:1,  R:0,  N:0,  D:-1, C:-3, Q:0,  E:-1, G:0,  H:0,  I:-2, L:-3, K:-1, M:-2, F:-5, P:6,  S:1,  T:0,  W:-6, Y:-5, V:-1},
  S:{A:1,  R:0,  N:1,  D:0,  C:0,  Q:-1, E:0,  G:1,  H:-1, I:-1, L:-3, K:0,  M:-2, F:-3, P:1,  S:2,  T:1,  W:-2, Y:-3, V:-1},
  T:{A:1,  R:-1, N:0,  D:0,  C:-2, Q:-1, E:0,  G:0,  H:-1, I:0,  L:-2, K:0,  M:-1, F:-3, P:0,  S:1,  T:3,  W:-5, Y:-3, V:0 },
  W:{A:-6, R:2,  N:-4, D:-7, C:-8, Q:-5, E:-7, G:-7, H:-3, I:-5, L:-2, K:-3, M:-4, F:0,  P:-6, S:-2, T:-5, W:17, Y:0,  V:-6},
  Y:{A:-3, R:-4, N:-2, D:-4, C:0,  Q:-4, E:-4, G:-5, H:0,  I:-1, L:-1, K:-4, M:-2, F:7,  P:-5, S:-3, T:-3, W:0,  Y:10, V:-2},
  V:{A:0,  R:-2, N:-2, D:-2, C:-2, Q:-2, E:-2, G:-1, H:-2, I:4,  L:2,  K:-2, M:2,  F:-1, P:-1, S:-1, T:0,  W:-6, Y:-2, V:4 }
};

/* ================================================================
   SEQUENCE PARSING
================================================================ */
function parseSequence(raw) {
  const lines = raw.split('\n');
  const seqLines = lines.filter(l => !l.trimStart().startsWith('>'));
  return seqLines.join('').toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
}

/* ================================================================
   SUBSTITUTION SCORE LOOKUP
================================================================ */
function getSub(a, b, matName, matchScore, mismatchScore) {
  if (matName === 'simple') return a === b ? matchScore : mismatchScore;
  const mat = matName === 'blosum62' ? BLOSUM62 : PAM250;
  if (mat[a] && mat[a][b] !== undefined) return mat[a][b];
  if (mat[b] && mat[b][a] !== undefined) return mat[b][a];
  return 0;
}

function blosum62Score(a, b) {
  if (BLOSUM62[a] && BLOSUM62[a][b] !== undefined) return BLOSUM62[a][b];
  if (BLOSUM62[b] && BLOSUM62[b][a] !== undefined) return BLOSUM62[b][a];
  return -1;
}

/* ================================================================
   PAIRWISE ALIGNMENT  (affine gap, NW global / SW local)
================================================================ */
function pairwiseAlign(seq1, seq2, matName, matchScore, mismatchScore, gapOpen, gapExtend, isGlobal) {
  const m = seq1.length;
  const n = seq2.length;
  const NEG = -1e9;

  // Flat arrays indexed [i*(n+1)+j] for speed
  const sz = (m + 1) * (n + 1);
  const M  = new Float64Array(sz).fill(NEG);
  const E  = new Float64Array(sz).fill(NEG);  // gap in seq1 (seq2 consumed)
  const F  = new Float64Array(sz).fill(NEG);  // gap in seq2 (seq1 consumed)

  // Traceback: 0=null/stop, 1=M, 2=E, 3=F
  const TB_M = new Uint8Array(sz);
  const TB_E = new Uint8Array(sz);
  const TB_F = new Uint8Array(sz);

  const idx = (i, j) => i * (n + 1) + j;

  // ── Initialise ──────────────────────────────────────────
  M[idx(0, 0)] = 0;

  if (isGlobal) {
    for (let i = 1; i <= m; i++) {
      const score = gapOpen + (i - 1) * gapExtend;
      F[idx(i, 0)] = score;
      M[idx(i, 0)] = score;
      TB_M[idx(i, 0)] = 3; // came from F
      TB_F[idx(i, 0)] = i === 1 ? 1 : 3; // 1=M, 3=F
    }
    for (let j = 1; j <= n; j++) {
      const score = gapOpen + (j - 1) * gapExtend;
      E[idx(0, j)] = score;
      M[idx(0, j)] = score;
      TB_M[idx(0, j)] = 2; // came from E
      TB_E[idx(0, j)] = j === 1 ? 1 : 2; // 1=M, 2=E
    }
  }
  // SW: borders stay 0

  let swMaxScore = NEG;
  let swMaxI = 0, swMaxJ = 0;

  // ── Fill ────────────────────────────────────────────────
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const ij = idx(i, j);

      // E[i][j]: extend/open gap in seq1
      const eM = M[idx(i, j - 1)] + gapOpen;
      const eE = E[idx(i, j - 1)] + gapExtend;
      if (eM >= eE) { E[ij] = eM; TB_E[ij] = 1; }
      else          { E[ij] = eE; TB_E[ij] = 2; }

      // F[i][j]: extend/open gap in seq2
      const fM = M[idx(i - 1, j)] + gapOpen;
      const fF = F[idx(i - 1, j)] + gapExtend;
      if (fM >= fF) { F[ij] = fM; TB_F[ij] = 1; }
      else          { F[ij] = fF; TB_F[ij] = 3; }

      // M[i][j]: match / mismatch
      const sub  = getSub(seq1[i - 1], seq2[j - 1], matName, matchScore, mismatchScore);
      const mDiag = M[idx(i - 1, j - 1)] + sub;
      const mE    = E[ij];
      const mF    = F[ij];

      let best = mDiag, bestSrc = 1; // 1=M
      if (mE > best) { best = mE; bestSrc = 2; }
      if (mF > best) { best = mF; bestSrc = 3; }

      if (!isGlobal && best < 0) { best = 0; bestSrc = 0; }

      M[ij] = best;
      TB_M[ij] = bestSrc;

      if (!isGlobal && best > swMaxScore) {
        swMaxScore = best; swMaxI = i; swMaxJ = j;
      }
    }
  }

  // ── Traceback ────────────────────────────────────────────
  let i, j, curMat;
  let finalScore;

  if (isGlobal) {
    i = m; j = n; curMat = 1; // start in M
    finalScore = M[idx(m, n)];
  } else {
    if (swMaxScore <= 0) return { score: 0, aligned1: '', aligned2: '' };
    i = swMaxI; j = swMaxJ; curMat = 1;
    finalScore = swMaxScore;
  }

  const chars1 = [], chars2 = [];

  while (i > 0 || j > 0) {
    if (isGlobal && i === 0 && j === 0) break;

    if (curMat === 1) { // M matrix
      if (!isGlobal && M[idx(i, j)] <= 0) break;
      const src = TB_M[idx(i, j)];
      if (src === 0) break; // SW clamp
      if (src === 1) {
        chars1.push(seq1[i - 1]);
        chars2.push(seq2[j - 1]);
        i--; j--;
        // curMat stays 1
      } else {
        curMat = src; // switch to E(2) or F(3), don't advance yet
      }
    } else if (curMat === 2) { // E matrix — gap in seq1
      const src = TB_E[idx(i, j)];
      chars1.push('-');
      chars2.push(seq2[j - 1]);
      j--;
      curMat = src; // 1=M or 2=E
    } else { // F matrix — gap in seq2
      const src = TB_F[idx(i, j)];
      chars1.push(seq1[i - 1]);
      chars2.push('-');
      i--;
      curMat = src; // 1=M or 3=F
    }
  }

  // Handle any remaining border residues (global alignment border gaps)
  while (i > 0) { chars1.push(seq1[i - 1]); chars2.push('-'); i--; }
  while (j > 0) { chars1.push('-'); chars2.push(seq2[j - 1]); j--; }

  chars1.reverse();
  chars2.reverse();

  return {
    score:    finalScore,
    aligned1: chars1.join(''),
    aligned2: chars2.join('')
  };
}

/* ================================================================
   STATISTICS
================================================================ */
function computeStats(aln1, aln2) {
  const len = aln1.length;
  let identity = 0, similarity = 0, gaps = 0;
  for (let k = 0; k < len; k++) {
    const a = aln1[k], b = aln2[k];
    if (a === '-' || b === '-') {
      gaps++;
    } else if (a === b) {
      identity++;
      similarity++;
    } else {
      if (blosum62Score(a, b) > 0) similarity++;
    }
  }
  return { len, identity, similarity, gaps };
}

/* ================================================================
   CONSERVATION CHARACTER
================================================================ */
function conservChar(a, b) {
  if (a === '-' || b === '-') return ' ';
  if (a === b) return '|';
  const s = blosum62Score(a, b);
  if (s > 0)  return ':';
  if (s === 0) return '.';
  return ' ';
}

/* ================================================================
   HTML RENDERING  (colored spans, 60 chars/block)
================================================================ */
function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function residueClass(a, b, forSeq) {
  // forSeq=1: we're rendering seq1 char (a); forSeq=2: seq2 char (b)
  const ch = forSeq === 1 ? a : b;
  if (ch === '-') return 'aa-gap';
  const other = forSeq === 1 ? b : a;
  if (other === '-') return ''; // residue aligned to a gap — no colour
  if (a === b) return 'aa-identical';
  if (blosum62Score(a, b) > 0) return 'aa-similar';
  return '';
}

function renderAlignmentHTML(aln1, aln2, name1, name2) {
  const BLOCK = 60;
  const len   = aln1.length;
  const nameW = Math.max(name1.length, name2.length, 4);

  let pos1 = 1, pos2 = 1;
  let html = '';

  for (let start = 0; start < len; start += BLOCK) {
    const end    = Math.min(start + BLOCK, len);
    const slice1 = aln1.slice(start, end);
    const slice2 = aln2.slice(start, end);

    const bStart1 = pos1, bStart2 = pos2;

    let rowSeq1 = '', rowSeq2 = '', rowCons = '';

    for (let k = 0; k < slice1.length; k++) {
      const a = slice1[k], b = slice2[k];
      const cls1 = residueClass(a, b, 1);
      const cls2 = residueClass(a, b, 2);
      rowSeq1 += `<span class="aln-char${cls1 ? ' ' + cls1 : ''}">${esc(a)}</span>`;
      rowSeq2 += `<span class="aln-char${cls2 ? ' ' + cls2 : ''}">${esc(b)}</span>`;
      rowCons += `<span class="aln-char">${conservChar(a, b)}</span>`;
      if (a !== '-') pos1++;
      if (b !== '-') pos2++;
    }

    const end1 = pos1 - 1, end2 = pos2 - 1;

    const n1    = name1.padEnd(nameW);
    const n2    = name2.padEnd(nameW);
    const blank = ''.padEnd(nameW);
    const s1    = String(bStart1).padStart(5);
    const s2    = String(bStart2).padStart(5);
    const e1    = String(end1).padStart(5);
    const e2    = String(end2).padStart(5);
    const sp    = '     ';

    html += `<div class="aln-block">`;
    html += `<div class="aln-row">${esc(n1)}${s1} ${rowSeq1} ${e1}</div>`;
    html += `<div class="aln-row aln-consv">${esc(blank)}${sp} ${rowCons}</div>`;
    html += `<div class="aln-row">${esc(n2)}${s2} ${rowSeq2} ${e2}</div>`;
    html += `</div>`;
  }

  return html;
}

/* ================================================================
   PLAIN-TEXT FORMAT  (download / copy)
================================================================ */
function buildPlainText(aln1, aln2, name1, name2, stats, score) {
  const BLOCK = 60;
  const len   = aln1.length;
  const algoEl = document.getElementById('algorithm');
  const matEl  = document.getElementById('matrix');
  const pct = (v, t) => `${v}/${t} (${t > 0 ? (v / t * 100).toFixed(1) : '0.0'}%)`;

  let out = '# Pairwise Sequence Alignment\n';
  out += `# Algorithm : ${algoEl.options[algoEl.selectedIndex].text}\n`;
  out += `# Matrix    : ${matEl.options[matEl.selectedIndex].text}\n`;
  out += `# Score     : ${score}\n`;
  out += `# Identity  : ${pct(stats.identity, stats.len)}\n`;
  out += `# Similarity: ${pct(stats.similarity, stats.len)}\n`;
  out += `# Gaps      : ${pct(stats.gaps, stats.len)}\n`;
  out += `# Length    : ${stats.len}\n\n`;

  const nameW = Math.max(name1.length, name2.length, 4);
  let pos1 = 1, pos2 = 1;

  for (let start = 0; start < len; start += BLOCK) {
    const end    = Math.min(start + BLOCK, len);
    const sl1    = aln1.slice(start, end);
    const sl2    = aln2.slice(start, end);
    const bS1    = pos1, bS2 = pos2;
    let consv    = '';

    for (let k = 0; k < sl1.length; k++) {
      consv += conservChar(sl1[k], sl2[k]);
      if (sl1[k] !== '-') pos1++;
      if (sl2[k] !== '-') pos2++;
    }

    const e1 = pos1 - 1, e2 = pos2 - 1;
    const n1 = name1.padEnd(nameW), n2 = name2.padEnd(nameW);
    const bl = ''.padEnd(nameW);

    out += `${n1} ${String(bS1).padStart(5)} ${sl1} ${e1}\n`;
    out += `${bl}       ${consv}\n`;
    out += `${n2} ${String(bS2).padStart(5)} ${sl2} ${e2}\n\n`;
  }

  return out;
}

/* ================================================================
   UI HELPERS
================================================================ */
let lastResult = null;

function showError(msg) {
  const box = document.getElementById('error-box');
  box.textContent = msg;
  box.style.display = msg ? 'block' : 'none';
}

function toggleSimpleParams() {
  const show = document.getElementById('matrix').value === 'simple';
  document.getElementById('simple-match-grp').style.display    = show ? '' : 'none';
  document.getElementById('simple-mismatch-grp').style.display = show ? '' : 'none';
}

function loadExample() {
  document.getElementById('seq1-name').value = 'HBA_HUMAN (\u03b1-chain 1-30)';
  document.getElementById('seq1').value      = 'VLSPADKTNVKAAWGKVGAHAGEYGAEAL';
  document.getElementById('seq2-name').value = 'HBB_HUMAN (\u03b2-chain 1-30)';
  document.getElementById('seq2').value      = 'VHLTPEEKSAVTALWGKVNVDEVGGEALG';
}

/* ================================================================
   MAIN ALIGNMENT RUNNER
================================================================ */
function runAlignment() {
  showError('');
  document.getElementById('results-section').style.display = 'none';

  const name1 = document.getElementById('seq1-name').value.trim() || 'Sequence 1';
  const name2 = document.getElementById('seq2-name').value.trim() || 'Sequence 2';
  const seq1  = parseSequence(document.getElementById('seq1').value);
  const seq2  = parseSequence(document.getElementById('seq2').value);

  if (!seq1) { showError('Sequence 1 is empty or contains no valid amino acid characters.'); return; }
  if (!seq2) { showError('Sequence 2 is empty or contains no valid amino acid characters.'); return; }
  if (seq1.length > 5000 || seq2.length > 5000) {
    showError('Sequences must be ≤ 5000 residues each for browser-based alignment.');
    return;
  }

  const isGlobal    = document.getElementById('algorithm').value === 'global';
  const matName     = document.getElementById('matrix').value;
  const matchScore  = parseFloat(document.getElementById('match-score').value)    || 1;
  const mismScore   = parseFloat(document.getElementById('mismatch-score').value) || -1;
  const gapOpen     = parseFloat(document.getElementById('gap-open').value);
  const gapExtend   = parseFloat(document.getElementById('gap-extend').value);

  if (isNaN(gapOpen) || isNaN(gapExtend)) {
    showError('Gap penalties must be valid numbers.');
    return;
  }

  const result = pairwiseAlign(seq1, seq2, matName, matchScore, mismScore, gapOpen, gapExtend, isGlobal);

  if (!result.aligned1) {
    showError('No significant local alignment found (all scores ≤ 0). Try reducing gap penalties or switching to global alignment.');
    return;
  }

  const stats = computeStats(result.aligned1, result.aligned2);
  lastResult  = { ...result, stats, name1, name2 };

  // Stats bar
  const pct = (v, t) => `${v}/${t}&nbsp;(${t > 0 ? (v / t * 100).toFixed(1) : '0.0'}%)`;
  document.getElementById('stats-bar').innerHTML = `
    <div class="stat-chip">Score: <strong>${result.score}</strong></div>
    <div class="stat-chip">Identity: <strong>${pct(stats.identity, stats.len)}</strong></div>
    <div class="stat-chip">Similarity: <strong>${pct(stats.similarity, stats.len)}</strong></div>
    <div class="stat-chip">Gaps: <strong>${pct(stats.gaps, stats.len)}</strong></div>
    <div class="stat-chip">Length: <strong>${stats.len}</strong></div>
  `;

  document.getElementById('aln-display').innerHTML =
    renderAlignmentHTML(result.aligned1, result.aligned2, name1, name2);

  const sec = document.getElementById('results-section');
  sec.style.display = 'block';
  sec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ================================================================
   DOWNLOAD / COPY
================================================================ */
function downloadResult() {
  if (!lastResult) return;
  const { aligned1, aligned2, name1, name2, stats, score } = lastResult;
  const text = buildPlainText(aligned1, aligned2, name1, name2, stats, score);
  const blob = new Blob([text], { type: 'text/plain' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'alignment.txt';
  a.click();
  URL.revokeObjectURL(a.href);
}

function copyResult() {
  if (!lastResult) return;
  const { aligned1, aligned2, name1, name2, stats, score } = lastResult;
  const text = buildPlainText(aligned1, aligned2, name1, name2, stats, score);
  navigator.clipboard.writeText(text).then(() => {
    const btn  = document.querySelector('.action-btn.copy');
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  }).catch(() => {
    alert('Copy failed. Please use the Download button instead.');
  });
}
