# Print-Optimized Flowcharts

These are simplified, print-friendly versions of the LF App flowcharts designed for better visibility when printed on paper.

## Key Improvements for Printing

1. **Larger fonts** (14pt for nodes, 12pt for edges)
2. **Bolder lines** (penwidth=2.0)
3. **Simplified labels** (removed excessive detail)
4. **Better contrast** (darker colors, thicker borders)
5. **Optimized layout** (better spacing for clarity)

## How to Generate Print-Ready PDFs

```bash
# Generate high-quality PDF (recommended for printing)
dot -Tpdf -Gdpi=300 print-01-authentication.dot -o auth-flow.pdf

# Generate PNG (alternative)
dot -Tpng -Gdpi=300 print-01-authentication.dot -o auth-flow.png
```

## Print Settings Recommendations

- **Paper Size**: A4 or Letter
- **Orientation**: Landscape (for most flows)
- **Quality**: High/Best
- **Color**: Yes (or grayscale if needed)
- **Scale**: Fit to page

## Available Print-Optimized Flowcharts

### Overview Flowcharts (Start Here!)
- `print-00-overview.dot` - Single-page 6-stage workflow (SIMPLEST)
- `print-00-simplified-workflow.dot` - Simplified 6-stage journey
- `print-00-complete-system.dot` - Complete system with all features (COMPREHENSIVE)
- `print-00-system-architecture.dot` - System architecture and tech stack

### Core User Flows
- `print-01-authentication.dot` - Authentication & Registration
- `print-02-item-registration.dot` - Item Registration
- `print-03-qr-scanning.dot` - QR Code Scanning
- `print-04-report-found.dot` - Report Found Item
- `print-05-ai-matching.dot` - AI Matching System
- `print-06-match-review.dot` - Match Review & Confirmation
- `print-07-chat-messaging.dot` - Chat/Messaging
- `print-08-my-items.dot` - My Items Management
- `print-09-notifications.dot` - Notifications/Alerts

### Admin Flows
- `print-10-admin-dashboard.dot` - Admin Dashboard
- `print-11-student-management.dot` - Student Management
- `print-12-custody-log.dot` - Custody Log

### Dashboard & Settings
- `print-13-profile-settings.dot` - Profile & Settings
- `print-14-home-dashboard.dot` - Home Dashboard

## Comparison

| Feature | Original | Print-Optimized |
|---------|----------|-----------------|
| Font Size | 10-11pt | 14pt |
| Line Width | 1.0 | 2.0 |
| Node Detail | High | Simplified |
| Spacing | Compact | Generous |
| Print Clarity | Medium | High |

---

**Note**: Original detailed versions are still available in the same directory without the `print-` prefix.
