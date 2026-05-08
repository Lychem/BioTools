# BioTools

Browser-based biological data analysis tools. No installation required.

## Available Modules

### 1. Protein Structure -> FASTA (`protein-to-fasta/`)

Convert structure files to FASTA sequences.

Features:
- Upload via drag-and-drop or file browser (`.pdb`, `.cif`, `.ent`)
- Choose sequence source:
	- Structure-derived
	- Author-annotated
- Choose FASTA output format:
	- One-line FASTA
	- Multi-line FASTA
- View conversion stats and chain-level output
- Copy FASTA output
- Download `.fasta`

### 2. CIF <-> PDB Converter (`cif-pdb-converter/`)

Convert between mmCIF and PDB formats directly in the browser.

Features:
- Upload via drag-and-drop or file browser (`.pdb`, `.cif`, `.ent`, `.mmcif`)
- Automatic conversion-direction detection from uploaded file
- Conversion status/output panel
- Copy converted text output
- Download converted file

### 3. Protein Structure Viewer (`protein-viewer/`)

Interactive 3D structure visualization.

Features:
- Two input modes:
	- Upload local structure file (`.pdb`, `.cif`, `.mmcif`, `.ent`)
	- Fetch by PDB ID from RCSB
- One-click visualize action
- 3D viewer panel (Mol*)
- Optional contact-map panel with:
	- C-alpha cutoff slider
	- Map type selection (contact map / distance map)
- Built-in example PDB IDs in the UI for quick loading

### 4. Pairwise Sequence Alignment (`sequence-alignment/`)

Align two protein sequences with configurable scoring.

Features:
- Two sequence inputs (FASTA or raw amino acids)
- Custom sequence names
- Example-sequence loader
- Algorithm selection:
	- Global (Needleman-Wunsch)
	- Local (Smith-Waterman)
- Scoring options:
	- BLOSUM62
	- PAM250
	- Simple match/mismatch mode
- Gap open and gap extension parameters
- Result panel with alignment statistics
- Copy result and download alignment output

### 5. Multiple Sequence Alignment (`msa-viewer/`)

Align and visualize multiple protein sequences.

Features:
- FASTA input area (minimum 2 sequences)
- Example loader and clear action
- Adjustable alignment parameters:
	- Gap open penalty
	- Gap extension penalty
- Color-scheme options:
	- Clustal
	- Taylor
	- Hydrophobicity
	- Conservation
	- None (monochrome)
- Progress indicator during alignment
- Alignment results table
- Download FASTA and copy output

### 6. Antibody CDR Annotator (`antibody-cdr/`)

Annotate antibody CDR regions from VH/VL sequences.

Features:
- Single-sequence input (FASTA or raw)
- Chain type options:
	- Auto-detect
	- VH
	- VL-kappa
	- VL-lambda
- Numbering scheme selection:
	- Kabat
	- IMGT
- Example loader
- Results in multiple tabs:
	- Annotated sequence
	- CDR table
	- Numbered alignment
- Copy CDRs as FASTA
- Download TSV
- Powered by immunum in-browser

### 7. Protein Mutation (`protein-mutation/`)

Introduce point mutations on protein sequences and export mutated FASTA.

Features:
- Input one or more FASTA sequences
- Number and display sequences for editing
- Example loader
- Two mutation workflows:
	- Interactive mode (click residues to mutate)
	- Text notation mode (for example: `A20N,F54Y`)
- Select target sequence in text mode
- Apply mutations and reset all mutations
- Mutated sequence summary/output panel
- Copy mutated FASTA
- Download mutated FASTA

## Internationalization

The pages use shared i18n labels and include a language switcher (English / Chinese).

## Usage

Open `index.html` in a modern browser.
You can also serve the repository with a local static web server.

All modules are designed to run client-side in the browser.
