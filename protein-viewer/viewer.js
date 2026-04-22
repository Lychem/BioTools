
/* ── State ─────────────────────────────────────────── */
let viewer      = null;
let pendingFile = null;   // { content: string, name: string, format: string }
let pendingPdb  = null;   // PDB ID string
let activeTab   = 'file';

/* Contact-map state */
let cmAtoms          = null;   // [{authChainId, authSeqId, resName, x, y, z}]
let cmDistances      = null;   // Float32Array[]  n×n
let cmThreshold      = 8.0;
let cmMode           = 'contact';  // 'contact' | 'distance'
let cmClickRegistered = false;
let cmEnabled        = false;   // contact map shown only when user opts in
let loadedContent    = null;    // { rawContent, fmt } — kept for on-demand map generation
let plotlyReady      = false;   // true once Plotly.js has been loaded

/* ── Lazy-load Plotly.js ────────────────────────────── */
function loadPlotly() {
    return new Promise((resolve, reject) => {
    if (typeof window.Plotly !== 'undefined') { plotlyReady = true; resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/plotly.js-dist-min@2/plotly.min.js';
    s.onload  = () => { plotlyReady = true; resolve(); };
    s.onerror = () => reject(new Error('Failed to load Plotly.js'));
    document.head.appendChild(s);
    });
}

/* ── Mol* viewer init ───────────────────────────────── */
async function initViewer() {
    try {
    viewer = await molstar.Viewer.create('mol-viewer', {
        layoutIsExpanded:          false,
        layoutShowControls:        false,
        layoutShowRemoteState:     false,
        layoutShowSequence:        true,
        layoutShowLog:             false,
        layoutShowLeftPanel:       false,
        viewportShowExpand:        true,
        viewportShowControls:      true,
        viewportShowSettings:      false,
        viewportShowSelectionMode: false,
        viewportShowAnimation:     false,
        pdbProvider:               'rcsb',
        emdbProvider:              'rcsb',
    });
    } catch (e) {
    showError('Failed to initialize 3D viewer: ' + e.message);
    }
}

window.addEventListener('DOMContentLoaded', initViewer);

/* ── Tab switching ──────────────────────────────────── */
function switchTab(tab) {
    activeTab = tab;
    document.getElementById('tab-file').classList.toggle('active', tab === 'file');
    document.getElementById('tab-pdb').classList.toggle('active', tab === 'pdb');
    document.getElementById('panel-file').style.display = tab === 'file' ? 'block' : 'none';
    document.getElementById('panel-pdb').style.display  = tab === 'pdb'  ? 'block' : 'none';

    pendingFile = null;
    pendingPdb  = null;
    updateVisualizeBtn();
    hideError();
}

/* ── File upload ────────────────────────────────────── */
function onDragOver(e)  { e.preventDefault(); document.getElementById('drop-zone').classList.add('drag-over'); }
function onDragLeave()  { document.getElementById('drop-zone').classList.remove('drag-over'); }
function onDrop(e) {
    e.preventDefault();
    document.getElementById('drop-zone').classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
}
function onFileSelected(e) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
}

function handleFile(file) {
    hideError();
    const fmt = detectFormat(file.name);
    if (!fmt) {
    showError('Unsupported file type. Please upload a .pdb, .cif, .mmcif, or .ent file.');
    return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
    pendingFile = { content: ev.target.result, name: file.name, format: fmt };
    pendingPdb  = null;
    const dz = document.getElementById('drop-zone');
    dz.classList.add('has-file');
    document.getElementById('file-name-display').textContent = '✓ ' + file.name;
    updateVisualizeBtn();
    };
    reader.onerror = () => showError('Could not read file.');
    reader.readAsText(file);
}

function detectFormat(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdb' || ext === 'ent') return 'pdb';
    if (ext === 'cif' || ext === 'mmcif') return 'mmcif';
    return null;
}

/* ── PDB ID ──────────────────────────────────────────── */
function onPdbInput() {
    hideError();
    const val = document.getElementById('pdb-input').value.trim();
    pendingPdb  = val.length >= 4 ? val : null;
    pendingFile = null;
    updateVisualizeBtn();
}

function setPdbId(id) {
    switchTab('pdb');
    document.getElementById('pdb-input').value = id;
    pendingPdb = id;
    updateVisualizeBtn();
}

/* ── Visualize button state ─────────────────────────── */
function updateVisualizeBtn() {
    const btn = document.getElementById('visualize-btn');
    btn.disabled = !(pendingFile || (pendingPdb && pendingPdb.length >= 4));
}

/* ── Main visualize action ──────────────────────────── */
async function visualize() {
    if (!viewer) { showError('Viewer is still initializing, please wait a moment.'); return; }
    hideError();
    resetContactMap();
    showLoading(true);

    try {
    let rawContent = null;
    let fmt        = null;

    if (pendingFile) {
        rawContent = pendingFile.content;
        fmt        = pendingFile.format;
        document.getElementById('structure-label').textContent = pendingFile.name;
        document.getElementById('viewer-placeholder').classList.add('hidden');
        await viewer.loadStructureFromData(rawContent, fmt, false);

    } else if (pendingPdb) {
        const id  = pendingPdb.trim().toUpperCase();
        const url = `https://files.rcsb.org/download/${id.toLowerCase()}.cif`;
        document.getElementById('structure-label').textContent = 'PDB: ' + id;
        document.getElementById('viewer-placeholder').classList.add('hidden');
        showLoading(true, 'Fetching structure…');
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Could not fetch PDB ${id} (HTTP ${resp.status})`);
        rawContent = await resp.text();
        fmt        = 'mmcif';
        await viewer.loadStructureFromData(rawContent, fmt, false);
    }

    if (rawContent) {
        loadedContent = { rawContent, fmt };
        if (cmEnabled) {
        await generateContactMap(rawContent, fmt);
        }
    }

    } catch (e) {
    showError('Could not load structure: ' + (e.message || e));
    document.getElementById('viewer-placeholder').classList.remove('hidden');
    loadedContent = null;
    resetContactMap();
    } finally {
    showLoading(false);
    }
}

/* ── Loading overlay ────────────────────────────────── */
function showLoading(on, msg) {
    const el = document.getElementById('loading-overlay');
    if (on) {
    document.getElementById('loading-text').textContent = msg || 'Loading structure…';
    el.classList.add('active');
    } else {
    el.classList.remove('active');
    }
}

/* ── Error helpers ───────────────────────────────────── */
function showError(msg) {
    const box = document.getElementById('error-box');
    box.textContent = '⚠ ' + msg;
    box.style.display = 'block';
}
function hideError() {
    document.getElementById('error-box').style.display = 'none';
}

/* ═══════════════════════════════════════════════════════
    CONTACT MAP
    ═══════════════════════════════════════════════════════ */

/* ── Contact-map toggle handler ─────────────────────── */
async function onToggleContactMap(checked) {
    cmEnabled = checked;
    const panel = document.getElementById('panel-cm');
    if (checked) {
    panel.hidden = false;
    // If a structure is already loaded and map hasn't been generated yet, do it now
    if (loadedContent && cmAtoms === null) {
        await generateContactMap(loadedContent.rawContent, loadedContent.fmt);
    } else if (cmAtoms && cmDistances) {
        // Map data exists but panel was just re-shown — re-render the plot
        renderContactMap(cmAtoms, cmDistances);
    }
    } else {
    panel.hidden = true;
    }
}

/* ── PDB Cα parser ──────────────────────────────────── */
function parsePdbCa(content) {
    const atoms = [];
    const lines = content.split('\n');
    let modelCount = 0;

    for (const line of lines) {
    const rec = line.substring(0, 6);

    if (rec === 'MODEL ') {
        modelCount++;
        if (modelCount > 1) break;   // only first model
        continue;
    }
    if (rec === 'ENDMDL') {
        if (modelCount > 0) break;
        continue;
    }
    if (rec !== 'ATOM  ') continue;

    const atomName = line.substring(12, 16).trim();
    if (atomName !== 'CA') continue;

    const altLoc = line[16] || ' ';
    if (altLoc !== ' ' && altLoc !== 'A') continue;

    const resName = line.substring(17, 20).trim();
    const chainId = (line[21] || ' ').trim() || 'A';
    const seqId   = parseInt(line.substring(22, 26).trim(), 10);
    if (isNaN(seqId)) continue;

    const x = parseFloat(line.substring(30, 38));
    const y = parseFloat(line.substring(38, 46));
    const z = parseFloat(line.substring(46, 54));
    if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

    atoms.push({ authChainId: chainId, authSeqId: seqId, resName, x, y, z });
    }
    return atoms;
}

/* ── mmCIF line tokenizer ───────────────────────────── */
function mmCifTokenize(line) {
    const tokens = [];
    let i = 0;
    const n = line.length;
    while (i < n) {
    while (i < n && line.charCodeAt(i) <= 32) i++;
    if (i >= n) break;
    if (line[i] === '"' || line[i] === "'") {
        const q = line[i++];
        let j = i;
        while (j < n && line[j] !== q) j++;
        tokens.push(line.slice(i, j));
        i = j + 1;
    } else {
        let j = i;
        while (j < n && line.charCodeAt(j) > 32) j++;
        tokens.push(line.slice(i, j));
        i = j;
    }
    }
    return tokens;
}

/* ── mmCIF Cα parser ────────────────────────────────── */
function parseMmCifCa(content) {
    const atoms = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
    if (lines[i].trim() !== 'loop_') { i++; continue; }
    i++;

    if (i >= lines.length || !lines[i].trim().startsWith('_atom_site.')) continue;

    // Read column definitions
    const cols = {};
    let colCount = 0;
    while (i < lines.length && lines[i].trim().startsWith('_atom_site.')) {
        const name = lines[i].trim().slice('_atom_site.'.length);
        cols[name] = colCount++;
        i++;
    }

    // Require minimum columns
    if (!('group_PDB'    in cols) || !('label_atom_id' in cols) ||
        !('Cartn_x'      in cols) || !('Cartn_y'       in cols) ||
        !('Cartn_z'      in cols)) continue;

    const hasAuthChain = 'auth_asym_id'  in cols;
    const hasLabelChain= 'label_asym_id' in cols;
    const hasAuthSeq   = 'auth_seq_id'   in cols;
    const hasLabelSeq  = 'label_seq_id'  in cols;
    if (!hasAuthChain && !hasLabelChain) continue;
    if (!hasAuthSeq   && !hasLabelSeq)   continue;

    // Read data rows
    let firstModel  = null;
    let inMultiline = false;

    while (i < lines.length) {
        const raw = lines[i].trim();
        i++;
        if (raw === '' || raw[0] === '#') continue;
        if (raw === 'loop_' || raw[0] === '_') break;

        // Semicolon multiline values
        if (raw[0] === ';') { inMultiline = !inMultiline; continue; }
        if (inMultiline) continue;

        const parts = mmCifTokenize(raw);
        if (parts.length < colCount) continue;

        if (parts[cols['group_PDB']]    !== 'ATOM') continue;
        if (parts[cols['label_atom_id']] !== 'CA')   continue;

        if ('pdbx_PDB_model_num' in cols) {
        const m = parts[cols['pdbx_PDB_model_num']];
        if (firstModel === null) firstModel = m;
        else if (m !== firstModel) continue;
        }
        if ('label_alt_id' in cols) {
        const alt = parts[cols['label_alt_id']];
        if (alt !== '.' && alt !== 'A') continue;
        }

        const authChainId = hasAuthChain
        ? parts[cols['auth_asym_id']]
        : parts[cols['label_asym_id']];
        const authSeqId   = parseInt(
        hasAuthSeq ? parts[cols['auth_seq_id']] : parts[cols['label_seq_id']], 10);
        if (isNaN(authSeqId)) continue;

        const resName = 'label_comp_id' in cols ? parts[cols['label_comp_id']] : '???';
        const x = parseFloat(parts[cols['Cartn_x']]);
        const y = parseFloat(parts[cols['Cartn_y']]);
        const z = parseFloat(parts[cols['Cartn_z']]);
        if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

        atoms.push({ authChainId, authSeqId, resName, x, y, z });
    }

    if (atoms.length > 0) break;   // found the _atom_site loop
    }
    return atoms;
}

/* ── Deduplicate Cα atoms (same chain+resSeq) ───────── */
function deduplicateCa(atoms) {
    const seen = new Set();
    return atoms.filter(a => {
    const key = `${a.authChainId}|${a.authSeqId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
    });
}

/* ── Distance matrix ────────────────────────────────── */
function computeDistances(atoms) {
    const n = atoms.length;
    const d = [];
    for (let i = 0; i < n; i++) {
    d.push(new Float32Array(n));
    const ai = atoms[i];
    for (let j = 0; j < n; j++) {
        const aj = atoms[j];
        const dx = ai.x - aj.x, dy = ai.y - aj.y, dz = ai.z - aj.z;
        d[i][j] = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    }
    return d;
}

/* ── Chain boundary helper ──────────────────────────── */
function getChains(atoms) {
    const chains = [];
    let last = null;
    for (let i = 0; i < atoms.length; i++) {
    const ch = atoms[i].authChainId;
    if (ch !== last) {
        if (last !== null) chains[chains.length - 1].end = i - 1;
        chains.push({ id: ch, start: i, end: atoms.length - 1 });
        last = ch;
    }
    }
    return chains;
}

/* ── Render Plotly contact / distance map ───────────── */
function renderContactMap(atoms, distances) {
    const n = atoms.length;
    if (n === 0) return;

    const chains = getChains(atoms);

    // Build z matrix and hover text
    const z        = [];
    const hoverText = [];
    for (let i = 0; i < n; i++) {
    const row  = new Array(n);
    const rowT = new Array(n);
    const ai = atoms[i];
    for (let j = 0; j < n; j++) {
        const d  = distances[i][j];
        const aj = atoms[j];
        row[j]  = cmMode === 'contact'
        ? (i !== j && d <= cmThreshold ? 1 : 0)
        : (i !== j ? d : null);
        rowT[j] = `<b>${ai.authChainId}:${ai.resName}${ai.authSeqId}</b>` +
                ` — <b>${aj.authChainId}:${aj.resName}${aj.authSeqId}</b>` +
                `<br>Distance: ${d.toFixed(2)} Å`;
    }
    z.push(row);
    hoverText.push(rowT);
    }

    // Sparse tick labels (≤ 40 ticks)
    const step     = Math.max(1, Math.ceil(n / 40));
    const tickvals = [], ticktext = [];
    for (let i = 0; i < n; i += step) {
    tickvals.push(i);
    ticktext.push(`${atoms[i].authChainId}${atoms[i].authSeqId}`);
    }

    // Chain separator shapes (red dashed lines)
    const shapes = [];
    for (let ci = 1; ci < chains.length; ci++) {
    const pos = chains[ci].start - 0.5;
    shapes.push(
        { type: 'line', x0: pos, x1: pos, y0: -0.5, y1: n - 0.5,
        line: { color: '#ef4444', width: 1.5, dash: 'dash' } },
        { type: 'line', y0: pos, y1: pos, x0: -0.5, x1: n - 0.5,
        line: { color: '#ef4444', width: 1.5, dash: 'dash' } }
    );
    }

    // Chain label annotations (shown along x-axis)
    const annotations = chains.map(c => ({
    x: (c.start + c.end) / 2,
    y: n + n * 0.04,
    text: `Chain ${c.id}`,
    showarrow: false,
    font: { size: 10, color: '#64748b', family: 'Courier New, monospace' },
    xref: 'x', yref: 'y',
    }));

    const colorscale = cmMode === 'contact'
    ? [[0, '#f1f5f9'], [1, '#2563eb']]
    : 'RdYlBu_r';

    const trace = {
    type: 'heatmap',
    z,
    text: hoverText,
    hovertemplate: '%{text}<extra></extra>',
    colorscale,
    showscale: cmMode === 'distance',
    zmin: cmMode === 'contact' ? 0 : undefined,
    zmax: cmMode === 'contact' ? 1 : undefined,
    xgap: 0,
    ygap: 0,
    };

    const layout = {
    margin: { l: 60, r: cmMode === 'distance' ? 60 : 12, t: 36, b: 56 },
    xaxis: {
        tickmode: 'array', tickvals, ticktext,
        tickfont: { size: 9 }, tickangle: -45,
        title: { text: 'Residue', font: { size: 11 } },
        constrain: 'domain',
    },
    yaxis: {
        tickmode: 'array', tickvals, ticktext,
        tickfont: { size: 9 },
        title: { text: 'Residue', font: { size: 11 } },
        autorange: 'reversed',
        constrain: 'domain',
        scaleanchor: 'x',
    },
    title: {
        text: cmMode === 'contact'
        ? `Contact Map &nbsp;(Cα ≤ ${cmThreshold.toFixed(1)} Å)`
        : 'Distance Map (Cα, Å)',
        font: { size: 12 },
        y: 0.99,
    },
    shapes,
    annotations,
    plot_bgcolor: '#f8fafc',
    paper_bgcolor: '#ffffff',
    };

    Plotly.react('contact-map', [trace], layout, { responsive: true, displayModeBar: false });
}

/* ── Contact map click → Mol* highlight ────────────── */
function onContactMapClick(evt) {
    if (!evt.points?.length || !cmAtoms) return;
    const pt = evt.points[0];
    const j  = Math.round(pt.x);   // column index
    const i  = Math.round(pt.y);   // row index
    if (i < 0 || i >= cmAtoms.length || j < 0 || j >= cmAtoms.length) return;

    const res1 = cmAtoms[i];
    const res2 = cmAtoms[j];
    const dist = cmDistances[i][j];

    const info = document.getElementById('cm-sel-info');
    info.style.display = 'flex';
    info.innerHTML =
    `<span class="cm-sel-badge">Selected</span>` +
    ` <b>${res1.authChainId}:${res1.resName}${res1.authSeqId}</b>` +
    ` &mdash; ` +
    `<b>${res2.authChainId}:${res2.resName}${res2.authSeqId}</b>` +
    `<span class="cm-sel-dist">${dist.toFixed(2)} Å</span>`;

    highlightInMolstar(res1, res2);
}

/* ── Highlight two residues in Mol* ─────────────────── */
function highlightInMolstar(res1, res2) {
    if (!viewer) return;
    try {
    const plugin  = viewer.plugin;
    const structs = plugin.managers.structure.hierarchy.current.structures;
    if (!structs.length) return;

    const struct = structs[0].cell.obj?.data;
    if (!struct) return;

    const targets = [
        { chainId: res1.authChainId, seqId: res1.authSeqId },
        { chainId: res2.authChainId, seqId: res2.authSeqId },
    ];

    // Collect unit-local atom indices matching target residues.
    // mol* OrderedSet for sorted arrays is a duck-typed Int32Array.
    const byUnit = new Map();

    for (const unit of struct.units) {
        const { elements, model } = unit;
        if (!model?.atomicHierarchy) continue;
        if (!elements.length) continue;

        const ah = model.atomicHierarchy;

        // Quick chain pre-check using first atom of the unit
        const firstChainIdx = ah.chainAtomSegments.index[elements[0]];
        const unitChain     = ah.chains.auth_asym_id.value(firstChainIdx);
        if (!targets.some(t => t.chainId === unitChain)) continue;

        const matchIndices = [];
        for (let ui = 0; ui < elements.length; ui++) {
        const atomIdx    = elements[ui];
        const resIdx     = ah.residueAtomSegments.index[atomIdx];
        const chainIdx   = ah.chainAtomSegments.index[atomIdx];
        const seqId      = ah.residues.auth_seq_id.value(resIdx);
        const chainId    = ah.chains.auth_asym_id.value(chainIdx);

        if (targets.some(t => t.chainId === chainId && t.seqId === seqId)) {
            matchIndices.push(ui);   // unit-local index
        }
        }

        if (matchIndices.length) {
        if (!byUnit.has(unit)) byUnit.set(unit, []);
        byUnit.get(unit).push(...matchIndices);
        }
    }

    if (!byUnit.size) return;

    // Build a StructureElement.Loci-shaped object.
    // mol*'s OrderedSet (sorted-array variant) is a plain sorted Int32Array.
    const lociElements = [];
    for (const [unit, indices] of byUnit) {
        indices.sort((a, b) => a - b);
        lociElements.push({ unit, indices: new Int32Array(indices) });
    }

    const loci = { kind: 'element-loci', structure: struct, elements: lociElements };

    // Focus camera and set selection (enables visual highlight)
    plugin.managers.camera.focusLoci(loci);
    try { plugin.managers.structure.selection.fromLoci('set', loci); } catch (_) {}

    } catch (e) {
    console.warn('[ContactMap] Could not highlight residues in Mol*:', e);
    }
}

/* ── Controls: threshold slider ─────────────────────── */
function onCmThreshold(val) {
    cmThreshold = parseFloat(val);
    document.getElementById('cm-threshold-val').textContent = cmThreshold.toFixed(1) + ' Å';
    if (cmAtoms && cmDistances) renderContactMap(cmAtoms, cmDistances);
}

/* ── Controls: map type select ───────────────────────── */
function onCmMode(val) {
    cmMode = val;
    if (cmAtoms && cmDistances) renderContactMap(cmAtoms, cmDistances);
}

/* ── Generate contact map from raw structure text ───── */
async function generateContactMap(content, format) {
    const cmLoading     = document.getElementById('cm-loading-overlay');
    const cmPlaceholder = document.getElementById('cm-placeholder');

    cmLoading.classList.add('active');
    cmPlaceholder.classList.add('hidden');

    try {
    // Lazy-load Plotly.js on first use
    await loadPlotly();
    // Parse Cα atoms
    let atoms = format === 'pdb' ? parsePdbCa(content) : parseMmCifCa(content);
    atoms = deduplicateCa(atoms);

    if (atoms.length === 0) {
        throw new Error('No Cα atoms found. Make sure the structure contains standard protein residues.');
    }

    // Yield briefly so the loading UI can paint
    await new Promise(r => setTimeout(r, 10));

    const distances = computeDistances(atoms);

    cmAtoms     = atoms;
    cmDistances = distances;

    // Update chain info label
    const chains = getChains(atoms);
    document.getElementById('cm-chain-info').textContent =
        `${chains.length} chain${chains.length !== 1 ? 's' : ''}: ` +
        chains.map(c => `${c.id} (${c.end - c.start + 1})`).join(' · ');

    // Show controls bar
    document.getElementById('cm-controls-bar').hidden = false;

    // Render the plot
    renderContactMap(atoms, distances);

    // Register click handler (once – Plotly.react keeps the div element intact)
    if (!cmClickRegistered) {
        document.getElementById('contact-map').on('plotly_click', onContactMapClick);
        cmClickRegistered = true;
    }

    } catch (e) {
    console.error('[ContactMap]', e);
    cmPlaceholder.textContent = '⚠ ' + e.message;
    cmPlaceholder.classList.remove('hidden');
    cmAtoms = cmDistances = null;
    } finally {
    cmLoading.classList.remove('active');
    }
}

/* ── Reset contact map (new structure loading) ───────── */
function resetContactMap() {
    cmAtoms = cmDistances = null;
    document.getElementById('cm-controls-bar').hidden = true;
    document.getElementById('cm-placeholder').innerHTML =
    '<span style="font-size:2.2rem;opacity:0.35">📊</span>' +
    '<span>Load a structure to generate the contact map</span>';
    document.getElementById('cm-placeholder').classList.remove('hidden');
    document.getElementById('cm-sel-info').style.display = 'none';
    // Clear any existing Plotly chart so it doesn't show stale data
    if (typeof window.Plotly !== 'undefined') {
    try { Plotly.purge('contact-map'); } catch (e) {
        console.warn('[ContactMap] Could not purge chart:', e);
    }
    }
}
