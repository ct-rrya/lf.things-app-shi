# Quick Guide: Printing LF App Flowcharts

## 🎯 TL;DR

**Want to print flowcharts?** Use these files:
- `docs/graphviz/print-00-overview.dot` - Single-page overview (BEST)
- `docs/graphviz/print-00-complete-system.dot` - Complete system
- Plus 16 more print-optimized flowcharts for specific features

**How to print:**
1. Open https://dreampuf.github.io/GraphvizOnline/
2. Copy & paste file content
3. Export as PDF
4. Print in landscape

## ✨ What's New?

We now have **print-optimized flowcharts** with:
- **40% larger fonts** (14-16pt vs 10-11pt)
- **2x thicker lines** (2.0pt vs 1.0pt)
- **Simplified labels** (key points only)
- **Better spacing** (easier to read)

## 📁 File Locations

### Print-Optimized (For Printing)
Location: `docs/graphviz/print-*.dot`

**Overview:**
- `print-00-overview.dot` - 6-stage workflow (1 page)
- `print-00-complete-system.dot` - Full system

**Core Flows:**
- `print-01-authentication.dot` - Sign in/up
- `print-02-item-registration.dot` - Register items
- `print-03-qr-scanning.dot` - QR scanning
- `print-04-report-found.dot` - Report found
- `print-05-ai-matching.dot` - AI matching

**Dashboards:**
- `print-10-admin-dashboard.dot` - Admin panel
- `print-14-home-dashboard.dot` - Home screen

### Original (For Documentation)
Location: `docs/graphviz/*.dot` (without "print-" prefix)
- More detailed
- Better for digital viewing
- 20 flowcharts available

### Mermaid (For GitHub)
Location: `docs/flowcharts.md`
- GitHub-friendly format
- 14 major features
- Renders automatically

## 🖨️ How to Print

### Method 1: Online (Easiest)
1. Go to https://dreampuf.github.io/GraphvizOnline/
2. Open `docs/graphviz/print-00-overview.dot`
3. Copy all content
4. Paste into online editor
5. Click "Export" → "PDF"
6. Download and print

### Method 2: Command Line
```bash
cd docs/graphviz
dot -Tpdf -Gdpi=300 print-00-overview.dot -o overview.pdf
```

### Method 3: VS Code
1. Install "Graphviz Preview" extension
2. Open any `print-*.dot` file
3. Press `Ctrl+Shift+V` (or `Cmd+Shift+V`)
4. Export as PDF

## ⚙️ Print Settings

- **Paper**: A4 or Letter
- **Orientation**: Landscape (recommended)
- **Quality**: 300 DPI
- **Color**: Yes (or grayscale)
- **Scale**: Fit to page

## 📊 Comparison

| Feature | Original | Print-Optimized |
|---------|----------|-----------------|
| Font Size | 10-11pt | 14-16pt |
| Line Width | 1.0pt | 2.0-2.5pt |
| Detail | High | Simplified |
| Best For | Digital | Paper |
| Print Quality | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 📚 More Information

- **Complete Index**: `docs/FLOWCHARTS_INDEX.md`
- **Detailed Guide**: `docs/PRINTING_FLOWCHARTS_GUIDE.md`
- **Quick Start**: `docs/FLOWCHART_QUICK_START.md`
- **Visual Comparison**: `docs/graphviz/VISUAL_COMPARISON.md`
- **All Documentation**: `docs/README.md`

## 💡 Tips

1. Start with `print-00-overview.dot` for presentations
2. Use landscape orientation for better fit
3. Test print one page before printing all
4. Colors help but grayscale works too
5. 300 DPI is perfect for most printers

## 🎓 For Thesis Defense

Recommended prints:
1. `print-00-overview.dot` - Main slide
2. `print-00-complete-system.dot` - Detailed system
3. `print-05-ai-matching.dot` - AI algorithm (if needed)

Print 2-3 copies as handouts for committee members.

## ❓ Questions?

See the complete documentation in `docs/` folder:
- Flowchart index
- Printing guides
- Visual comparisons
- PDF generation scripts

---

**Quick Links:**
- [Flowcharts Index](docs/FLOWCHARTS_INDEX.md)
- [Printing Guide](docs/PRINTING_FLOWCHARTS_GUIDE.md)
- [Quick Start](docs/FLOWCHART_QUICK_START.md)
- [Documentation](docs/README.md)
