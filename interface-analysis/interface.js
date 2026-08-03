/* ================================================================
   Interface Analysis — Protein-Protein Interface Interaction Detector
   Detects: HBonds, salt bridges, hydrophobic, pi-stacking, pi-cation
   Computes: SASA via Shrake-Rupley, deltaSASA, epitope/paratope
================================================================ */

/* ── Amino Acid Properties ──────────────────────────────────── */

const AA3TO1 = {
  ALA:'A',ARG:'R',ASN:'N',ASP:'D',CYS:'C',GLN:'Q',GLU:'E',
  GLY:'G',HIS:'H',ILE:'I',LEU:'L',LYS:'K',MET:'M',PHE:'F',
  PRO:'P',SER:'S',THR:'T',TRP:'W',TYR:'Y',VAL:'V',
  MSE:'M',HYP:'P',CSE:'C',SEC:'U',PYL:'O',ASX:'B',GLX:'Z',
  XAA:'X',UNK:'X',
};

const AROMATIC = new Set(['PHE','TYR','TRP','HIS']);
const POSITIVE = new Set(['ARG','LYS','HIS']);
const NEGATIVE = new Set(['ASP','GLU']);
const HYDROPHOBIC_RES = new Set(['ALA','VAL','LEU','ILE','MET','PHE','TRP','PRO','TYR','CYS']);

// Atom-level donor/acceptor classification
const HBOND_DONORS = {
  // backbone
  N: true,
  // sidechain
  ND1: true, ND2: true, NE: true, NE1: true, NE2: true,
  NH1: true, NH2: true, NZ: true, OG: true, OG1: true,
  OH: true, SG: true,
};

const HBOND_ACCEPTORS = {
  O: true, OD1: true, OD2: true, OE1: true, OE2: true,
  OG: true, OG1: true, OH: true, ND1: true, SD: true,
};

// Van der Waals radii (Å)
function vdwRadius(element) {
  const r = { C:1.70, N:1.55, O:1.52, S:1.80, P:1.80, SE:1.90 };
  return r[element] || 1.70;
}

function guessElement(atomName, resName) {
  const a = atomName.trim().toUpperCase();
  if (!a) return 'C';
  const first = a[0];
  if (first === 'C') return 'C';
  if (first === 'N') return 'N';
  if (first === 'O') return 'O';
  if (first === 'S') return 'S';
  if (first === 'P') return 'P';
  // HETATM metals
  if (a === 'ZN') return 'ZN';
  if (a === 'MG') return 'MG';
  if (a === 'CA') return 'CA';
  if (a === 'FE') return 'FE';
  if (a === 'MN') return 'MN';
  return 'C';
}

/* ── Fibonacci sphere points for SASA ───────────────────────── */
function fibSpherePoints(n) {
  const pts = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push({ x: Math.cos(theta) * radius, y: y, z: Math.sin(theta) * radius });
  }
  return pts;
}

/* ================================================================
   PDB Parser — Full atom coordinates
================================================================ */

function parsePDBAtoms(text) {
  const lines = text.split(/\r?\n/);
  const chains = {}; // chainId -> { residues: Map<resKey, {resName,resNum,insCode,atoms:[]}>, atoms:[] }

  for (const line of lines) {
    if (!line.startsWith('ATOM  ') && !line.startsWith('HETATM')) continue;
    if (line.length < 54) continue;

    const atName  = line.slice(12, 16).trim();
    const altLoc  = line[16]?.trim() || '';
    if (altLoc && altLoc !== 'A') continue; // skip alternate conformations except A

    const resName = line.slice(17, 20).trim();
    if (resName === 'HOH' || resName === 'WAT') continue; // skip water
    const chainId = line[21]?.trim() || '_';
    const resSeq  = line.slice(22, 26).trim();
    const insCode = (line[26]?.trim() || '');
    const x = parseFloat(line.slice(30, 38));
    const y = parseFloat(line.slice(38, 46));
    const z = parseFloat(line.slice(46, 54));

    if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

    const element = guessElement(atName, resName);
    const resKey = resSeq + insCode;

    if (!chains[chainId]) chains[chainId] = { residues: new Map(), atoms: [] };

    let residue = chains[chainId].residues.get(resKey);
    if (!residue) {
      residue = { resName, resNum: parseInt(resSeq) || 0, insCode, atoms: [] };
      chains[chainId].residues.set(resKey, residue);
    }

    const atom = {
      name: atName,
      element,
      x, y, z,
      vdw: vdwRadius(element),
      resName,
      resKey,
      chainId,
    };
    residue.atoms.push(atom);
    chains[chainId].atoms.push(atom);

    // Track sidechain centroid atoms for hydrophobic / pi calculations
    if (atName === 'CB' || atName === 'CG' || atName === 'CD' || atName === 'CE' ||
        atName === 'CZ' || atName === 'CH2' || atName === 'CZ2' || atName === 'CZ3' ||
        atName === 'CD1' || atName === 'CD2' || atName === 'CE1' || atName === 'CE2' ||
        atName === 'CE3' || atName === 'CZ2' || atName === 'CZ3' || atName === 'CH2') {
      residue._scAtoms = residue._scAtoms || [];
      residue._scAtoms.push(atom);
    }
    // For GLY, use CA as sidechain proxy
    if (atName === 'CA') {
      residue._ca = atom;
    }
    if (atName === 'CB') {
      residue._cb = atom;
    }
  }

  // For GLY, use CA as sidechain proxy
  for (const ch of Object.values(chains)) {
    for (const res of ch.residues.values()) {
      if (!res._scAtoms || res._scAtoms.length === 0) {
        res._scAtoms = res._ca ? [res._ca] : [];
      }
      if (!res._cb && res._ca) res._cb = res._ca;
    }
  }

  const result = [];
  for (const [id, data] of Object.entries(chains)) {
    result.push({
      chainId: id,
      residues: Array.from(data.residues.values()).sort((a, b) => a.resNum - b.resNum),
      atoms: data.atoms,
    });
  }
  return result;
}

/* ================================================================
   mmCIF Parser — Full atom coordinates
================================================================ */

function parseCIFAtoms(text) {
  const atomLoop = findLoopCif(text, '_atom_site.');
  if (!atomLoop) return [];

  const { columns, rows } = atomLoop;

  const groupIdx  = findColIdx(columns, 'atom_site.group_pdb');
  const atomIdx   = findColIdx(columns, 'atom_site.label_atom_id')
                 ?? findColIdx(columns, 'atom_site.auth_atom_id');
  const compIdx   = findColIdx(columns, 'atom_site.label_comp_id')
                 ?? findColIdx(columns, 'atom_site.auth_comp_id');
  const chainIdx  = findColIdx(columns, 'atom_site.label_asym_id')
                 ?? findColIdx(columns, 'atom_site.auth_asym_id');
  const seqIdx    = findColIdx(columns, 'atom_site.label_seq_id')
                 ?? findColIdx(columns, 'atom_site.auth_seq_id');
  const insIdx    = findColIdx(columns, 'atom_site.pdbx_pdb_ins_code');
  const altIdx    = findColIdx(columns, 'atom_site.label_alt_id');
  const xIdx      = findColIdx(columns, 'atom_site.cartn_x');
  const yIdx      = findColIdx(columns, 'atom_site.cartn_y');
  const zIdx      = findColIdx(columns, 'atom_site.cartn_z');

  if (compIdx === null || chainIdx === null || xIdx === null) return [];

  const chains = {};

  for (const row of rows) {
    if (groupIdx !== null && row[groupIdx]?.toUpperCase() !== 'ATOM') continue;
    if (altIdx !== null && row[altIdx] && row[altIdx] !== '.' && row[altIdx] !== 'A') continue;

    const atName  = (atomIdx !== null ? row[atomIdx] : '') || '';
    const resName = row[compIdx] || '';
    if (resName === 'HOH' || resName === 'WAT') continue; // skip water
    const chainId = row[chainIdx] || '';
    if (!resName || !chainId || chainId === '.' || chainId === '?') continue;

    const seqNum  = seqIdx !== null ? row[seqIdx] : '';
    const insCode = (insIdx !== null && row[insIdx] && row[insIdx] !== '?' && row[insIdx] !== '.')
                  ? row[insIdx] : '';

    const x = parseFloat(row[xIdx]);
    const y = parseFloat(row[yIdx]);
    const z = parseFloat(row[zIdx]);
    if (isNaN(x) || isNaN(y) || isNaN(z)) continue;

    const element = guessElement(atName, resName);
    const resKey = String(seqNum) + insCode;

    if (!chains[chainId]) chains[chainId] = { residues: new Map(), atoms: [] };

    let residue = chains[chainId].residues.get(resKey);
    if (!residue) {
      residue = { resName, resNum: parseInt(seqNum) || 0, insCode, atoms: [] };
      chains[chainId].residues.set(resKey, residue);
    }

    const atom = {
      name: atName,
      element,
      x, y, z,
      vdw: vdwRadius(element),
      resName,
      resKey,
      chainId,
    };
    residue.atoms.push(atom);
    chains[chainId].atoms.push(atom);

    // Track sidechain and CA/CB
    if (atName === 'CA') residue._ca = atom;
    if (atName === 'CB') residue._cb = atom;
    if (atName === 'CB' || atName === 'CG' || atName === 'CD' || atName === 'CE' ||
        atName === 'CZ' || atName === 'CH2' || atName === 'CZ2' || atName === 'CZ3' ||
        atName === 'CD1' || atName === 'CD2' || atName === 'CE1' || atName === 'CE2' ||
        atName === 'CE3' || atName === 'CZ2' || atName === 'CZ3' || atName === 'CH2') {
      residue._scAtoms = residue._scAtoms || [];
      residue._scAtoms.push(atom);
    }
  }

  for (const ch of Object.values(chains)) {
    for (const res of ch.residues.values()) {
      if (!res._scAtoms || res._scAtoms.length === 0) {
        res._scAtoms = res._ca ? [res._ca] : [];
      }
      if (!res._cb && res._ca) res._cb = res._ca;
    }
  }

  const result = [];
  for (const [id, data] of Object.entries(chains)) {
    result.push({
      chainId: id,
      residues: Array.from(data.residues.values()).sort((a, b) => a.resNum - b.resNum),
      atoms: data.atoms,
    });
  }
  return result;
}

/* ── CIF helpers ───────────────────────────────────────────── */

function findLoopCif(text, keyPrefix) {
  const prefixLower = (keyPrefix.startsWith('_') ? keyPrefix.slice(1) : keyPrefix).toLowerCase();
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toLowerCase() !== 'loop_') continue;

    const columns = [];
    let j = i + 1;
    while (j < lines.length && lines[j].trim().startsWith('_')) {
      columns.push(lines[j].trim().slice(1).toLowerCase());
      j++;
    }

    if (columns.length === 0 || !columns.some(c => c.startsWith(prefixLower))) {
      while (j < lines.length) {
        const trimmed = lines[j].trim();
        if (trimmed.toLowerCase() === 'loop_' || /^data_/i.test(trimmed) ||
            trimmed.startsWith('_') || trimmed.startsWith('#')) break;
        j++;
      }
      i = j - 1;
      continue;
    }

    const dataLines = [];
    while (j < lines.length) {
      const trimmed = lines[j].trim();
      if (trimmed.toLowerCase() === 'loop_' || /^data_/i.test(trimmed) ||
          trimmed.startsWith('_') || trimmed.startsWith('#')) break;
      dataLines.push(lines[j]);
      j++;
    }

    const rows = tokeniseLoop(dataLines.join('\n'), columns.length);
    return { columns, rows };
  }
  return null;
}

function tokeniseLoop(text, nCols) {
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
    const toks = tokeniseLine(line).map(t => {
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

function tokeniseLine(line) {
  const tokens = [];
  const re = /'([^']*)'|"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    tokens.push(m[1] ?? m[2] ?? m[3]);
  }
  return tokens;
}

function findColIdx(columns, name) {
  const idx = columns.indexOf(name.toLowerCase());
  return idx === -1 ? null : idx;
}

/* ================================================================
   Distance & Contact Detection
================================================================ */

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function residueLabel(res, chainId) {
  const aa1 = AA3TO1[res.resName.toUpperCase()] || 'X';
  return `${chainId}:${aa1}${res.resNum}${res.insCode}`;
}

/* ================================================================
   Interaction Classification
================================================================ */

function classifyInteraction(resA, resB, atomsA, atomsB, threshold) {
  const rnA = resA.resName.toUpperCase();
  const rnB = resB.resName.toUpperCase();
  const types = [];

  // 1. Salt bridge: acidic (D/E) + basic (R/K/H)
  const aNeg = NEGATIVE.has(rnA), aPos = POSITIVE.has(rnA);
  const bNeg = NEGATIVE.has(rnB), bPos = POSITIVE.has(rnB);
  if ((aNeg && bPos) || (aPos && bNeg)) {
    const negAtoms = (aNeg ? atomsA : atomsB).filter(a =>
      (a.name === 'OD1' || a.name === 'OD2' || a.name === 'OE1' || a.name === 'OE2'));
    const posAtoms = (aPos ? atomsA : atomsB).filter(a =>
      (a.name === 'NH1' || a.name === 'NH2' || a.name === 'NE' || a.name === 'NZ' || a.name === 'ND1' || a.name === 'NE2'));
    const saltR = minAtomDistWithAtoms(negAtoms, posAtoms);
    if (saltR !== null && saltR.dist <= 4.0) {
      types.push({ type: 'Salt Bridge', dist: saltR.dist, atomA: saltR.atomA.name, atomB: saltR.atomB.name });
    }
  }

  // 2. Hydrogen bond
  // Cross-check donors from A with acceptors from B, and vice versa
  const dA = [], aA = [], dB = [], aB = [];
  for (const a of atomsA) {
    const nm = a.name.trim();
    if (HBOND_DONORS[nm]) dA.push(a);
    if (HBOND_ACCEPTORS[nm]) aA.push(a);
  }
  for (const a of atomsB) {
    const nm = a.name.trim();
    if (HBOND_DONORS[nm]) dB.push(a);
    if (HBOND_ACCEPTORS[nm]) aB.push(a);
  }

  let hbDist = Infinity;
  let hbAtomA = null, hbAtomB = null;
  for (const donor of dA) for (const acc of aB) {
    const dd = dist(donor, acc);
    if (dd < hbDist) { hbDist = dd; hbAtomA = donor.name; hbAtomB = acc.name; }
  }
  for (const donor of dB) for (const acc of aA) {
    const dd = dist(donor, acc);
    if (dd < hbDist) { hbDist = dd; hbAtomA = acc.name; hbAtomB = donor.name; }
  }
  if (hbDist <= 3.5) {
    types.push({ type: 'Hydrogen Bond', dist: hbDist, atomA: hbAtomA, atomB: hbAtomB });
  }

  // 3. Pi-stacking (aromatic-aromatic)
  const scA = resA._scAtoms || (resA._ca ? [resA._ca] : []);
  const scB = resB._scAtoms || (resB._ca ? [resB._ca] : []);
  const aromA = AROMATIC.has(rnA), aromB = AROMATIC.has(rnB);
  if (aromA && aromB) {
    const piR = minAtomDistWithAtoms(scA, scB);
    if (piR !== null && piR.dist <= 5.5) {
      types.push({ type: 'Pi-Stacking', dist: piR.dist, atomA: piR.atomA.name, atomB: piR.atomB.name });
    }
  }

  // 4. Pi-cation (aromatic + K/R)
  if ((aromA && POSITIVE.has(rnB)) || (aromB && POSITIVE.has(rnA))) {
    const aromAtoms = aromA ? scA : scB;
    const catAtoms = POSITIVE.has(rnA) ? scA : scB;
    const catR = minAtomDistWithAtoms(aromAtoms, catAtoms);
    if (catR !== null && catR.dist <= 6.0) {
      types.push({ type: 'Pi-Cation', dist: catR.dist, atomA: catR.atomA.name, atomB: catR.atomB.name });
    }
  }

  // 5. Hydrophobic
  if (HYDROPHOBIC_RES.has(rnA) && HYDROPHOBIC_RES.has(rnB)) {
    const hydR = minAtomDistWithAtoms(scA, scB);
    if (hydR !== null && hydR.dist <= 5.0) {
      types.push({ type: 'Hydrophobic', dist: hydR.dist, atomA: hydR.atomA.name, atomB: hydR.atomB.name });
    }
  }

  // 6. Van der Waals (fallback, if any atom pair within threshold)
  if (types.length === 0) {
    const vdwR = minAtomDistWithAtoms(atomsA, atomsB);
    if (vdwR !== null && vdwR.dist <= threshold) {
      types.push({ type: 'van der Waals', dist: vdwR.dist, atomA: vdwR.atomA.name, atomB: vdwR.atomB.name });
    }
  }

  return types;
}

function minAtomDist(atoms1, atoms2) {
  if (!atoms1.length || !atoms2.length) return null;
  let best = Infinity;
  for (const a of atoms1) {
    for (const b of atoms2) {
      const d = dist(a, b);
      if (d < best) best = d;
    }
  }
  return best === Infinity ? null : best;
}

function minAtomDistWithAtoms(atoms1, atoms2) {
  if (!atoms1.length || !atoms2.length) return null;
  let best = Infinity;
  let bestA = null, bestB = null;
  for (const a of atoms1) {
    for (const b of atoms2) {
      const d = dist(a, b);
      if (d < best) { best = d; bestA = a; bestB = b; }
    }
  }
  return best === Infinity ? null : { dist: best, atomA: bestA, atomB: bestB };
}

function minResDist(res1, res2) {
  return minAtomDist(res1.atoms, res2.atoms);
}

/* ================================================================
   Shrake-Rupley SASA
================================================================ */

const PROBE_RADIUS = 1.4;
const N_SPHERE_PTS = 120;
const SPHERE_PTS = fibSpherePoints(N_SPHERE_PTS);

function computeSASA(atomsAll) {
  // Pre-compute effective radii
  const radii = atomsAll.map(a => a.vdw + PROBE_RADIUS);
  const n = atomsAll.length;
  const areaPerPoint = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    areaPerPoint[i] = (4 * Math.PI * radii[i] * radii[i]) / N_SPHERE_PTS;
  }

  // Find neighbors for each atom
  const neighbors = [];
  for (let i = 0; i < n; i++) {
    const nbrs = [];
    const a = atomsAll[i];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = a.vdw + atomsAll[j].vdw + 2 * PROBE_RADIUS;
      const d2 = distSq(a, atomsAll[j]);
      if (d2 <= d * d) nbrs.push(j);
    }
    neighbors.push(nbrs);
  }

  const sasa = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const a = atomsAll[i];
    const r = radii[i];
    let accessible = 0;
    for (const pt of SPHERE_PTS) {
      // Point on solvent-accessible surface
      const sx = a.x + pt.x * r;
      const sy = a.y + pt.y * r;
      const sz = a.z + pt.z * r;
      let blocked = false;
      for (const j of neighbors[i]) {
        const b = atomsAll[j];
        const dx = sx - b.x, dy = sy - b.y, dz = sz - b.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        const cutoff = b.vdw + PROBE_RADIUS;
        if (d2 < cutoff * cutoff) { blocked = true; break; }
      }
      if (!blocked) accessible++;
    }
    sasa[i] = areaPerPoint[i] * accessible;
  }
  return sasa;
}

function distSq(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function groupSasaByResidue(atoms, sasaValues) {
  // atoms and sasaValues are aligned by index
  const map = new Map(); // resKey_chainId -> { total, atoms: [{atom, sasa}] }
  for (let i = 0; i < atoms.length; i++) {
    const a = atoms[i];
    const key = `${a.resKey}_${a.chainId}`;
    if (!map.has(key)) map.set(key, { resName: a.resName, resNum: parseInt(a.resName) || 0, chainId: a.chainId, resKey: a.resKey, total: 0, aa: AA3TO1[a.resName.toUpperCase()] || 'X' });
    map.get(key).total += sasaValues[i];
  }
  return Array.from(map.values());
}

/* ================================================================
   Main Analysis Pipeline
================================================================ */

function analyzeInterface(chains, side1Ids, side2Ids, distanceThreshold) {
  // Find chains for each side
  const side1Chains = chains.filter(c => side1Ids.includes(c.chainId));
  const side2Chains = chains.filter(c => side2Ids.includes(c.chainId));

  if (!side1Chains.length || !side2Chains.length) {
    throw new Error('Selected chains not found in structure.');
  }

  // Collect all atoms for SASA
  const allAtoms = [];
  const side1Atoms = [], side2Atoms = [];
  const side1Residues = [], side2Residues = [];

  for (const c of side1Chains) {
    for (const r of c.residues) {
      side1Residues.push({ ...r, chainId: c.chainId });
      for (const a of r.atoms) {
        a._residue = r;
        a._chainId = c.chainId;
      }
      side1Atoms.push(...r.atoms);
    }
  }
  for (const c of side2Chains) {
    for (const r of c.residues) {
      side2Residues.push({ ...r, chainId: c.chainId });
      for (const a of r.atoms) {
        a._residue = r;
        a._chainId = c.chainId;
      }
      side2Atoms.push(...r.atoms);
    }
  }

  allAtoms.push(...side1Atoms, ...side2Atoms);

  if (!side1Atoms.length || !side2Atoms.length) {
    throw new Error('No atoms found in selected chains.');
  }

  // 1. Detect interface residues (any atom pair within threshold)
  const interfacePairs = [];
  const epitopeSet = new Set();  // side2 residues in contact
  const paratopeSet = new Set(); // side1 residues in contact

  for (const r1 of side1Residues) {
    for (const r2 of side2Residues) {
      const d = minResDist(r1, r2);
      if (d !== null && d <= distanceThreshold) {
        const types = classifyInteraction(r1, r2, r1.atoms, r2.atoms, distanceThreshold);
        interfacePairs.push({
          chainA: r1.chainId, resA: r1,
          chainB: r2.chainId, resB: r2,
          dist: d,
          interactions: types,
        });
        paratopeSet.add(resKey(r1, r1.chainId));
        epitopeSet.add(resKey(r2, r2.chainId));
      }
    }
  }

  // 2. SASA calculation
  // SASA of the complex
  const sasaComplex = computeSASA(allAtoms);

  // SASA of side1 alone
  const sasaSide1Alone = computeSASA(side1Atoms);

  // SASA of side2 alone
  const sasaSide2Alone = computeSASA(side2Atoms);

  // Group by residue
  const resSasaComplex = groupSasaByResidue(allAtoms, sasaComplex);
  const resSasaSide1 = groupSasaByResidue(side1Atoms, sasaSide1Alone);
  const resSasaSide2 = groupSasaByResidue(side2Atoms, sasaSide2Alone);

  // Build deltaSASA maps
  const deltaSasaMap = new Map();
  for (const r of resSasaComplex) {
    deltaSasaMap.set(`${r.resKey}_${r.chainId}`, { complex: r.total, alone: null, delta: 0 });
  }
  for (const r of resSasaSide1) {
    const k = `${r.resKey}_${r.chainId}`;
    const entry = deltaSasaMap.get(k);
    if (entry) { entry.alone = r.total; entry.delta = r.total - entry.complex; }
  }
  for (const r of resSasaSide2) {
    const k = `${r.resKey}_${r.chainId}`;
    const entry = deltaSasaMap.get(k);
    if (entry) { entry.alone = r.total; entry.delta = r.total - entry.complex; }
  }

  // 3. Compute per-residue deltaSASA for interface residues
  const epitopeDelta = [], paratopeDelta = [];
  for (const r of [...side2Residues]) {
    const k = resKey(r, r.chainId);
    if (epitopeSet.has(k)) {
      const ds = deltaSasaMap.get(k);
      epitopeDelta.push({ res: r, label: residueLabel(r, r.chainId), chainId: r.chainId, deltaSASA: ds ? ds.delta : 0 });
    }
  }
  for (const r of [...side1Residues]) {
    const k = resKey(r, r.chainId);
    if (paratopeSet.has(k)) {
      const ds = deltaSasaMap.get(k);
      paratopeDelta.push({ res: r, label: residueLabel(r, r.chainId), chainId: r.chainId, deltaSASA: ds ? ds.delta : 0 });
    }
  }

  // 4. Summary stats
  const totalDeltaSASA = [...deltaSasaMap.values()].reduce((s, v) => s + Math.max(0, v.delta), 0);
  const buriedArea = totalDeltaSASA;

  const interactionCounts = {};
  for (const pair of interfacePairs) {
    for (const it of pair.interactions) {
      interactionCounts[it.type] = (interactionCounts[it.type] || 0) + 1;
    }
  }

  return {
    interfacePairs,
    epitopeResidues: epitopeDelta,
    paratopeResidues: paratopeDelta,
    numEpitope: epitopeSet.size,
    numParatope: paratopeSet.size,
    totalDeltaSASA: buriedArea,
    interactionCounts,
    numContacts: interfacePairs.length,
    threshold: distanceThreshold,
  };
}

function resKey(res, chainId) {
  return `${res.resNum}${res.insCode}_${chainId}`;
}

/* ================================================================
   UI State
================================================================ */

let currentFile = null;
let currentChains = null;
let distanceThreshold = 5.0;
let tablePairs = null;       // cached for sorting
let tableSide1Label = '';
let tableSide2Label = '';
let sortCol = 'dist';        // current sort column
let sortAsc = true;          // ascending?

const dropZone     = document.getElementById('drop-zone');
const fileInput    = document.getElementById('file-input');
const analyzeBtn   = document.getElementById('analyze-btn');
const errorBox     = document.getElementById('error-box');
const outputSection = document.getElementById('output-section');
const chainSelector = document.getElementById('chain-selector');
const interfaceDef  = document.getElementById('interface-def');
const thresholdInput = document.getElementById('threshold-input');
const thresholdVal   = document.getElementById('threshold-val');

// ── Drag & Drop ─────────────────────────────────────────────

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
  const name = file.name.toLowerCase();
  if (!name.endsWith('.pdb') && !name.endsWith('.cif') && !name.endsWith('.ent') && !name.endsWith('.mmcif')) {
    showError('Please upload a .pdb, .cif, .mmcif, or .ent file.');
    return;
  }
  currentFile = file;
  document.getElementById('file-name-display').textContent = `✔ ${file.name}`;
  dropZone.classList.add('has-file');
  clearError();
  outputSection.style.display = 'none';

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result;
      const name = file.name.toLowerCase();
      currentChains = (name.endsWith('.cif') || name.endsWith('.mmcif'))
        ? parseCIFAtoms(text)
        : parsePDBAtoms(text);

      if (!currentChains.length) throw new Error('No protein chains found.');
      renderChainSelector(currentChains);
      analyzeBtn.disabled = false;
    } catch (err) {
      showError(err.message);
    }
  };
  reader.readAsText(file);
}

// ── Chain Selector ──────────────────────────────────────────

function renderChainSelector(chains) {
  const chainInfo = chains.map(c => {
    const resCount = c.residues.length;
    return `<span class="chain-chip" data-chain="${c.chainId}">${c.chainId} (${resCount} res)</span>`;
  }).join('');
  chainSelector.innerHTML = chainInfo;
  chainSelector.style.display = 'block';
  document.getElementById('options-card').style.display = 'block';
}

// ── Threshold ───────────────────────────────────────────────

thresholdInput.addEventListener('input', () => {
  distanceThreshold = parseFloat(thresholdInput.value);
  thresholdVal.textContent = distanceThreshold.toFixed(1);
});

// ── Parse interface definition ──────────────────────────────

function parseInterfaceDef(def) {
  // Supports: "A-B", "A,B-C", "A/B-C,D" etc.
  const parts = def.split(/\s*[-/]\s*/);
  if (parts.length !== 2) throw new Error('Interface definition must have two sides separated by "-" or "/" (e.g. "A-B" or "A,B-C").');

  const side1 = parts[0].split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);
  const side2 = parts[1].split(/\s*,\s*/).map(s => s.trim()).filter(Boolean);

  if (!side1.length || !side2.length) {
    throw new Error('Both sides of the interface must have at least one chain.');
  }
  return [side1, side2];
}

// ── Analyze ─────────────────────────────────────────────────

function analyze() {
  if (!currentFile || !currentChains) return;
  clearError();

  try {
    const def = interfaceDef.value.trim();
    if (!def) throw new Error('Please define the interface (e.g. "A-B" or "A,B-C").');

    const [side1, side2] = parseInterfaceDef(def);
    const threshold = distanceThreshold;

    // Validate chain IDs
    const knownChains = new Set(currentChains.map(c => c.chainId));
    for (const c of [...side1, ...side2]) {
      if (!knownChains.has(c)) throw new Error(`Chain "${c}" not found. Available: ${[...knownChains].join(', ')}`);
    }

    const result = analyzeInterface(currentChains, side1, side2, threshold);
    renderResults(result, side1, side2);
  } catch (err) {
    showError(err.message);
  }
}

// ── Render Results ──────────────────────────────────────────

function renderResults(result, side1, side2) {
  const side1Label = side1.join(',');
  const side2Label = side2.join(',');

  // --- Summary ---
  let summaryHtml = `<div class="summary-grid">`;

  summaryHtml += `<div class="summary-item"><span class="sum-val">${result.numContacts}</span><span class="sum-lbl">Contact Pairs</span></div>`;
  summaryHtml += `<div class="summary-item"><span class="sum-val">${result.numParatope}</span><span class="sum-lbl">Paratope Residues (${side1Label})</span></div>`;
  summaryHtml += `<div class="summary-item"><span class="sum-val">${result.numEpitope}</span><span class="sum-lbl">Epitope Residues (${side2Label})</span></div>`;
  summaryHtml += `<div class="summary-item"><span class="sum-val">${result.totalDeltaSASA.toFixed(1)} Å²</span><span class="sum-lbl">Buried Surface Area (ΔSASA)</span></div>`;

  summaryHtml += `</div>`;

  // Interaction counts
  if (Object.keys(result.interactionCounts).length > 0) {
    summaryHtml += `<div class="interaction-counts">`;
    const order = ['Hydrogen Bond', 'Salt Bridge', 'Pi-Stacking', 'Pi-Cation', 'Hydrophobic', 'van der Waals'];
    for (const t of order) {
      if (result.interactionCounts[t]) {
        summaryHtml += `<span class="int-chip int-${t.toLowerCase().replace(/\s+/g,'-')}">${t}: ${result.interactionCounts[t]}</span>`;
      }
    }
    summaryHtml += `</div>`;
  }

  // Interface definition
  summaryHtml += `<p style="font-size:0.82rem;color:var(--slate);margin-top:8px;">Interface: <strong>${side1Label}</strong> — <strong>${side2Label}</strong> | Distance cutoff: <strong>${result.threshold.toFixed(1)} Å</strong></p>`;

  document.getElementById('summary-content').innerHTML = summaryHtml;

  // --- Epitope / Paratope lists ---
  const epiList = result.epitopeResidues
    .sort((a, b) => a.res.resNum - b.res.resNum)
    .map(r => `<span class="res-chip" title="ΔSASA: ${r.deltaSASA.toFixed(1)} Å²">${r.label} (Δ${r.deltaSASA.toFixed(1)})</span>`)
    .join(' ');
  const paraList = result.paratopeResidues
    .sort((a, b) => a.res.resNum - b.res.resNum)
    .map(r => `<span class="res-chip" title="ΔSASA: ${r.deltaSASA.toFixed(1)} Å²">${r.label} (Δ${r.deltaSASA.toFixed(1)})</span>`)
    .join(' ');

  document.getElementById('epitope-content').innerHTML = epiList
    || '<span style="color:var(--slate);font-size:0.85rem;">No epitope residues detected.</span>';
  document.getElementById('paratope-content').innerHTML = paraList
    || '<span style="color:var(--slate);font-size:0.85rem;">No paratope residues detected.</span>';
  document.getElementById('epitope-chain-label').textContent = `Epitope (${side2Label})`;
  document.getElementById('paratope-chain-label').textContent = `Paratope (${side1Label})`;

  // --- Detailed Table ---
  renderTable(result, side1Label, side2Label);

  outputSection.style.display = 'block';
  outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderTable(result, side1Label, side2Label) {
  tablePairs = result.interfacePairs;
  tableSide1Label = side1Label;
  tableSide2Label = side2Label;
  sortCol = 'dist';
  sortAsc = true;
  renderTableBody();
}

function sortTable(col) {
  if (sortCol === col) {
    sortAsc = !sortAsc;
  } else {
    sortCol = col;
    sortAsc = true;
  }
  renderTableBody();
}

function renderTableBody() {
  const rows = [...tablePairs];

  const cmp = (a, b) => {
    let va, vb;
    switch (sortCol) {
      case 'chainA':
        va = residueLabel(a.resA, a.chainA); vb = residueLabel(b.resA, b.chainA);
        return va.localeCompare(vb);
      case 'chainB':
        va = residueLabel(a.resB, a.chainB); vb = residueLabel(b.resB, b.chainB);
        return va.localeCompare(vb);
      case 'dist':
        return a.dist - b.dist;
      case 'interactions':
        va = a.interactions.map(it => it.type).join(',');
        vb = b.interactions.map(it => it.type).join(',');
        return va.localeCompare(vb);
      default:
        return 0;
    }
  };

  rows.sort((a, b) => sortAsc ? cmp(a, b) : cmp(b, a));

  const arrow = (col) => {
    if (sortCol !== col) return '';
    return sortAsc ? ' ▲' : ' ▼';
  };

  let html = `<div class="table-wrap"><table class="result-table">
    <thead><tr>
      <th>#</th>
      <th class="sortable" onclick="sortTable('chainA')">${tableSide1Label} Residue${arrow('chainA')}</th>
      <th class="sortable" onclick="sortTable('chainB')">${tableSide2Label} Residue${arrow('chainB')}</th>
      <th class="sortable" onclick="sortTable('dist')">Min Dist (Å)${arrow('dist')}</th>
      <th class="sortable" onclick="sortTable('interactions')">Interactions${arrow('interactions')}</th>
    </tr></thead><tbody>`;

  for (let i = 0; i < rows.length; i++) {
    const pair = rows[i];
    const labelA = residueLabel(pair.resA, pair.chainA);
    const labelB = residueLabel(pair.resB, pair.chainB);
    const intTypes = pair.interactions.map(it => {
      const atomInfo = it.atomA && it.atomB ? ` (${it.atomA}–${it.atomB})` : '';
      return `<span class="int-tag int-${it.type.toLowerCase().replace(/\s+/g,'-')}">${it.type}${atomInfo}</span>`;
    }).join('');

    html += `<tr>
      <td>${i + 1}</td>
      <td><strong>${labelA}</strong> <span class="aa-type">${pair.resA.resName}</span></td>
      <td><strong>${labelB}</strong> <span class="aa-type">${pair.resB.resName}</span></td>
      <td>${pair.dist.toFixed(2)}</td>
      <td>${intTypes || '—'}</td>
    </tr>`;
  }

  html += `</tbody></table></div>`;
  html += `<p style="font-size:0.82rem;color:var(--slate);margin-top:8px;">Showing ${rows.length} residue contact pairs. Click column headers to sort.</p>`;
  document.getElementById('table-content').innerHTML = html;
}

// ── Export ──────────────────────────────────────────────────

function exportTSV() {
  if (!outputSection.style.display || outputSection.style.display === 'none') return;
  const rows = document.querySelectorAll('.result-table tbody tr');
  let tsv = '#\tChain1_Res\tChain2_Res\tDist_Å\tInteractions\n';
  rows.forEach((row, i) => {
    const cells = row.querySelectorAll('td');
    tsv += `${i + 1}\t${cells[1].textContent.trim()}\t${cells[2].textContent.trim()}\t${cells[3].textContent.trim()}\t${cells[4].textContent.trim()}\n`;
  });
  downloadBlob(tsv, 'interface_contacts.tsv', 'text/tab-separated-values');
}

function exportCSV() {
  if (!outputSection.style.display || outputSection.style.display === 'none') return;
  const rows = document.querySelectorAll('.result-table tbody tr');
  let csv = '#,Chain1_Res,Chain2_Res,Dist_Å,Interactions\n';
  rows.forEach((row, i) => {
    const cells = row.querySelectorAll('td');
    csv += `${i + 1},"${cells[1].textContent.trim()}","${cells[2].textContent.trim()}",${cells[3].textContent.trim()},"${cells[4].textContent.trim()}"\n`;
  });
  downloadBlob(csv, 'interface_contacts.csv', 'text/csv');
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Error helpers ───────────────────────────────────────────

function showError(msg) {
  errorBox.textContent = `⚠ ${msg}`;
  errorBox.style.display = 'block';
}

function clearError() {
  errorBox.textContent = '';
  errorBox.style.display = 'none';
}

// ── Tab switching ───────────────────────────────────────────

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

  document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}
