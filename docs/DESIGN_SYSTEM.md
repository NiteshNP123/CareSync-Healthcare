# CareSync — Design System & Visual Standards Guide

**Document Version:** 1.0.0  
**Project:** CareSync – An AI-Assisted Healthcare Journey and Care Coordination Platform  

---

## 1. Visual Philosophy & Design Identity

CareSync is crafted to evoke **Apple-level visual restraint**, **Linear-level interface consistency**, and the highest standards of **modern healthcare technology**:

1. **Trust & Calmness:** Deep healthcare navy (`hsl(216 33% 14%)`), restrained healthcare teal (`hsl(174 58% 34%)`), and soft blue-grey neutrals eliminate anxiety and visual noise.
2. **Clinical Legibility:** Highly structured typography hierarchies powered by `DM Sans` (body and UI), `Fraunces` (warm, human editorial serif for hero titles), and `JetBrains Mono` (for CareSync IDs, dosages, and biometric values).
3. **Role-Tailored Density:**
   - **Patient:** Calm, spacious, prioritizing continuous care milestones.
   - **Doctor:** Fast, high information density, structured clinical assessment and prescription tools.
   - **Laboratory:** Worklist- and sample-status-oriented.
   - **Pharmacy:** Order fulfillment, stock review, and dispatch tracking.
   - **Caregiver:** Clear, legible delegated health view.
   - **Admin / Governance:** Operational credential validation and immutable security audit logs.

---

## 2. Color System Tokens

| Token | Light Mode Value | Usage |
|---|---|---|
| `--primary` | `hsl(174 58% 34%)` | Primary interactive buttons, key brand elements, active states |
| `--primary-foreground` | `hsl(210 25% 98%)` | Text on primary brand surfaces |
| `--secondary` | `hsl(210 28% 94%)` | Secondary action buttons, subtle card headers |
| `--background` | `hsl(210 25% 98%)` | Main application background (soft, warm neutral) |
| `--card` | `hsl(0 0% 100%)` | Elevated content cards, panels, modals |
| `--sidebar` | `hsl(216 33% 14%)` | Deep clinical navy sidebar navigation |
| `--accent` | `hsl(198 75% 45%)` | Medical insight blue, AI assistant highlights |
| `--destructive` | `hsl(0 72% 51%)` | Critical clinical warnings, access denials, revocations |

### Semantic Status Badges
- **Completed / Verified (Green):** `hsl(155 45% 91%)` background, `hsl(155 48% 28%)` text.
- **Pending / Scheduled (Amber):** `hsl(38 75% 90%)` background, `hsl(32 75% 32%)` text.
- **Processing / Active (Blue):** `hsl(198 65% 91%)` background, `hsl(198 75% 32%)` text.
- **Denied / Critical (Coral):** `hsl(0 68% 92%)` background, `hsl(0 65% 38%)` text.

---

## 3. Typography Scale & Hierarchy

| Level | Font Family | Size / Line Height | Weight | Usage |
|---|---|---|---|---|
| **Display** | `Fraunces` | 3.8rem – 7.4rem / 0.95 | 400 | Hero landing statements |
| **Page Title (H1)** | `Fraunces` | 2.25rem – 2.5rem / 1.05 | 600–700 | Main view titles |
| **Section Header (H2)**| `Fraunces` | 1.5rem – 1.75rem / 1.2 | 700 | Card & section headers |
| **Card Header (H3)** | `DM Sans` | 1.15rem – 1.25rem / 1.3 | 700 | Doctor names, order IDs |
| **Body (Regular)** | `DM Sans` | 0.875rem / 1.5 | 400–500 | Clinical descriptions, notes |
| **UI Labels** | `DM Sans` | 0.8125rem / 1.4 | 600–700 | Buttons, tabs, form labels |
| **Metadata / Eyebrow** | `DM Sans` | 0.6875rem / 1.2 | 700 (Uppercase) | Category badges, dates |
| **Clinical Identifiers** | `JetBrains Mono` | 0.75rem – 0.85rem | 500–700 | `CS-2048-7392`, dosages, timestamps |

---

## 4. Layout, Spacing & Elevation

- **Base Radius:** `15px` (`--radius: 0.95rem`) for cards, `10px` for buttons and inputs.
- **Soft Shadows:**
  - Card Shadow: `0 2px 12px -2px rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.02)`
  - Hover Elevation: `0 14px 40px -10px rgba(15, 23, 42, 0.08)`
  - Modal / Popover: `0 20px 50px -12px rgba(15, 23, 42, 0.18)`
- **Responsive Layout:**
  - Desktop: Full sidebar navigation + 1200px max canvas.
  - Tablet (700px – 900px): Icon-only compact sidebar + auto-reflow grids.
  - Mobile (<700px): Top app header with responsive slide drawer, stacked metric cards, large touch targets (min 44px).

---

## 5. Accessibility & Human Factors

1. **WCAG AAA/AA Contrast Compliance:** High-contrast text on all clinical data surfaces.
2. **Independent Prototype Disclaimers:** All landing pages and footers clearly state:
   > *"CareSync is an independent healthcare software project and is not affiliated with or endorsed by the Government of India, ABDM, ABHA, eSanjeevani, or any government authority."*
3. **AI Safety Labeling:** All AI-assisted features include:
   > *"CareSync AI provides software-assisted healthcare information management and does not replace professional medical diagnosis or treatment."*
