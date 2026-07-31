/**
 * i18n.js — BioTools shared internationalisation module
 *
 * Usage:
 *   1. Include this script (in <head> or before </body>).
 *   2. Add data-i18n="key" to any element whose innerHTML should be swapped.
 *   3. Add data-i18n-placeholder="key" to inputs/textareas whose placeholder
 *      should be swapped.
 *   Clicking the injected EN | 中文 button calls window.setLang(lang).
 */
(function () {
  'use strict';

  /* ── Lang-switcher styles ──────────────────────────────────── */
  const _css = document.createElement('style');
  _css.textContent = [
    'header { position: relative; }',
    '.lang-switcher {',
    '  position: absolute; top: 14px; right: 20px;',
    '  display: flex; align-items: center; gap: 3px; z-index: 10;',
    '}',
    '.lang-btn {',
    '  background: rgba(255,255,255,0.15);',
    '  border: 1px solid rgba(255,255,255,0.35);',
    '  color: #fff; padding: 3px 10px; border-radius: 5px;',
    '  font-size: 0.78rem; font-weight: 600; cursor: pointer;',
    '  letter-spacing: 0.4px; transition: background 0.15s; line-height: 1.7;',
    '}',
    '.lang-btn:hover { background: rgba(255,255,255,0.28); }',
    '.lang-btn.lang-active {',
    '  background: rgba(255,255,255,0.35);',
    '  border-color: rgba(255,255,255,0.75);',
    '}',
    '.lang-sep { color: rgba(255,255,255,0.4); font-size: 0.85rem; padding: 0 1px; }'
  ].join('\n');
  document.head.appendChild(_css);

  /* ── Translation table ─────────────────────────────────────── */
  var T = {
    en: {
      /* page <title> elements */
      'page.index':   'BioTools \u2014 Biological Data Analysis Tools',
      'page.p2f':     'Protein Structure \u2192 FASTA | BioTools',
      'page.cifpdb':  'CIF \u2194 PDB Converter | BioTools',
      'page.viewer':  'Protein Structure Viewer | BioTools',
      'page.align':   'Pairwise Sequence Alignment | BioTools',
      'page.msa':     'Multiple Sequence Alignment | BioTools',
      'page.cdr':     'Antibody CDR Annotator | BioTools',
      'page.mut':     'Protein Mutation | BioTools',
      'page.iface':   'Interface Analysis | BioTools',

      /* breadcrumb page names */
      'nav.p2f':    'Protein Structure \u2192 FASTA',
      'nav.cifpdb': 'CIF \u2194 PDB Converter',
      'nav.viewer': 'Protein Structure Viewer',
      'nav.align':  'Pairwise Sequence Alignment',
      'nav.msa':    'Multiple Sequence Alignment',
      'nav.cdr':    'Antibody CDR Annotator',
      'nav.mut':    'Protein Mutation',
      'nav.iface':  'Interface Analysis',

      /* common */
      'common.browse':   'Browse file',
      'common.copy':     '\u29c9 Copy',
      'common.download': '\u2b07 Download',
      'common.footer':          'Runs entirely in your browser \u2014 no data is ever uploaded to any server.',
      'common.footer.branded':  'BioTools \u2014 runs entirely in your browser. No data is sent to any server.',
      'common.dz.primary':   'Drag &amp; drop your PDB or CIF file here',
      'common.dz.secondary': 'or click the button below to browse',
      'common.load-example': '\ud83d\udccb Load example',
      'common.clear':    'Clear',
      'common.align':    'Align',

      /* ── index.html ────────────────────────────────────────── */
      'index.subtitle': 'A collection of browser-based biological data analysis tools \u2014 no installation required.',
      'index.section':  'Available Tools',
      'index.footer':   'BioTools \u2014 runs entirely in your browser. No data is sent to any server.',

      'card.p2f.name': 'Protein Structure \u2192 FASTA',
      'card.p2f.desc': 'Upload a PDB or mmCIF file and extract the amino-acid sequence as FASTA. Supports one-line and multi-line output.',
      'card.p2f.tag':  'Structure',

      'card.cifpdb.name': 'CIF \u2194 PDB Converter',
      'card.cifpdb.desc': 'Convert between mmCIF and PDB structure formats. Preserves atom coordinates, cell parameters, and symmetry information.',
      'card.cifpdb.tag':  'Structure',

      'card.viewer.name': 'Protein Structure Viewer',
      'card.viewer.desc': 'Visualize PDB and mmCIF protein structures in 3D interactively. Upload a local file or fetch any entry directly from RCSB PDB by ID.',
      'card.viewer.tag':  'Visualization',

      'card.align.name': 'Pairwise Sequence Alignment',
      'card.align.desc': 'Align two protein sequences with Needleman-Wunsch (global) or Smith-Waterman (local) using BLOSUM62, PAM250, or custom scoring.',
      'card.align.tag':  'Sequence',

      'card.msa.name': 'Multiple Sequence Alignment',
      'card.msa.desc': 'Align multiple protein sequences using center-star progressive alignment with BLOSUM62. Visualize with Clustal, Taylor, hydrophobicity, or conservation color schemes.',
      'card.msa.tag':  'Sequence',

      'card.cdr.name': 'Antibody CDR Annotator',
      'card.cdr.desc': 'Identify CDR1/2/3 loops in VH/VL sequences using Kabat, Chothia, IMGT, Martin, or Contact numbering schemes. Fully client-side.',
      'card.cdr.tag':  'Antibody',

      'card.mut.name': 'Protein Mutation',
      'card.mut.desc': 'Number residues in protein sequences and introduce point mutations interactively (click-to-mutate) or via text notation (e.g. A20N,F54Y). Outputs mutated FASTA.',
      'card.mut.tag':  'Sequence',

      'card.iface.name': 'Interface Analysis',
      'card.iface.desc': 'Analyze protein-protein interfaces: detect hydrogen bonds, salt bridges, hydrophobic, pi-stacking, pi-cation interactions. Compute buried surface area (\u0394SASA) and identify epitope/paratope residues.',
      'card.iface.tag':  'Structure',

      /* ── Protein Structure \u2192 FASTA ──────────────────────────── */
      'p2f.h1':          '\ud83d\udd2c Protein Structure \u2192 FASTA',
      'p2f.subtitle':    'Extract amino-acid sequences from a PDB or mmCIF file and export as FASTA.',
      'p2f.step1':       '\u2460 Upload Structure File',
      'p2f.step2':       '\u2461 Options',
      'p2f.seqsrc':      'Sequence source',
      'p2f.struct':      'Structure-derived',
      'p2f.struct.desc': 'Extracted from ATOM coordinates (C\u03b1 atoms). Reflects residues actually present in the model \u2014 recommended for AI-predicted structures.',
      'p2f.author':      'Author-annotated',
      'p2f.author.desc': 'From SEQRES / _entity_poly records. May include residues not resolved in the structure.',
      'p2f.outfmt':      'Output format',
      'p2f.oneline':     'One-line FASTA',
      'p2f.oneline.desc':   'Each sequence on a single line following the header.',
      'p2f.multiline':      'Multi-line FASTA',
      'p2f.multiline.desc': 'Sequence wrapped at 60 characters per line (standard).',
      'p2f.convert':   '\u2462 Convert to FASTA',
      'p2f.step4':     '\u2463 FASTA Output',
      'p2f.dl-fasta':  '\u2b07 Download .fasta',

      /* ── CIF \u2194 PDB Converter ──────────────────────────────────── */
      'cifpdb.h1':          '\ud83d\udd04 CIF \u2194 PDB Converter',
      'cifpdb.subtitle':    'Convert between mmCIF and PDB structure formats \u2014 entirely in your browser.',
      'cifpdb.step1':       '\u2460 Upload Structure File',
      'cifpdb.step2':       '\u2461 Conversion Direction',
      'cifpdb.dir-note':    'Upload a file to detect the conversion direction automatically.',
      'cifpdb.convert':     '\u2462 Convert',
      'cifpdb.step4':       '\u2463 Converted Output',
      'cifpdb.dz.primary':  'Drag &amp; drop your PDB or CIF file here',

      /* ── Protein Structure Viewer ─────────────────────────────── */
      'viewer.h1':       '\ud83d\udd2d Protein Structure Viewer',
      'viewer.subtitle': 'Visualize PDB and mmCIF protein structures interactively \u2014 entirely in your browser.',
      'viewer.tab.file': '\ud83d\udcc2 Upload File',
      'viewer.tab.pdb':  '\ud83d\udd0d Fetch by PDB ID',
      'viewer.dz.primary':   'Drag &amp; drop your structure file here',
      'viewer.dz.secondary': 'Supported: .pdb, .cif, .mmcif, .ent',
      'viewer.pdb.load': 'Load',
      'viewer.visualize':  '\u2461 Visualize Structure',
      'viewer.3d-header':  '\u2462 3D Viewer',
      'viewer.cm-toggle':  'Show Contact Map',
      'viewer.placeholder': 'Upload a file or enter a PDB ID to visualize a structure',
      'viewer.cm.contact':  'Contact map',
      'viewer.cm.distance': 'Distance map',
      'viewer.footer': 'Runs entirely in your browser \u2014 no data is ever uploaded to any server. '
        + '3D visualization powered by <a href="https://molstar.org/" target="_blank" rel="noopener noreferrer" style="color:inherit">Mol*</a>. '
        + 'Optional contact map powered by <a href="https://plotly.com/javascript/" target="_blank" rel="noopener noreferrer" style="color:inherit">Plotly.js</a> (loaded on demand).',

      /* ── Pairwise Sequence Alignment ──────────────────────────── */
      'align.h1':       '\ud83d\udd17 Pairwise Sequence Alignment',
      'align.subtitle': 'Align two protein sequences with Needleman-Wunsch (global) or Smith-Waterman (local) using affine gap penalties.',
      'align.step1':    '\u2460 Sequences',
      'align.step2':    '\u2461 Parameters',
      'align.step3':    '\u2462 Alignment Results',
      'align.name':     'Name',
      'align.seq-label': 'Sequence (FASTA or raw amino acids)',
      'align.load-ex':   '\ud83d\udccb Load example sequences',
      'align.algorithm': 'Algorithm',
      'align.algo.global': 'Global (Needleman-Wunsch)',
      'align.algo.local':  'Local (Smith-Waterman)',
      'align.matrix':      'Substitution Matrix',
      'align.matrix.simple': 'Simple (match / mismatch)',
      'align.match':       'Match score',
      'align.mismatch':    'Mismatch score',
      'align.gap-open':    'Gap open penalty',
      'align.gap-extend':  'Gap extension penalty',
      'align.btn':         '\u26a1 Align',
      'align.copy':        '\u29c9 Copy',
      'align.download':    '\u2b07 Download',
      'align.seq1-ph':     'Paste FASTA or raw amino acid sequence\u2026',
      'align.seq2-ph':     'Paste FASTA or raw amino acid sequence\u2026',

      /* ── Multiple Sequence Alignment ──────────────────────────── */
      'msa.h1':       '\u2734 Multiple Sequence Alignment',
      'msa.subtitle': 'Align multiple protein sequences using center-star progressive alignment with BLOSUM62 scoring.',
      'msa.input':    'Input Sequences',
      'msa.fasta-label': 'FASTA sequences (minimum 2, recommended \u2264 20)',
      'msa.example':  'Load Example',
      'msa.clear':    'Clear',
      'msa.params':   'Parameters',
      'msa.gap-open':  'Gap open penalty',
      'msa.gap-ext':   'Gap extension penalty',
      'msa.colorscheme': 'Color scheme',
      'msa.color.none':  'None (monochrome)',
      'msa.progress':  'Computing pairwise alignments\u2026',
      'msa.align':     'Align',
      'msa.results':   'Alignment Results',
      'msa.download':  '\u2b07 Download FASTA',
      'msa.copy':      '\u2398 Copy',
      'msa.fasta-ph':  '>Sequence_1\nACDEFGHIKLMNPQRSTVWY\n>Sequence_2\nACDEFGHIKLMNPQRSTVWY\n>Sequence_3\nACDEFGHIKLMNPQRSTV',

      /* ── Antibody CDR Annotator ───────────────────────────────── */
      'cdr.h1': '\ud83d\udd16 Antibody CDR Annotator',
      'cdr.subtitle': 'Identify CDR1/2/3 loops in VH/VL sequences using Kabat or IMGT numbering, powered by '
        + '<a href="https://immunum.enpicom.com" target="_blank" rel="noopener" class="header-link">immunum</a>. Fully client-side.',
      'cdr.step1':   '\u2460 Sequence Input',
      'cdr.seq-label': 'Amino-acid sequence (FASTA or raw)',
      'cdr.seq-ph':  'Paste a single VH or VL amino-acid sequence in FASTA or raw format\u2026',
      'cdr.chain':   'Chain type',
      'cdr.auto':    'Auto-detect',
      'cdr.scheme':  'Numbering scheme',
      'cdr.load-ex': '\ud83d\udccb Load example (Trastuzumab VH)',
      'cdr.step2':   '\u2461 Annotation Results',
      'cdr.framework':  'Framework',
      'cdr.tab.annotated': 'Annotated Sequence',
      'cdr.tab.table':     'CDR Table',
      'cdr.tab.numbered':  'Numbered Alignment',
      'cdr.copy-fasta':    '\u29c9 Copy CDRs (FASTA)',
      'cdr.dl-tsv':        '\u2b07 Download TSV',
      'cdr.accuracy': '<strong style="color:var(--text)">\u2139\ufe0f Accuracy note:</strong> '
        + 'CDR annotation is powered by <a href="https://immunum.enpicom.com" target="_blank" rel="noopener">immunum</a>, '
        + 'which uses Needleman-Wunsch semi-global alignment with PSSM scoring matrices for accurate antibody (IGH/IGK/IGL) '
        + 'numbering. Kabat and IMGT schemes are supported.',
      'cdr.footer': 'Runs entirely in your browser \u2014 no data is ever sent to any server.',

      /* ── Protein Mutation ─────────────────────────────────────── */
      'mut.h1':       '\ud83d\udd2f Protein Mutation',
      'mut.subtitle': 'Number residues in protein sequences and introduce point mutations interactively or via text notation (e.g. A20N,F54Y).',
      'mut.input':    'Input Sequences',
      'mut.seq-label': 'FASTA sequences (one or more)',
      'mut.run':      'Number &amp; Display Sequences',
      'mut.example':  'Load Example',
      'mut.editor':   'Mutation Editor',
      'mut.tab.interactive': 'Interactive',
      'mut.tab.text':        'Text Notation',
      'mut.interactive.hint': 'Click any residue to change it. Mutated residues are highlighted in amber.',
      'mut.text.hint': 'Enter mutations separated by commas. Each mutation uses the format <strong>OrigAA&thinsp;Position&thinsp;NewAA</strong> (e.g. <code>A20N,F54Y</code>). The original amino acid is optional but will be validated when provided.',
      'mut.seq-select': 'Apply to sequence',
      'mut.mutations':  'Mutations',
      'mut.hint':       'Format: [OrigAA]Position[NewAA] \u2014 e.g. A20N or just 20N or A20N,F54Y',
      'mut.apply':      'Apply',
      'mut.reset':      'Reset All Mutations',
      'mut.results':    'Mutated Sequences',
      'mut.copy':       'Copy FASTA',
      'mut.download':   'Download FASTA',
      'mut.popup.title': 'Mutate residue',
      'mut.popup.cancel': 'Cancel',
      'mut.mut-ph':     'A20N,F54Y',
      'mut.seq-ph':     '>SequenceName\nMKTAYIAKQRQISFVK...',

      /* ── Interface Analysis ───────────────────────────────────── */
      'iface.h1':       '\ud83d\udd17 Protein Interface Analysis',
      'iface.subtitle': 'Analyze protein-protein interfaces: detect interaction types, identify epitope/paratope residues, and compute buried surface area (\u0394SASA).',
      'iface.step1':    '\u2460 Upload Structure File',
      'iface.step2':    '\u2461 Interface Options',
      'iface.chains-detected': 'Chains detected',
      'iface.define':   'Interface definition',
      'iface.placeholder': 'e.g. A-B or A,B-C',
      'iface.hint':     'Define which chains form the interface. Use "-" or "/" to separate the two sides, and "," for multiple chains on one side. Examples: <code>A-B</code>, <code>HL-A</code>, <code>A,B-C</code>',
      'iface.threshold': 'Distance threshold (\u00c5)',
      'iface.threshold.hint': 'Any two residue pair with closest heavy-atom distance \u2264 this value is considered a contact. Typical values: 4.0\u20136.0 \u00c5.',
      'iface.analyze':  '\u2462 Analyze Interface',
      'iface.step4':    '\u2463 Analysis Results',
      'iface.dl-tsv':   '\u2b07 Download TSV',
      'iface.dl-csv':   '\u2b07 Download CSV',
      'iface.tab.summary': 'Summary',
      'iface.tab.table':   'Contact Table',
      'iface.tab.epitope': 'Epitope / Paratope',
    },

    zh: {
      /* page <title> elements */
      'page.index':   'BioTools \u2014 \u751f\u7269\u6570\u636e\u5206\u6790\u5de5\u5177',
      'page.p2f':     '\u86cb\u767d\u8d28\u7ed3\u6784 \u2192 FASTA | BioTools',
      'page.cifpdb':  'CIF \u2194 PDB \u8f6c\u6362\u5668 | BioTools',
      'page.viewer':  '\u86cb\u767d\u8d28\u7ed3\u6784\u67e5\u770b\u5668 | BioTools',
      'page.align':   '\u53cc\u5e8f\u5217\u6bd4\u5bf9 | BioTools',
      'page.msa':     '\u591a\u5e8f\u5217\u6bd4\u5bf9 | BioTools',
      'page.cdr':     '\u6297\u4f53 CDR \u6807\u6ce8\u5668 | BioTools',
      'page.mut':     '\u86cb\u767d\u8d28\u7a81\u53d8 | BioTools',
      'page.iface':   '\u754c\u9762\u5206\u6790 | BioTools',

      /* breadcrumb page names */
      'nav.p2f':    '\u86cb\u767d\u8d28\u7ed3\u6784 \u2192 FASTA',
      'nav.cifpdb': 'CIF \u2194 PDB \u8f6c\u6362\u5668',
      'nav.viewer': '\u86cb\u767d\u8d28\u7ed3\u6784\u67e5\u770b\u5668',
      'nav.align':  '\u53cc\u5e8f\u5217\u6bd4\u5bf9',
      'nav.msa':    '\u591a\u5e8f\u5217\u6bd4\u5bf9',
      'nav.cdr':    '\u6297\u4f53 CDR \u6807\u6ce8\u5668',
      'nav.mut':    '\u86cb\u767d\u8d28\u7a81\u53d8',
      'nav.iface':  '\u754c\u9762\u5206\u6790',

      /* common */
      'common.browse':   '\u6d4f\u89c8\u6587\u4ef6',
      'common.copy':     '\u29c9 \u590d\u5236',
      'common.download': '\u2b07 \u4e0b\u8f7d',
      'common.footer':          '\u5b8c\u5168\u5728\u60a8\u7684\u6d4f\u89c8\u5668\u4e2d\u8fd0\u884c\uff0c\u6570\u636e\u4e0d\u4f1a\u4e0a\u4f20\u5230\u4efb\u4f55\u670d\u52a1\u5668\u3002',
      'common.footer.branded':  'BioTools \u2014 \u5b8c\u5168\u5728\u60a8\u7684\u6d4f\u89c8\u5668\u4e2d\u8fd0\u884c\uff0c\u6570\u636e\u4e0d\u4f1a\u4e0a\u4f20\u5230\u4efb\u4f55\u670d\u52a1\u5668\u3002',
      'common.dz.primary':   '\u5c06 PDB \u6216 CIF \u6587\u4ef6\u62d6\u653e\u5230\u6b64\u5904',
      'common.dz.secondary': '\u6216\u70b9\u51fb\u4e0b\u65b9\u6309\u94ae\u6d4f\u89c8\u6587\u4ef6',
      'common.load-example': '\ud83d\udccb \u52a0\u8f7d\u793a\u4f8b',
      'common.clear':    '\u6e05\u9664',
      'common.align':    '\u6bd4\u5bf9',

      /* ── index.html ────────────────────────────────────────── */
      'index.subtitle': '\u4e00\u7cfb\u5217\u57fa\u4e8e\u6d4f\u89c8\u5668\u7684\u751f\u7269\u6570\u636e\u5206\u6790\u5de5\u5177\uff0c\u65e0\u9700\u5b89\u88c5\u3002',
      'index.section':  '\u53ef\u7528\u5de5\u5177',
      'index.footer':   'BioTools \u2014 \u5b8c\u5168\u5728\u60a8\u7684\u6d4f\u89c8\u5668\u4e2d\u8fd0\u884c\uff0c\u6570\u636e\u4e0d\u4f1a\u4e0a\u4f20\u5230\u4efb\u4f55\u670d\u52a1\u5668\u3002',

      'card.p2f.name': '\u86cb\u767d\u8d28\u7ed3\u6784 \u2192 FASTA',
      'card.p2f.desc': '\u4e0a\u4f20 PDB \u6216 mmCIF \u6587\u4ef6\uff0c\u63d0\u53d6\u6c28\u57fa\u9178\u5e8f\u5217\u5e76\u5bfc\u51fa\u4e3a FASTA \u683c\u5f0f\u3002\u652f\u6301\u5355\u884c\u548c\u591a\u884c\u8f93\u51fa\u3002',
      'card.p2f.tag':  '\u7ed3\u6784',

      'card.cifpdb.name': 'CIF \u2194 PDB \u8f6c\u6362\u5668',
      'card.cifpdb.desc': '\u5728 mmCIF \u548c PDB \u7ed3\u6784\u683c\u5f0f\u4e4b\u95f4\u8f6c\u6362\u3002\u4fdd\u7559\u539f\u5b50\u5750\u6807\u3001\u6676\u80de\u53c2\u6570\u548c\u5bf9\u79f0\u4fe1\u606f\u3002',
      'card.cifpdb.tag':  '\u7ed3\u6784',

      'card.viewer.name': '\u86cb\u767d\u8d28\u7ed3\u6784\u67e5\u770b\u5668',
      'card.viewer.desc': '\u4ee5\u4ea4\u4e92\u5f0f 3D \u65b9\u5f0f\u53ef\u89c6\u5316 PDB \u548c mmCIF \u86cb\u767d\u8d28\u7ed3\u6784\u3002\u4e0a\u4f20\u672c\u5730\u6587\u4ef6\u6216\u901a\u8fc7 ID \u76f4\u63a5\u4ece RCSB PDB \u83b7\u53d6\u6761\u76ee\u3002',
      'card.viewer.tag':  '\u53ef\u89c6\u5316',

      'card.align.name': '\u53cc\u5e8f\u5217\u6bd4\u5bf9',
      'card.align.desc': '\u4f7f\u7528 Needleman-Wunsch\uff08\u5168\u5c40\uff09\u6216 Smith-Waterman\uff08\u5c40\u90e8\uff09\u7b97\u6cd5\uff0c\u7ed3\u5408 BLOSUM62\u3001PAM250 \u6216\u81ea\u5b9a\u4e49\u8bc4\u5206\u9635\u5217\u6bd4\u5bf9\u4e24\u6761\u86cb\u767d\u8d28\u5e8f\u5217\u3002',
      'card.align.tag':  '\u5e8f\u5217',

      'card.msa.name': '\u591a\u5e8f\u5217\u6bd4\u5bf9',
      'card.msa.desc': '\u4f7f\u7528\u57fa\u4e8e BLOSUM62 \u8bc4\u5206\u7684\u4e2d\u5fc3\u661f\u6cd5\u9010\u6b65\u6bd4\u5bf9\u591a\u6761\u86cb\u767d\u8d28\u5e8f\u5217\u3002\u652f\u6301 Clustal\u3001Taylor\u3001\u758f\u6c34\u6027\u6216\u5b88\u6052\u6027\u914d\u8272\u65b9\u6848\u53ef\u89c6\u5316\u3002',
      'card.msa.tag':  '\u5e8f\u5217',

      'card.cdr.name': '\u6297\u4f53 CDR \u6807\u6ce8\u5668',
      'card.cdr.desc': '\u4f7f\u7528 Kabat\u3001Chothia\u3001IMGT\u3001Martin \u6216 Contact \u7f16\u53f7\u65b9\u6848\u8bc6\u522b VH/VL \u5e8f\u5217\u4e2d\u7684 CDR1/2/3 \u73af\u3002\u5b8c\u5168\u5728\u5ba2\u6237\u7aef\u8fd0\u884c\u3002',
      'card.cdr.tag':  '\u6297\u4f53',

      'card.mut.name': '\u86cb\u767d\u8d28\u7a81\u53d8',
      'card.mut.desc': '\u5bf9\u86cb\u767d\u8d28\u5e8f\u5217\u4e2d\u7684\u6b8b\u57fa\u8fdb\u884c\u7f16\u53f7\uff0c\u5e76\u901a\u8fc7\u4ea4\u4e92\u70b9\u51fb\u6216\u6587\u672c\u7b26\u53f7\uff08\u5982 A20N,F54Y\uff09\u5f15\u5165\u70b9\u7a81\u53d8\u3002\u8f93\u51fa\u7a81\u53d8\u540e\u7684 FASTA\u3002',
      'card.mut.tag':  '\u5e8f\u5217',

      'card.iface.name': '\u754c\u9762\u5206\u6790',
      'card.iface.desc': '\u5206\u6790\u86cb\u767d\u8d28-\u86cb\u767d\u8d28\u754c\u9762\uff1a\u68c0\u6d4b\u6c22\u952e\u3001\u76d0\u6865\u3001\u758f\u6c34\u3001\u03c0-\u03c0\u5806\u53e0\u3001\u03c0-\u9633\u79bb\u5b50\u7b49\u76f8\u4e92\u4f5c\u7528\u3002\u8ba1\u7b97\u57cb\u846c\u8868\u9762\u79ef\uff08\u0394SASA\uff09\u5e76\u8bc6\u522b\u8868\u4f4d/\u5bf9\u4f4d\u6b8b\u57fa\u3002',
      'card.iface.tag':  '\u7ed3\u6784',

      /* ── Protein Structure \u2192 FASTA ──────────────────────────── */
      'p2f.h1':          '\ud83d\udd2c \u86cb\u767d\u8d28\u7ed3\u6784 \u2192 FASTA',
      'p2f.subtitle':    '\u4ece PDB \u6216 mmCIF \u6587\u4ef6\u4e2d\u63d0\u53d6\u6c28\u57fa\u9178\u5e8f\u5217\u5e76\u5bfc\u51fa\u4e3a FASTA\u3002',
      'p2f.step1':       '\u2460 \u4e0a\u4f20\u7ed3\u6784\u6587\u4ef6',
      'p2f.step2':       '\u2461 \u9009\u9879',
      'p2f.seqsrc':      '\u5e8f\u5217\u6765\u6e90',
      'p2f.struct':      '\u7ed3\u6784\u884d\u751f',
      'p2f.struct.desc': '\u4ece ATOM \u5750\u6807\uff08C\u03b1 \u539f\u5b50\uff09\u63d0\u53d6\u3002\u53cd\u6620\u6a21\u578b\u4e2d\u5b9e\u9645\u5b58\u5728\u7684\u6b8b\u57fa\uff0c\u63a8\u8350\u7528\u4e8e AI \u9884\u6d4b\u7ed3\u6784\u3002',
      'p2f.author':      '\u4f5c\u8005\u6ce8\u91ca',
      'p2f.author.desc': '\u6765\u81ea SEQRES / _entity_poly \u8bb0\u5f55\u3002\u53ef\u80fd\u5305\u542b\u7ed3\u6784\u4e2d\u672a\u89e3\u6790\u7684\u6b8b\u57fa\u3002',
      'p2f.outfmt':      '\u8f93\u51fa\u683c\u5f0f',
      'p2f.oneline':     '\u5355\u884c FASTA',
      'p2f.oneline.desc':   '\u6bcf\u6761\u5e8f\u5217\u5728\u6807\u9898\u540e\u5360\u4e00\u884c\u3002',
      'p2f.multiline':      '\u591a\u884c FASTA',
      'p2f.multiline.desc': '\u5e8f\u5217\u6bcf\u884c 60 \u4e2a\u5b57\u7b26\uff08\u6807\u51c6\u683c\u5f0f\uff09\u3002',
      'p2f.convert':   '\u2462 \u8f6c\u6362\u4e3a FASTA',
      'p2f.step4':     '\u2463 FASTA \u8f93\u51fa',
      'p2f.dl-fasta':  '\u2b07 \u4e0b\u8f7d .fasta',

      /* ── CIF \u2194 PDB Converter ──────────────────────────────────── */
      'cifpdb.h1':          '\ud83d\udd04 CIF \u2194 PDB \u8f6c\u6362\u5668',
      'cifpdb.subtitle':    '\u5728 mmCIF \u548c PDB \u7ed3\u6784\u683c\u5f0f\u4e4b\u95f4\u8f6c\u6362\uff0c\u5b8c\u5168\u5728\u6d4f\u89c8\u5668\u4e2d\u8fd0\u884c\u3002',
      'cifpdb.step1':       '\u2460 \u4e0a\u4f20\u7ed3\u6784\u6587\u4ef6',
      'cifpdb.step2':       '\u2461 \u8f6c\u6362\u65b9\u5411',
      'cifpdb.dir-note':    '\u4e0a\u4f20\u6587\u4ef6\u540e\u5c06\u81ea\u52a8\u68c0\u6d4b\u8f6c\u6362\u65b9\u5411\u3002',
      'cifpdb.convert':     '\u2462 \u8f6c\u6362',
      'cifpdb.step4':       '\u2463 \u8f6c\u6362\u8f93\u51fa',
      'cifpdb.dz.primary':  '\u5c06 PDB \u6216 CIF \u6587\u4ef6\u62d6\u653e\u5230\u6b64\u5904',

      /* ── Protein Structure Viewer ─────────────────────────────── */
      'viewer.h1':       '\ud83d\udd2d \u86cb\u767d\u8d28\u7ed3\u6784\u67e5\u770b\u5668',
      'viewer.subtitle': '\u4ee5\u4ea4\u4e92\u65b9\u5f0f\u53ef\u89c6\u5316 PDB \u548c mmCIF \u86cb\u767d\u8d28\u7ed3\u6784\uff0c\u5b8c\u5168\u5728\u6d4f\u89c8\u5668\u4e2d\u8fd0\u884c\u3002',
      'viewer.tab.file': '\ud83d\udcc2 \u4e0a\u4f20\u6587\u4ef6',
      'viewer.tab.pdb':  '\ud83d\udd0d \u901a\u8fc7 PDB ID \u83b7\u53d6',
      'viewer.dz.primary':   '\u5c06\u7ed3\u6784\u6587\u4ef6\u62d6\u653e\u5230\u6b64\u5904',
      'viewer.dz.secondary': '\u652f\u6301\u683c\u5f0f\uff1a.pdb, .cif, .mmcif, .ent',
      'viewer.pdb.load': '\u52a0\u8f7d',
      'viewer.visualize':  '\u2461 \u53ef\u89c6\u5316\u7ed3\u6784',
      'viewer.3d-header':  '\u2462 3D \u67e5\u770b\u5668',
      'viewer.cm-toggle':  '\u663e\u793a\u63a5\u89e6\u56fe',
      'viewer.placeholder': '\u4e0a\u4f20\u6587\u4ef6\u6216\u8f93\u5165 PDB ID \u4ee5\u53ef\u89c6\u5316\u7ed3\u6784',
      'viewer.cm.contact':  '\u63a5\u89e6\u56fe',
      'viewer.cm.distance': '\u8ddd\u79bb\u56fe',
      'viewer.footer': '\u5b8c\u5168\u5728\u60a8\u7684\u6d4f\u89c8\u5668\u4e2d\u8fd0\u884c\uff0c\u6570\u636e\u4e0d\u4f1a\u4e0a\u4f20\u5230\u4efb\u4f55\u670d\u52a1\u5668\u3002'
        + '3D \u53ef\u89c6\u5316\u7531 <a href="https://molstar.org/" target="_blank" rel="noopener noreferrer" style="color:inherit">Mol*</a> \u63d0\u4f9b\u652f\u6301\u3002'
        + '\u53ef\u9009\u63a5\u89e6\u56fe\u7531 <a href="https://plotly.com/javascript/" target="_blank" rel="noopener noreferrer" style="color:inherit">Plotly.js</a> \u63d0\u4f9b\u652f\u6301\uff08\u6309\u9700\u52a0\u8f7d\uff09\u3002',

      /* ── Pairwise Sequence Alignment ──────────────────────────── */
      'align.h1':       '\ud83d\udd17 \u53cc\u5e8f\u5217\u6bd4\u5bf9',
      'align.subtitle': '\u4f7f\u7528\u4eff\u5c04\u7a7a\u4f4d\u7f5a\u5206\uff0c\u901a\u8fc7 Needleman-Wunsch\uff08\u5168\u5c40\uff09\u6216 Smith-Waterman\uff08\u5c40\u90e8\uff09\u7b97\u6cd5\u6bd4\u5bf9\u4e24\u6761\u86cb\u767d\u8d28\u5e8f\u5217\u3002',
      'align.step1':    '\u2460 \u5e8f\u5217',
      'align.step2':    '\u2461 \u53c2\u6570',
      'align.step3':    '\u2462 \u6bd4\u5bf9\u7ed3\u679c',
      'align.name':     '\u540d\u79f0',
      'align.seq-label': '\u5e8f\u5217\uff08FASTA \u6216\u539f\u59cb\u6c28\u57fa\u9178\uff09',
      'align.load-ex':   '\ud83d\udccb \u52a0\u8f7d\u793a\u4f8b\u5e8f\u5217',
      'align.algorithm': '\u7b97\u6cd5',
      'align.algo.global': '\u5168\u5c40\uff08Needleman-Wunsch\uff09',
      'align.algo.local':  '\u5c40\u90e8\uff08Smith-Waterman\uff09',
      'align.matrix':      '\u66ff\u6362\u77e9\u9635',
      'align.matrix.simple': '\u7b80\u5355\uff08\u5339\u914d / \u9519\u914d\uff09',
      'align.match':       '\u5339\u914d\u5206\u6570',
      'align.mismatch':    '\u9519\u914d\u5206\u6570',
      'align.gap-open':    '\u7a7a\u4f4d\u5f00\u653e\u7f5a\u5206',
      'align.gap-extend':  '\u7a7a\u4f4d\u5ef6\u4f38\u7f5a\u5206',
      'align.btn':         '\u26a1 \u6bd4\u5bf9',
      'align.copy':        '\u29c9 \u590d\u5236',
      'align.download':    '\u2b07 \u4e0b\u8f7d',
      'align.seq1-ph':     '\u7c98\u8d34 FASTA \u6216\u539f\u59cb\u6c28\u57fa\u9178\u5e8f\u5217\u2026',
      'align.seq2-ph':     '\u7c98\u8d34 FASTA \u6216\u539f\u59cb\u6c28\u57fa\u9178\u5e8f\u5217\u2026',

      /* ── Multiple Sequence Alignment ──────────────────────────── */
      'msa.h1':       '\u2734 \u591a\u5e8f\u5217\u6bd4\u5bf9',
      'msa.subtitle': '\u4f7f\u7528\u57fa\u4e8e BLOSUM62 \u8bc4\u5206\u7684\u4e2d\u5fc3\u661f\u6cd5\u9010\u6b65\u6bd4\u5bf9\u591a\u6761\u86cb\u767d\u8d28\u5e8f\u5217\u3002',
      'msa.input':    '\u8f93\u5165\u5e8f\u5217',
      'msa.fasta-label': 'FASTA \u5e8f\u5217\uff08\u6700\u5c11 2 \u6761\uff0c\u5efa\u8bae \u2264 20 \u6761\uff09',
      'msa.example':  '\u52a0\u8f7d\u793a\u4f8b',
      'msa.clear':    '\u6e05\u9664',
      'msa.params':   '\u53c2\u6570',
      'msa.gap-open':  '\u7a7a\u4f4d\u5f00\u653e\u7f5a\u5206',
      'msa.gap-ext':   '\u7a7a\u4f4d\u5ef6\u4f38\u7f5a\u5206',
      'msa.colorscheme': '\u914d\u8272\u65b9\u6848',
      'msa.color.none':  '\u65e0\uff08\u5355\u8272\uff09',
      'msa.progress':  '\u6b63\u5728\u8ba1\u7b97\u53cc\u5e8f\u5217\u6bd4\u5bf9\u2026',
      'msa.align':     '\u6bd4\u5bf9',
      'msa.results':   '\u6bd4\u5bf9\u7ed3\u679c',
      'msa.download':  '\u2b07 \u4e0b\u8f7d FASTA',
      'msa.copy':      '\u2398 \u590d\u5236',
      'msa.fasta-ph':  '>Sequence_1\nACDEFGHIKLMNPQRSTVWY\n>Sequence_2\nACDEFGHIKLMNPQRSTVWY\n>Sequence_3\nACDEFGHIKLMNPQRSTV',

      /* ── Antibody CDR Annotator ───────────────────────────────── */
      'cdr.h1': '\ud83d\udd16 \u6297\u4f53 CDR \u6807\u6ce8\u5668',
      'cdr.subtitle': '\u4f7f\u7528 Kabat \u6216 IMGT \u7f16\u53f7\u65b9\u6848\u8bc6\u522b VH/VL \u5e8f\u5217\u4e2d\u7684 CDR1/2/3 \u73af\uff0c\u7531 '
        + '<a href="https://immunum.enpicom.com" target="_blank" rel="noopener" class="header-link">immunum</a> \u63d0\u4f9b\u652f\u6301\u3002\u5b8c\u5168\u5728\u5ba2\u6237\u7aef\u8fd0\u884c\u3002',
      'cdr.step1':   '\u2460 \u5e8f\u5217\u8f93\u5165',
      'cdr.seq-label': '\u6c28\u57fa\u9178\u5e8f\u5217\uff08FASTA \u6216\u539f\u59cb\u683c\u5f0f\uff09',
      'cdr.seq-ph':  '\u7c98\u8d34\u5355\u6761 VH \u6216 VL \u6c28\u57fa\u9178\u5e8f\u5217\uff08FASTA \u6216\u539f\u59cb\u683c\u5f0f\uff09\u2026',
      'cdr.chain':   '\u94fe\u7c7b\u578b',
      'cdr.auto':    '\u81ea\u52a8\u68c0\u6d4b',
      'cdr.scheme':  '\u7f16\u53f7\u65b9\u6848',
      'cdr.load-ex': '\ud83d\udccb \u52a0\u8f7d\u793a\u4f8b\uff08\u66f2\u59a5\u73e0\u5355\u6297 VH\uff09',
      'cdr.step2':   '\u2461 \u6807\u6ce8\u7ed3\u679c',
      'cdr.framework':  '\u6846\u67b6\u533a',
      'cdr.tab.annotated': '\u6807\u6ce8\u5e8f\u5217',
      'cdr.tab.table':     'CDR \u8868\u683c',
      'cdr.tab.numbered':  '\u7f16\u53f7\u6bd4\u5bf9',
      'cdr.copy-fasta':    '\u29c9 \u590d\u5236 CDR\uff08FASTA\uff09',
      'cdr.dl-tsv':        '\u2b07 \u4e0b\u8f7d TSV',
      'cdr.accuracy': '<strong style="color:var(--text)">\u2139\ufe0f \u7cbe\u5ea6\u8bf4\u660e\uff1a</strong>'
        + 'CDR \u6807\u6ce8\u7531 <a href="https://immunum.enpicom.com" target="_blank" rel="noopener">immunum</a> \u63d0\u4f9b\u652f\u6301\uff0c'
        + '\u4f7f\u7528 Needleman-Wunsch \u534a\u5168\u5c40\u6bd4\u5bf9\u548c PSSM \u8bc4\u5206\u77e9\u9635\u51c6\u786e\u6807\u6ce8\u6297\u4f53\uff08IGH/IGK/IGL\uff09\u7f16\u53f7\u3002\u652f\u6301 Kabat \u548c IMGT \u65b9\u6848\u3002',
      'cdr.footer': '\u5b8c\u5168\u5728\u60a8\u7684\u6d4f\u89c8\u5668\u4e2d\u8fd0\u884c\uff0c\u6570\u636e\u4e0d\u4f1a\u53d1\u9001\u5230\u4efb\u4f55\u670d\u52a1\u5668\u3002',

      /* ── Protein Mutation ─────────────────────────────────────── */
      'mut.h1':       '\ud83d\udd2f \u86cb\u767d\u8d28\u7a81\u53d8',
      'mut.subtitle': '\u5bf9\u86cb\u767d\u8d28\u5e8f\u5217\u4e2d\u7684\u6b8b\u57fa\u8fdb\u884c\u7f16\u53f7\uff0c\u5e76\u901a\u8fc7\u4ea4\u4e92\u65b9\u5f0f\u6216\u6587\u672c\u7b26\u53f7\uff08\u5982 A20N,F54Y\uff09\u5f15\u5165\u70b9\u7a81\u53d8\u3002',
      'mut.input':    '\u8f93\u5165\u5e8f\u5217',
      'mut.seq-label': 'FASTA \u5e8f\u5217\uff08\u4e00\u6761\u6216\u591a\u6761\uff09',
      'mut.run':      '\u7f16\u53f7\u5e76\u663e\u793a\u5e8f\u5217',
      'mut.example':  '\u52a0\u8f7d\u793a\u4f8b',
      'mut.editor':   '\u7a81\u53d8\u7f16\u8f91\u5668',
      'mut.tab.interactive': '\u4ea4\u4e92\u5f0f',
      'mut.tab.text':        '\u6587\u672c\u7b26\u53f7',
      'mut.interactive.hint': '\u70b9\u51fb\u4efb\u610f\u6b8b\u57fa\u8fdb\u884c\u4fee\u6539\u3002\u5df2\u7a81\u53d8\u7684\u6b8b\u57fa\u4ee5\u7434\u73c0\u8272\u9ad8\u4eae\u663e\u793a\u3002',
      'mut.text.hint': '\u8f93\u5165\u4ee5\u9017\u53f7\u5206\u9694\u7684\u7a81\u53d8\u3002\u6bcf\u4e2a\u7a81\u53d8\u683c\u5f0f\u4e3a <strong>\u539f AA&thinsp;\u4f4d\u7f6e&thinsp;\u65b0 AA</strong>\uff08\u5982 <code>A20N,F54Y</code>\uff09\u3002\u539f\u6c28\u57fa\u9178\u53ef\u9009\uff0c\u82e5\u63d0\u4f9b\u5c06\u8fdb\u884c\u9a8c\u8bc1\u3002',
      'mut.seq-select': '\u5e94\u7528\u4e8e\u5e8f\u5217',
      'mut.mutations':  '\u7a81\u53d8',
      'mut.hint':       '\u683c\u5f0f\uff1a[\u539f AA]\u4f4d\u7f6e[\u65b0 AA] \u2014 \u5982 A20N\u300120N \u6216 A20N,F54Y',
      'mut.apply':      '\u5e94\u7528',
      'mut.reset':      '\u91cd\u7f6e\u6240\u6709\u7a81\u53d8',
      'mut.results':    '\u7a81\u53d8\u540e\u5e8f\u5217',
      'mut.copy':       '\u590d\u5236 FASTA',
      'mut.download':   '\u4e0b\u8f7d FASTA',
      'mut.popup.title': '\u7a81\u53d8\u6b8b\u57fa',
      'mut.popup.cancel': '\u53d6\u6d88',
      'mut.mut-ph':     'A20N,F54Y',
      'mut.seq-ph':     '>SequenceName\nMKTAYIAKQRQISFVK...',

      /* ── Interface Analysis ───────────────────────────────────── */
      'iface.h1':       '\ud83d\udd17 \u86cb\u767d\u8d28\u754c\u9762\u5206\u6790',
      'iface.subtitle': '\u5206\u6790\u86cb\u767d\u8d28-\u86cb\u767d\u8d28\u754c\u9762\uff1a\u68c0\u6d4b\u76f8\u4e92\u4f5c\u7528\u7c7b\u578b\uff0c\u8bc6\u522b\u8868\u4f4d/\u5bf9\u4f4d\u6b8b\u57fa\uff0c\u8ba1\u7b97\u57cb\u846c\u8868\u9762\u79ef\uff08\u0394SASA\uff09\u3002',
      'iface.step1':    '\u2460 \u4e0a\u4f20\u7ed3\u6784\u6587\u4ef6',
      'iface.step2':    '\u2461 \u754c\u9762\u9009\u9879',
      'iface.chains-detected': '\u68c0\u6d4b\u5230\u7684\u94fe',
      'iface.define':   '\u754c\u9762\u5b9a\u4e49',
      'iface.placeholder': '\u4f8b\u5982 A-B \u6216 A,B-C',
      'iface.hint':     '\u5b9a\u4e49\u54ea\u4e9b\u94fe\u6784\u6210\u754c\u9762\u3002\u4f7f\u7528 "-" \u6216 "/" \u5206\u9694\u4e24\u4fa7\uff0c\u4f7f\u7528 "," \u8868\u793a\u540c\u4e00\u4fa7\u591a\u6761\u94fe\u3002\u4f8b\u5982\uff1a<code>A-B</code>\u3001<code>HL-A</code>\u3001<code>A,B-C</code>',
      'iface.threshold': '\u8ddd\u79bb\u9608\u503c (\u00c5)',
      'iface.threshold.hint': '\u4efb\u610f\u4e24\u4e2a\u6b8b\u57fa\u95f4\u6700\u8fd1\u91cd\u539f\u5b50\u8ddd\u79bb \u2264 \u6b64\u503c\u5219\u89c6\u4e3a\u63a5\u89e6\u3002\u5178\u578b\u503c\uff1a4.0\u20136.0 \u00c5\u3002',
      'iface.analyze':  '\u2462 \u5206\u6790\u754c\u9762',
      'iface.step4':    '\u2463 \u5206\u6790\u7ed3\u679c',
      'iface.dl-tsv':   '\u2b07 \u4e0b\u8f7d TSV',
      'iface.dl-csv':   '\u2b07 \u4e0b\u8f7d CSV',
      'iface.tab.summary': '\u6458\u8981',
      'iface.tab.table':   '\u63a5\u89e6\u8868',
      'iface.tab.epitope': '\u8868\u4f4d / \u5bf9\u4f4d',
    }
  };

  /* ── State ─────────────────────────────────────────────────── */
  var currentLang = (function () {
    try { return localStorage.getItem('biotoolsLang') || 'en'; } catch (e) { return 'en'; }
  }());

  /* ── Core apply function ───────────────────────────────────── */
  function applyLang(l) {
    if (!T[l]) return;
    currentLang = l;
    try { localStorage.setItem('biotoolsLang', l); } catch (e) { /* ignore */ }
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (T[l][key] === undefined) return;
      if (el.tagName === 'TITLE') {
        el.textContent = T[l][key];
      } else {
        el.innerHTML = T[l][key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (T[l][key] !== undefined) el.placeholder = T[l][key];
    });

    document.querySelectorAll('.lang-btn').forEach(function (btn) {
      btn.classList.toggle('lang-active', btn.getAttribute('data-lang') === l);
    });
  }

  /* ── Public API ────────────────────────────────────────────── */
  window.setLang = function (l) { applyLang(l); };

  /* ── Initialise on DOM ready ───────────────────────────────── */
  function init() {
    var header = document.querySelector('header');
    if (header) {
      var switcher = document.createElement('div');
      switcher.className = 'lang-switcher';
      switcher.innerHTML =
        '<button class="lang-btn" data-lang="en" onclick="setLang(\'en\')">EN</button>' +
        '<span class="lang-sep">|</span>' +
        '<button class="lang-btn" data-lang="zh" onclick="setLang(\'zh\')">\u4e2d\u6587</button>';
      header.appendChild(switcher);
    }
    applyLang(currentLang);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
