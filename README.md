# BioTools

Browser-based biological data analysis tools — no installation required.

## Tools

### 🔬 Protein Structure → FASTA (`protein-to-fasta/`)

Upload a PDB or mmCIF (`.cif`) file and extract the amino-acid sequence as FASTA.

**Features:**
- Drag-and-drop or click-to-browse file upload (`.pdb`, `.cif`, `.ent`)
- PDB parser: reads `SEQRES` records; falls back to `ATOM` Cα records
- mmCIF parser: reads `_entity_poly` one-letter-code fields; maps entities to chains via `_struct_asym`
- Standard 3-letter → 1-letter amino acid conversion (including common non-standard residues)
- Two output formats: **one-line FASTA** or **multi-line FASTA** (60 chars/line)
- Per-chain residue count, copy-to-clipboard, and `.fasta` download
- Runs entirely in your browser — **no data is sent to any server**

## Usage

Open `index.html` in any modern browser (or serve the directory with a local web server).
