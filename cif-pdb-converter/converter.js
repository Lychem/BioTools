/* ================================================================
   Shared CIF Parsing Utilities
================================================================ */

/**
 * Find the first loop_ block that contains columns matching keyPrefix.
 * Uses a line-by-line scan so it correctly skips other loop_ blocks
 * that appear before the target one (e.g. _entity, _struct_conf, etc.).
 */
function findLoop(text, keyPrefix) {
  const prefixLower = (keyPrefix.startsWith('_') ? keyPrefix.slice(1) : keyPrefix).toLowerCase();
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase() !== 'loop_') continue;

    // Collect column headers (lines immediately following loop_ that start with _)
    const columns = [];
    let j = i + 1;
    while (j < lines.length && lines[j].trim().startsWith('_')) {
      columns.push(lines[j].trim().slice(1).toLowerCase());
      j++;
    }

    if (columns.length === 0 || !columns.some(c => c.startsWith(prefixLower))) {
      // Skip past the data rows of this non-matching loop so the outer loop
      // doesn't re-examine them as potential loop_ markers.
      while (j < lines.length) {
        const trimmed = lines[j].trim();
        if (trimmed.toLowerCase() === 'loop_' ||
            /^data_/i.test(trimmed) ||
            trimmed.startsWith('_') ||
            trimmed.startsWith('#')) break;
        j++;
      }
      i = j - 1;
      continue;
    }

    // Collect data rows until the next CIF section begins
    const dataLines = [];
    while (j < lines.length) {
      const trimmed = lines[j].trim();
      if (trimmed.toLowerCase() === 'loop_' ||
          /^data_/i.test(trimmed) ||
          trimmed.startsWith('_') ||
          trimmed.startsWith('#')) break;
      dataLines.push(lines[j]);
      j++;
    }

    const rows = tokeniseLoopData(dataLines.join('\n'), columns.length);
    return { columns, rows };
  }

  return null;
}

function tokeniseLoopData(text, nCols) {
  const tokens = [];
  let placeholder = 0;
  const placeholders = {};
  const cleaned = text.replace(/\n;([\s\S]*?)\n;/g, (_, val) => {
    const key = `\x00${placeholder}\x00`;
    placeholders[placeholder++] = val.trim();
    return ` ${key} `;
  });

  const lineRe = /^(?![#_]|loop_|data_)(.+)$/gm;
  let lm;
  while ((lm = lineRe.exec(cleaned)) !== null) {
    const line = lm[1].trim();
    if (!line || line.startsWith('#')) continue;
    const toks = tokeniseCifLine(line).map(t => {
      const pm = /^\x00(\d+)\x00$/.exec(t);
      return pm ? placeholders[pm[1]] : t;
    });
    tokens.push(...toks);
  }

  const rows = [];
  if (nCols > 0) {
    for (let i = 0; i + nCols <= tokens.length; i += nCols) {
      rows.push(tokens.slice(i, i + nCols));
    }
  }
  return rows;
}

function tokeniseCifLine(line) {
  const tokens = [];
  const re = /'([^']*)'|"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    tokens.push(m[1] ?? m[2] ?? m[3]);
  }
  return tokens;
}

function findCol(columns, name) {
  const idx = columns.indexOf(name.toLowerCase());
  return idx === -1 ? null : idx;
}

/** Extract a single key-value from CIF text (handles quoted values). */
function extractCifValue(text, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `${escaped}\\s+(['\"]?)([\\s\\S]+?)\\1(?=\\s*(?:_|loop_|#|$))`,
    'i'
  );
  const m = re.exec(text);
  if (!m) return null;
  return m[2].trim();
}

/* ================================================================
   CIF → PDB Converter
================================================================ */

/**
 * Convert mmCIF text to PDB format.
 * Returns { pdbText, atomCount, chainIds }.
 */
function cifToPdb(text) {
  const outputLines = [];

  // REMARK header
  const entryId = extractCifValue(text, '_entry.id')
               || extractCifValue(text, '_struct.entry_id')
               || 'XXXX';
  outputLines.push(`REMARK    Converted from mmCIF format by BioTools`);
  outputLines.push(`REMARK    Entry: ${entryId}`);

  // CRYST1 from _cell and _symmetry
  const aRaw  = extractCifValue(text, '_cell.length_a');
  const bRaw  = extractCifValue(text, '_cell.length_b');
  const cRaw  = extractCifValue(text, '_cell.length_c');
  const alRaw = extractCifValue(text, '_cell.angle_alpha');
  const beRaw = extractCifValue(text, '_cell.angle_beta');
  const gaRaw = extractCifValue(text, '_cell.angle_gamma');
  const sg    = extractCifValue(text, '_symmetry.space_group_name_H-M')
             || extractCifValue(text, '_symmetry.space_group_name_h-m')
             || extractCifValue(text, '_space_group.name_H-M_alt')
             || 'P 1';

  if (aRaw && bRaw && cRaw) {
    const a  = parseFloat(aRaw).toFixed(3).padStart(9);
    const b  = parseFloat(bRaw).toFixed(3).padStart(9);
    const c  = parseFloat(cRaw).toFixed(3).padStart(9);
    const al = parseFloat(alRaw || '90').toFixed(2).padStart(7);
    const be = parseFloat(beRaw || '90').toFixed(2).padStart(7);
    const ga = parseFloat(gaRaw || '90').toFixed(2).padStart(7);
    outputLines.push(`CRYST1${a}${b}${c}${al}${be}${ga} ${sg.padEnd(11)}`);
  }

  // _atom_site loop
  const atomSiteLoop = findLoop(text, '_atom_site.');
  if (!atomSiteLoop) throw new Error('No _atom_site coordinate data found in CIF file.');

  const { columns, rows } = atomSiteLoop;

  const col = name => findCol(columns, name);

  const groupIdx  = col('atom_site.group_pdb');
  const serialIdx = col('atom_site.id');
  const atomIdx   = col('atom_site.auth_atom_id')  ?? col('atom_site.label_atom_id');
  const altIdx    = col('atom_site.label_alt_id');
  const compIdx   = col('atom_site.auth_comp_id')  ?? col('atom_site.label_comp_id');
  const chainIdx  = col('atom_site.auth_asym_id')  ?? col('atom_site.label_asym_id');
  const seqIdx    = col('atom_site.auth_seq_id')   ?? col('atom_site.label_seq_id');
  const insIdx    = col('atom_site.pdbx_pdb_ins_code');
  const xIdx      = col('atom_site.cartn_x');
  const yIdx      = col('atom_site.cartn_y');
  const zIdx      = col('atom_site.cartn_z');
  const occIdx    = col('atom_site.occupancy');
  const bIdx      = col('atom_site.b_iso_or_equiv');
  const elemIdx   = col('atom_site.type_symbol');
  const chargeIdx = col('atom_site.pdbx_formal_charge');

  if (xIdx === null || yIdx === null || zIdx === null) {
    throw new Error('CIF file is missing coordinate data (Cartn_x/y/z).');
  }

  const chainIds = new Set();
  let atomCount  = 0;
  let lastAtomChain  = null;
  let lastAtomSerial = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const groupRaw = groupIdx !== null ? (row[groupIdx] || 'ATOM') : 'ATOM';
    const isAtom   = groupRaw.toUpperCase() !== 'HETATM';
    const recType  = isAtom ? 'ATOM  ' : 'HETATM';

    // Chain ID (single character; auth_asym_id preferred for PDB compatibility)
    const chainRaw = chainIdx !== null ? (row[chainIdx] || '') : '';
    const chainId  = (chainRaw === '.' || chainRaw === '?') ? ' ' : (chainRaw[0] || ' ');

    // Insert TER when an ATOM chain ends
    if (isAtom && lastAtomChain !== null && lastAtomChain !== chainId) {
      outputLines.push(
        `TER   ${(lastAtomSerial + 1).toString().padStart(5)}` +
        '      ' + '   '.padEnd(3) + ' ' + lastAtomChain
      );
      lastAtomChain = null;
    }

    // Serial number: PDB format supports up to 99999 (5 decimal digits).
    // For larger files the counter wraps around to avoid format overflow.
    const serialRaw = serialIdx !== null ? row[serialIdx] : String(i + 1);
    const serial    = parseInt(serialRaw, 10) || (i + 1);
    const serialMod = ((serial - 1) % 99999) + 1;
    const serialStr = serialMod.toString().padStart(5);

    // Atom name (4 chars, PDB-formatted)
    const atomNameRaw = atomIdx !== null ? (row[atomIdx] || '') : '';
    const elemRaw     = elemIdx !== null ? (row[elemIdx] || '') : '';
    const atomName4   = formatAtomName(atomNameRaw.trim(), elemRaw.trim());

    // Alt location
    const altRaw = altIdx !== null ? row[altIdx] : '.';
    const altLoc = (altRaw && altRaw !== '.' && altRaw !== '?') ? altRaw[0] : ' ';

    // Residue name (3 chars)
    const resName = ((compIdx !== null ? row[compIdx] : '') || '').slice(0, 3).padEnd(3);

    // Residue seq number and insertion code
    const seqRaw  = seqIdx !== null ? (row[seqIdx] || '0') : '0';
    const seqNum  = (seqRaw === '.' || seqRaw === '?') ? 0 : (parseInt(seqRaw, 10) || 0);
    const seqStr  = seqNum.toString().padStart(4);
    const insRaw  = insIdx !== null ? row[insIdx] : '?';
    const insCode = (insRaw && insRaw !== '?' && insRaw !== '.') ? insRaw[0] : ' ';

    // Coordinates
    const xVal = parseFloat(row[xIdx] || '0');
    const yVal = parseFloat(row[yIdx] || '0');
    const zVal = parseFloat(row[zIdx] || '0');
    if (isNaN(xVal) || isNaN(yVal) || isNaN(zVal)) continue;
    const x = xVal.toFixed(3).padStart(8);
    const y = yVal.toFixed(3).padStart(8);
    const z = zVal.toFixed(3).padStart(8);

    // Occupancy and B-factor
    const occRaw = (occIdx !== null ? row[occIdx] : '') || '1.00';
    const bRaw2  = (bIdx   !== null ? row[bIdx]   : '') || '0.00';
    const occ  = parseFloat(occRaw === '.' || occRaw === '?' ? '1.00' : occRaw).toFixed(2).padStart(6);
    const bfac = parseFloat(bRaw2  === '.' || bRaw2  === '?' ? '0.00' : bRaw2 ).toFixed(2).padStart(6);

    // Element symbol (2 chars, right-justified in columns 77-78)
    const elemStr = elemRaw.slice(0, 2).toUpperCase().padStart(2);

    // Formal charge
    const chargeRaw = chargeIdx !== null ? (row[chargeIdx] || '') : '';
    const charge    = (chargeRaw && chargeRaw !== '?' && chargeRaw !== '.')
                     ? chargeRaw.slice(0, 2).padEnd(2) : '  ';

    // Build PDB record (80 chars standard)
    // Cols:  1-6   7-11  12   13-16   17    18-20  21   22    23-26  27   28-30  31-38  39-46  47-54  55-60  61-66  67-76  77-78  79-80
    const line = recType + serialStr + ' ' + atomName4 + altLoc +
                 resName + ' ' + chainId + seqStr + insCode +
                 '   ' + x + y + z + occ + bfac +
                 '          ' + elemStr + charge;
    outputLines.push(line);

    atomCount++;
    chainIds.add(chainId.trim() || '_');
    if (isAtom) {
      lastAtomChain  = chainId;
      lastAtomSerial = serialMod;
    }
  }

  // Final TER for last ATOM chain
  if (lastAtomChain !== null) {
    outputLines.push(
      `TER   ${(lastAtomSerial + 1).toString().padStart(5)}` +
      '      ' + '   '.padEnd(3) + ' ' + lastAtomChain
    );
  }

  outputLines.push('END');

  return { pdbText: outputLines.join('\n'), atomCount, chainIds };
}

/**
 * Format an atom name to exactly 4 characters following PDB conventions.
 * 1-char element → leading space (e.g. " CA ").
 * 2-char element → left-justified  (e.g. "FE  ").
 */
function formatAtomName(name, elem) {
  if (!name) return '    ';
  if (name.length >= 4) return name.slice(0, 4);
  if (elem.length >= 2) {
    // Two-character element (metals, etc.): left-justify in 4 chars
    return name.padEnd(4).slice(0, 4);
  }
  // One-character element: add leading space, then right-pad
  return (' ' + name).padEnd(4).slice(0, 4);
}

/* ================================================================
   PDB → CIF Converter
================================================================ */

/**
 * Convert PDB text to mmCIF format.
 * Returns { cifText, atomCount, chainIds }.
 */
function pdbToCif(text) {
  const lines = text.split(/\r?\n/);

  // Entry ID from HEADER record (cols 63-66, 1-indexed)
  let entryId = 'XXXX';
  for (const line of lines) {
    if (line.startsWith('HEADER')) {
      const id = line.slice(62, 66).trim();
      if (id) { entryId = id.toUpperCase(); break; }
    }
  }

  // Cell parameters from CRYST1
  let cellBlock = '';
  for (const line of lines) {
    if (!line.startsWith('CRYST1')) continue;
    const a  = parseFloat(line.slice(6,  15) || '0');
    const b  = parseFloat(line.slice(15, 24) || '0');
    const c  = parseFloat(line.slice(24, 33) || '0');
    const al = parseFloat(line.slice(33, 40) || '90');
    const be = parseFloat(line.slice(40, 47) || '90');
    const ga = parseFloat(line.slice(47, 54) || '90');
    const sg = line.slice(55, 66).trim() || 'P 1';
    cellBlock = [
      '#',
      `_cell.length_a    ${a.toFixed(3)}`,
      `_cell.length_b    ${b.toFixed(3)}`,
      `_cell.length_c    ${c.toFixed(3)}`,
      `_cell.angle_alpha ${al.toFixed(2)}`,
      `_cell.angle_beta  ${be.toFixed(2)}`,
      `_cell.angle_gamma ${ga.toFixed(2)}`,
      '#',
      `_symmetry.space_group_name_H-M '${sg}'`,
    ].join('\n');
    break;
  }

  // Parse ATOM / HETATM records
  const atoms = [];
  for (const line of lines) {
    const rec = line.slice(0, 6).trimEnd();
    if (rec !== 'ATOM' && rec !== 'ATOM  ' && rec !== 'HETATM') continue;
    const group   = rec.trim();
    const serial  = line.slice(6, 11).trim();
    const name    = line.slice(12, 16);          // 4 chars, keep padding
    const altLoc  = line[16] || ' ';
    const resName = line.slice(17, 20).trim();
    const chainId = line[21] || ' ';
    const resSeq  = line.slice(22, 26).trim();
    const iCode   = line[26] || ' ';
    const x       = line.slice(30, 38).trim();
    const y       = line.slice(38, 46).trim();
    const z       = line.slice(46, 54).trim();
    const occ     = line.slice(54, 60).trim() || '1.00';
    const bfac    = line.slice(60, 66).trim() || '0.00';
    const elem    = line.slice(76, 78).trim();
    const charge  = line.slice(78, 80).trim();

    if (!x || !y || !z) continue;
    atoms.push({ group, serial, name, altLoc, resName, chainId, resSeq, iCode, x, y, z, occ, bfac, elem, charge });
  }

  if (atoms.length === 0) throw new Error('No ATOM or HETATM records found in PDB file.');

  // Assign entity IDs: one per unique ATOM chain, then one shared for all HETATM
  const chainEntityMap = new Map();
  let entityCounter = 1;
  for (const a of atoms) {
    if (a.group === 'ATOM' && !chainEntityMap.has(a.chainId)) {
      chainEntityMap.set(a.chainId, entityCounter++);
    }
  }
  const hetatmEntityId = entityCounter;

  // Build mmCIF text
  const cifLines = [];
  cifLines.push(`data_${entryId}`);
  cifLines.push('#');
  cifLines.push(`_entry.id ${entryId}`);
  if (cellBlock) cifLines.push(cellBlock);
  cifLines.push('#');
  cifLines.push('loop_');
  cifLines.push('_atom_site.group_PDB');
  cifLines.push('_atom_site.id');
  cifLines.push('_atom_site.type_symbol');
  cifLines.push('_atom_site.label_atom_id');
  cifLines.push('_atom_site.label_alt_id');
  cifLines.push('_atom_site.label_comp_id');
  cifLines.push('_atom_site.label_asym_id');
  cifLines.push('_atom_site.label_entity_id');
  cifLines.push('_atom_site.label_seq_id');
  cifLines.push('_atom_site.pdbx_PDB_ins_code');
  cifLines.push('_atom_site.Cartn_x');
  cifLines.push('_atom_site.Cartn_y');
  cifLines.push('_atom_site.Cartn_z');
  cifLines.push('_atom_site.occupancy');
  cifLines.push('_atom_site.B_iso_or_equiv');
  cifLines.push('_atom_site.auth_seq_id');
  cifLines.push('_atom_site.auth_comp_id');
  cifLines.push('_atom_site.auth_asym_id');
  cifLines.push('_atom_site.auth_atom_id');
  cifLines.push('_atom_site.pdbx_PDB_model_num');

  const chainIds = new Set();

  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i];

    // Infer element symbol from atom name if not present in cols 77-78
    let elem = a.elem;
    if (!elem) {
      const nameTrimmed = a.name.trim();
      // Strip digits, take first 1-2 alpha characters
      const alphaPart = nameTrimmed.replace(/[^A-Za-z]/g, '');
      elem = alphaPart.slice(0, 1).toUpperCase() || 'X';
    }

    const group     = a.group;
    const serial    = a.serial || String(i + 1);
    const labelAtom = cifToken(a.name.trim());
    const altLoc    = (!a.altLoc.trim()) ? '.' : a.altLoc.trim();
    const labelComp = cifToken(a.resName);
    const labelAsym = cifToken(a.chainId.trim() || 'A');
    const entityId  = group === 'ATOM'
                     ? (chainEntityMap.get(a.chainId) || 1).toString()
                     : hetatmEntityId.toString();
    const labelSeq  = group === 'ATOM' ? (a.resSeq || '.') : '.';
    const insCode   = (!a.iCode.trim()) ? '?' : a.iCode.trim();
    const x         = parseFloat(a.x).toFixed(3);
    const y         = parseFloat(a.y).toFixed(3);
    const z         = parseFloat(a.z).toFixed(3);
    const occ       = parseFloat(a.occ  || '1.00').toFixed(2);
    const bfac      = parseFloat(a.bfac || '0.00').toFixed(2);
    const authSeq   = a.resSeq || '.';
    const authComp  = cifToken(a.resName);
    const authAsym  = cifToken(a.chainId.trim() || 'A');
    const authAtom  = cifToken(a.name.trim());
    const modelNum  = '1';

    const row = [
      group, serial, elem, labelAtom, altLoc,
      labelComp, labelAsym, entityId, labelSeq, insCode,
      x, y, z, occ, bfac,
      authSeq, authComp, authAsym, authAtom, modelNum
    ].join(' ');
    cifLines.push(row);

    chainIds.add(a.chainId.trim() || '_');
  }

  cifLines.push('#');
  return { cifText: cifLines.join('\n'), atomCount: atoms.length, chainIds };
}

/** Wrap a CIF token in quotes if it contains whitespace or starts with special chars. */
function cifToken(val) {
  if (!val || val === '.' || val === '?') return '.';
  if (/[\s"'#]/.test(val) || val[0] === '_' || val[0] === '$') {
    return `'${val.replace(/'/g, "''")}'`;
  }
  return val;
}

/* ================================================================
   Format Detection
================================================================ */

function detectFormat(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  if (ext === 'cif' || ext === 'mmcif') return 'cif';
  if (ext === 'pdb' || ext === 'ent') return 'pdb';
  return null;
}

/* ================================================================
   UI State
================================================================ */

let currentFile  = null;
let inputFormat  = null;   // 'pdb' | 'cif'

const dropZone   = document.getElementById('drop-zone');
const fileInput  = document.getElementById('file-input');
const convertBtn = document.getElementById('convert-btn');
const errorBox   = document.getElementById('error-box');

// ── Drag & Drop ───────────────────────────────────────────────

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});
dropZone.addEventListener('click', e => {
  if (e.target.classList.contains('upload-btn')) return;
  fileInput.click();
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

function handleFile(file) {
  const fmt = detectFormat(file.name);
  if (!fmt) {
    showError('Please upload a file with a .pdb, .ent, .cif, or .mmcif extension.');
    return;
  }
  currentFile = file;
  inputFormat = fmt;
  document.getElementById('file-name-display').textContent = `✔ ${file.name}`;
  dropZone.classList.add('has-file');
  clearError();
  updateDirectionUI(fmt);
  convertBtn.disabled = false;
  document.getElementById('output-section').style.display = 'none';
}

function updateDirectionUI(fmt) {
  const srcBadge = document.getElementById('src-badge');
  const dstBadge = document.getElementById('dst-badge');
  const note     = document.getElementById('direction-note');

  if (fmt === 'pdb') {
    srcBadge.textContent = 'PDB';
    srcBadge.className   = 'fmt-badge pdb';
    dstBadge.textContent = 'mmCIF';
    dstBadge.className   = 'fmt-badge cif';
    note.textContent     = 'PDB (.pdb / .ent) → mmCIF (.cif). Atom coordinates, cell parameters and symmetry are preserved.';
    convertBtn.textContent = '③ Convert PDB → CIF';
  } else {
    srcBadge.textContent = 'mmCIF';
    srcBadge.className   = 'fmt-badge cif';
    dstBadge.textContent = 'PDB';
    dstBadge.className   = 'fmt-badge pdb';
    note.textContent     = 'mmCIF (.cif) → PDB (.pdb). Auth chain IDs and sequence numbers are used for maximum compatibility.';
    convertBtn.textContent = '③ Convert CIF → PDB';
  }
}

// ── Convert ───────────────────────────────────────────────────

function convert() {
  if (!currentFile || !inputFormat) return;
  clearError();

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result;
      let result, outputText, atomCount, chainIds, outputExt, btnLabel;

      if (inputFormat === 'cif') {
        result    = cifToPdb(text);
        outputText = result.pdbText;
        atomCount  = result.atomCount;
        chainIds   = result.chainIds;
        outputExt  = 'pdb';
        btnLabel   = '⬇ Download .pdb';
      } else {
        result    = pdbToCif(text);
        outputText = result.cifText;
        atomCount  = result.atomCount;
        chainIds   = result.chainIds;
        outputExt  = 'cif';
        btnLabel   = '⬇ Download .cif';
      }

      document.getElementById('converted-output').value = outputText;

      // Stats
      const srcLabel = inputFormat === 'cif' ? 'mmCIF → PDB' : 'PDB → mmCIF';
      document.getElementById('output-stats').innerHTML = `
        <span class="stat-chip">Conversion: <strong>${srcLabel}</strong></span>
        <span class="stat-chip">Atoms: <strong>${atomCount.toLocaleString()}</strong></span>
        <span class="stat-chip">Chains: <strong>${chainIds.size}</strong></span>
      `;

      // Update download button label and store extension
      const dlBtn = document.getElementById('download-btn');
      dlBtn.textContent = btnLabel;
      dlBtn.dataset.ext = outputExt;

      document.getElementById('output-section').style.display = 'block';
      document.getElementById('output-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showError(err.message);
    }
  };
  reader.readAsText(currentFile);
}

// ── Copy / Download ───────────────────────────────────────────

function copyOutput() {
  const text = document.getElementById('converted-output').value;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.action-btn.copy');
    const orig = btn.textContent;
    btn.textContent = '✔ Copied!';
    setTimeout(() => btn.textContent = orig, 2000);
  }).catch(() => {
    // Fallback for browsers that don't support the Clipboard API (deprecated but widely supported)
    const ta = document.getElementById('converted-output');
    ta.select();
    document.execCommand('copy');
  });
}

function downloadOutput() {
  const text    = document.getElementById('converted-output').value;
  const dlBtn   = document.getElementById('download-btn');
  const ext     = dlBtn.dataset.ext || 'txt';
  const baseName = currentFile ? currentFile.name.replace(/\.[^.]+$/, '') : 'structure';
  const blob    = new Blob([text], { type: 'text/plain' });
  const url     = URL.createObjectURL(blob);
  const a       = document.createElement('a');
  a.href        = url;
  a.download    = `${baseName}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Error helpers ─────────────────────────────────────────────

function showError(msg) {
  errorBox.textContent = `⚠ ${msg}`;
  errorBox.style.display = 'block';
}

function clearError() {
  errorBox.textContent = '';
  errorBox.style.display = 'none';
}
