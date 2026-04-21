# Generate All Print-Optimized PDFs

This guide shows how to generate PDF versions of all print-optimized flowcharts at once.

## Prerequisites

Install Graphviz:

```bash
# macOS
brew install graphviz

# Ubuntu/Debian
sudo apt-get install graphviz

# Windows (using Chocolatey)
choco install graphviz

# Windows (using Scoop)
scoop install graphviz
```

## Generate All PDFs (Recommended)

```bash
# Navigate to the graphviz directory
cd docs/graphviz

# Generate all print-optimized PDFs at 300 DPI
for file in print-*.dot; do
    echo "Generating ${file%.dot}.pdf..."
    dot -Tpdf -Gdpi=300 "$file" -o "${file%.dot}.pdf"
done

echo "Done! PDFs created in docs/graphviz/"
```

## Generate Individual PDFs

```bash
cd docs/graphviz

# Overview (best for presentations)
dot -Tpdf -Gdpi=300 print-00-overview.dot -o overview.pdf

# Complete system
dot -Tpdf -Gdpi=300 print-00-complete-system.dot -o complete-system.pdf

# Authentication
dot -Tpdf -Gdpi=300 print-01-authentication.dot -o authentication.pdf

# Item Registration
dot -Tpdf -Gdpi=300 print-02-item-registration.dot -o item-registration.pdf

# QR Scanning
dot -Tpdf -Gdpi=300 print-03-qr-scanning.dot -o qr-scanning.pdf

# Report Found
dot -Tpdf -Gdpi=300 print-04-report-found.dot -o report-found.pdf

# AI Matching
dot -Tpdf -Gdpi=300 print-05-ai-matching.dot -o ai-matching.pdf

# Admin Dashboard
dot -Tpdf -Gdpi=300 print-10-admin-dashboard.dot -o admin-dashboard.pdf

# Home Dashboard
dot -Tpdf -Gdpi=300 print-14-home-dashboard.dot -o home-dashboard.pdf
```

## Generate PNGs Instead

```bash
cd docs/graphviz

# Generate all as PNG
for file in print-*.dot; do
    dot -Tpng -Gdpi=300 "$file" -o "${file%.dot}.png"
done
```

## Generate High-Resolution (600 DPI)

For extra-large prints or posters:

```bash
cd docs/graphviz

# High-res PDF
dot -Tpdf -Gdpi=600 print-00-overview.dot -o overview-highres.pdf

# High-res PNG
dot -Tpng -Gdpi=600 print-00-overview.dot -o overview-highres.png
```

## Windows PowerShell Version

```powershell
# Navigate to graphviz directory
cd docs\graphviz

# Generate all print-optimized PDFs
Get-ChildItem -Filter "print-*.dot" | ForEach-Object {
    $outputFile = $_.BaseName + ".pdf"
    Write-Host "Generating $outputFile..."
    dot -Tpdf -Gdpi=300 $_.Name -o $outputFile
}

Write-Host "Done! PDFs created in docs\graphviz\"
```

## Batch Script for Windows

Save as `generate-pdfs.bat`:

```batch
@echo off
cd docs\graphviz

echo Generating print-optimized PDFs...

for %%f in (print-*.dot) do (
    echo Processing %%f...
    dot -Tpdf -Gdpi=300 "%%f" -o "%%~nf.pdf"
)

echo Done! PDFs created in docs\graphviz\
pause
```

## Output Formats

Graphviz supports many formats:

```bash
# PDF (best for printing)
dot -Tpdf -Gdpi=300 print-00-overview.dot -o overview.pdf

# PNG (for presentations)
dot -Tpng -Gdpi=300 print-00-overview.dot -o overview.png

# SVG (scalable, for web)
dot -Tsvg print-00-overview.dot -o overview.svg

# JPEG
dot -Tjpeg -Gdpi=300 print-00-overview.dot -o overview.jpg
```

## Troubleshooting

### "dot: command not found"
- Graphviz is not installed or not in PATH
- Install using the commands above
- Restart terminal after installation

### Output file is empty
- Check if input .dot file exists
- Verify .dot file syntax is correct
- Try viewing online first: https://dreampuf.github.io/GraphvizOnline/

### Text is too small/large
- Adjust DPI: `-Gdpi=200` (smaller) or `-Gdpi=400` (larger)
- Default is 300 DPI which works well for most printers

## File Sizes

Approximate sizes at 300 DPI:
- **PDF**: 50-200 KB per file
- **PNG**: 200-500 KB per file
- **SVG**: 20-50 KB per file

## Next Steps

After generating PDFs:
1. Open in PDF viewer
2. Print with "Fit to page" setting
3. Use landscape orientation for best results
4. Color or grayscale both work well

---

**Quick Command**: `cd docs/graphviz && for file in print-*.dot; do dot -Tpdf -Gdpi=300 "$file" -o "${file%.dot}.pdf"; done`
