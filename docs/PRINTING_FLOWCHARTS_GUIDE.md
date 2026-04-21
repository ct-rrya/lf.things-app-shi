# Printing Flowcharts Guide

This guide explains how to print the LF App flowcharts for presentations, documentation, or study purposes.

## Print-Optimized vs Original Flowcharts

We now have TWO versions of flowcharts:

### Original Flowcharts
- **Location**: `docs/graphviz/*.dot` (without "print-" prefix)
- **Purpose**: Detailed documentation, digital viewing
- **Font Size**: 10-11pt
- **Detail Level**: High (all steps and conditions)
- **Best For**: Screen viewing, comprehensive documentation

### Print-Optimized Flowcharts ✨ NEW
- **Location**: `docs/graphviz/print-*.dot`
- **Purpose**: Printing on paper
- **Font Size**: 14-16pt (40% larger!)
- **Line Width**: 2.0-2.5 (2x thicker)
- **Detail Level**: Simplified (key steps only)
- **Best For**: Printing, presentations, quick reference

## Recommended Flowcharts for Printing

### 1. Single-Page Overview (BEST FOR PRESENTATIONS)
**File**: `print-00-overview.dot`
- Complete 6-stage workflow on one page
- Large fonts (16pt)
- Perfect for presentations or handouts

### 2. Core User Flows
- `print-01-authentication.dot` - How users sign in/up
- `print-02-item-registration.dot` - How to register items
- `print-03-qr-scanning.dot` - QR code scanning process
- `print-04-report-found.dot` - Reporting found items

### 3. Technical Flows
- `print-05-ai-matching.dot` - AI matching algorithm
- `print-10-admin-dashboard.dot` - Admin features
- `print-14-home-dashboard.dot` - Home screen navigation

## How to Generate Print-Ready Files

### Method 1: Online (Easiest)
1. Go to https://dreampuf.github.io/GraphvizOnline/
2. Open any `print-*.dot` file from `docs/graphviz/`
3. Copy the entire content
4. Paste into the online editor
5. Click "Export" → Choose format:
   - **PDF** (recommended for printing)
   - **PNG** (for presentations)
   - **SVG** (for editing)
6. Download and print

### Method 2: Command Line (Best Quality)
```bash
# Navigate to the graphviz directory
cd docs/graphviz

# Generate high-quality PDF (300 DPI)
dot -Tpdf -Gdpi=300 print-00-overview.dot -o overview.pdf

# Generate PNG
dot -Tpng -Gdpi=300 print-01-authentication.dot -o auth.png

# Generate all print-optimized PDFs at once
for file in print-*.dot; do
    dot -Tpdf -Gdpi=300 "$file" -o "${file%.dot}.pdf"
done
```

### Method 3: VS Code Extension
1. Install "Graphviz Preview" extension
2. Open any `print-*.dot` file
3. Press `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (Mac)
4. Right-click → "Export as PDF/PNG"

## Print Settings Recommendations

### For Best Results
- **Paper Size**: A4 or Letter
- **Orientation**: 
  - Landscape for `print-00-overview.dot`
  - Portrait for most other flows
- **Quality**: High/Best (300 DPI minimum)
- **Color**: Yes (colors help distinguish flow stages)
- **Margins**: Normal (0.5-1 inch)
- **Scale**: Fit to page

### For Black & White Printing
The flowcharts work well in grayscale:
- Different shapes (boxes, diamonds, ovals) provide visual distinction
- Bold lines (2.0-2.5pt) remain visible
- Text is large enough (14-16pt) to read clearly

## Comparison Table

| Feature | Original | Print-Optimized |
|---------|----------|-----------------|
| Font Size | 10-11pt | 14-16pt |
| Line Width | 1.0pt | 2.0-2.5pt |
| Node Labels | Detailed | Simplified |
| Spacing | Compact | Generous |
| Best For | Digital | Paper |
| Readability (Print) | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Tips for Presentations

1. **Start with Overview**: Use `print-00-overview.dot` to show the big picture
2. **Drill Down**: Show specific flows (auth, registration, etc.) as needed
3. **Print Handouts**: Print 2-3 key flows for audience reference
4. **Use Landscape**: Most flows work better in landscape orientation
5. **Test Print**: Always do a test print to check readability

## File Size Guide

Approximate file sizes when exported:
- **PDF**: 50-200 KB per flowchart
- **PNG (300 DPI)**: 200-500 KB per flowchart
- **SVG**: 20-50 KB per flowchart (scalable)

## Troubleshooting

### Text Too Small When Printed
- Use the `print-*.dot` versions (not the originals)
- Increase DPI: `-Gdpi=400` or `-Gdpi=600`
- Print in landscape orientation

### Flowchart Cut Off
- Use "Fit to page" in print settings
- Or reduce DPI slightly: `-Gdpi=250`

### Colors Not Printing
- Check printer color settings
- Flowcharts work fine in grayscale too

### Lines Too Thin
- Use `print-*.dot` versions (lines are 2x thicker)
- Original versions have thinner lines for screen viewing

## Need More Detail?

If you need the detailed versions for documentation:
- Use the original `.dot` files (without "print-" prefix)
- These have all the detailed steps and conditions
- Better for comprehensive documentation
- View digitally or print on larger paper (A3)

## Questions?

See also:
- `docs/graphviz/README.md` - Complete file listing
- `docs/graphviz/PRINT_OPTIMIZED_README.md` - Technical details
- `docs/flowcharts.md` - Mermaid.js versions (alternative format)

---

**Summary**: For printing, always use the `print-*.dot` files. Start with `print-00-overview.dot` for a single-page overview!
