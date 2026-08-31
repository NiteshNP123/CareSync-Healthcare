# CareSync — Centralized Motion System & Interaction Guide

**Document Version:** 1.0.0  
**Project:** CareSync – An AI-Assisted Healthcare Journey and Care Coordination Platform  

---

## 1. Motion Design Principles

CareSync is a mission-critical healthcare application. Visual motion must convey clinical progress, state transitions, hierarchy, and context without becoming distracting or flashy.

1. **Progress Over Decoration:** Animations exist to communicate where the patient is in their continuous care journey (Consultation -> Investigation -> Lab -> Report -> Prescription -> Follow-up).
2. **Calm & Trustworthy:** Restrained timing (180ms to 520ms) using cubic bezier easing curves modeled after modern clinical and Apple HIG standards.
3. **Accessibility First (`prefers-reduced-motion`):** When reduced motion is requested, translations and scales are stripped in favor of clean opacity fades and instantaneous layout stability.
4. **Never Block Interaction:** Animations never lock UI inputs or artificially delay medical insights.

---

## 2. Standard Motion Tokens

| Token | Duration | Usage |
|---|---|---|
| `MOTION_DURATIONS.micro` | 180ms | Button elevation, switch toggles, icon micro-interactions |
| `MOTION_DURATIONS.fast` | 250ms | Tabs, chips, tooltips, small modal popups |
| `MOTION_DURATIONS.standard` | 350ms | Card entrance, list stagger, drawer transitions |
| `MOTION_DURATIONS.journey` | 520ms | Hero Healthcare Journey node and connector progressive reveals |
| `MOTION_DURATIONS.expanded` | 650ms | Full page crossfades and deep clinical record views |

### Easing Functions
- **Standard Deceleration (`easeOutCubic`):** `[0.215, 0.61, 0.355, 1]`
- **Smooth Expansion (`easeOutExpo`):** `[0.16, 1, 0.3, 1]`
- **Restrained Physical Spring (`springRestrained`):** `damping: 28, stiffness: 320, mass: 0.8`

---

## 3. Centralized Motion Primitives

All motion primitives reside in `artifacts/caresync/src/components/motion/index.tsx`:

1. `<PageTransition />`: Handles top-level page entrances and route transitions.
2. `<FadeIn delay={...} />`: Subtle opacity reveal with optional Y offset (disabled in reduced-motion mode).
3. `<SlideIn direction="up"|"down"|"left"|"right" />`: Directional slide for notifications and drawers.
4. `<ScaleIn />`: Restrained spring pop for modals and badges.
5. `<StaggerContainer />` & `<StaggerItem />`: Progressive cascade for metric tiles, doctor cards, and orders.
6. `<ModalTransition />`: Backdrop and dialog panel animation with keyboard and click-outside dismissal.
7. `<StatusTransition />`: Animated state pill with color morphing for lifecycle stages (`PENDING` -> `IN_PROGRESS` -> `COMPLETED`).
8. `<TimelineNode />` & `<TimelineConnector />`: The Hero connected Healthcare Journey visualizer.
9. `<ProgressIndicator />`: Multi-step progress bar for Lab, Pharmacy, Payment, and Appointment stages.
10. `<SkeletonLoader />`: Accessible medical shimmer placeholder.
11. `<SuccessAnimation />`: Animated SVG checkmark for confirmed bookings, payments, and consent approvals.
12. `<AIAnalyzingPulse />`: Medical synthesis pulse indicator with aria live region announcements.

---

## 4. Workflow-Specific Transitions

### 1. Healthcare Journey Timeline
- **Interaction:** Chronological moments are sequentially revealed with progressive connector line scaling (`TimelineConnector`) and pulsing accent nodes (`TimelineNode`).
- **Context:** Visualizes handoffs between Doctor, Diagnostic Lab, and Pharmacy.

### 2. Doctor Appointment Booking
- **Interaction:** Doctor selection opens `<ModalTransition />`; confirming booking displays `<SuccessAnimation />` with verified status before updating the Journey.

### 3. Patient Consent Governance
- **Interaction:** Dynamic `<StatusTransition />` morphs from amber (`Pending`) to green (`Allowed`) or coral (`Denied`) upon simulated OTP verification.

### 4. Pharmacy Fulfillment
- **Interaction:** Order cards feature stepped `<ProgressIndicator />` tracking stages: `Placed` -> `Review` -> `Packed` -> `On way` -> `Delivered`.

### 5. AI Information Assistant
- **Interaction:** Shows `<AIAnalyzingPulse />` during data assembly; gently reveals clinical summary with `<FadeIn />` alongside mandatory safety disclaimer.
