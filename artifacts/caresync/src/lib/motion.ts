import type { Transition, Variants } from 'framer-motion';

/**
 * CareSync Healthcare Motion Tokens
 * Standardized calm, accessible, and performant interaction timings.
 */
export const MOTION_DURATIONS = {
  instant: 0.1,
  micro: 0.16, // 160ms - button hovers, micro-interactions
  fast: 0.24,  // 240ms - tabs, chips, toggles, small modals
  standard: 0.32, // 320ms - card entrance, drawer, list items
  journey: 0.48,  // 480ms - hero timeline progressive reveals
  expanded: 0.60, // 600ms - full page crossfades
} as const;

export const MOTION_EASINGS = {
  // Calm, natural deceleration (Apple HIG / Healthcare SaaS standard)
  easeOutCubic: [0.215, 0.61, 0.355, 1],
  easeOutExpo: [0.16, 1, 0.3, 1],
  easeInOutCubic: [0.645, 0.045, 0.355, 1],
  // Restrained physical springs for interactive feedback
  springRestrained: { type: 'spring', damping: 28, stiffness: 320, mass: 0.8 },
  springGentle: { type: 'spring', damping: 32, stiffness: 220, mass: 1 },
  springSnappy: { type: 'spring', damping: 22, stiffness: 420, mass: 0.6 },
} as const;

/**
 * Page Transitions
 */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.standard,
      ease: MOTION_EASINGS.easeOutCubic,
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeOutCubic,
    },
  },
};

export const pageVariantsReduced: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: MOTION_DURATIONS.fast } },
  exit: { opacity: 0, transition: { duration: MOTION_DURATIONS.instant } },
};

/**
 * Fade In & Subtle Slide Primitives
 */
export const fadeInVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: (custom = {}) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: custom.duration ?? MOTION_DURATIONS.standard,
      delay: custom.delay ?? 0,
      ease: MOTION_EASINGS.easeOutCubic,
    },
  }),
  exit: { opacity: 0, y: -4, transition: { duration: MOTION_DURATIONS.fast } },
};

export const fadeInReducedVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: MOTION_DURATIONS.fast } },
  exit: { opacity: 0, transition: { duration: MOTION_DURATIONS.instant } },
};

/**
 * Scale In (for Modals, Badges, Confirmations)
 */
export const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 4 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 3,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeOutCubic,
    },
  },
};

/**
 * Stagger Container & Child Items
 */
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: (custom = {}) => ({
    transition: {
      staggerChildren: custom.stagger ?? 0.06,
      delayChildren: custom.delayChildren ?? 0.02,
    },
  }),
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.standard,
      ease: MOTION_EASINGS.easeOutCubic,
    },
  },
};

/**
 * Tab Content Transition
 */
export const tabContentVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeOutCubic,
    },
  },
  exit: {
    opacity: 0,
    y: -3,
    transition: {
      duration: MOTION_DURATIONS.instant,
    },
  },
};

/**
 * Timeline Node & Connector Transitions (The Hero Healthcare Journey)
 */
export const timelineNodeVariants: Variants = {
  initial: { opacity: 0, scale: 0.7 },
  animate: (index = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: index * 0.06,
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeOutExpo,
    },
  }),
};

export const timelineCardVariants: Variants = {
  initial: { opacity: 0, x: -6, y: 4 },
  animate: (index = 0) => ({
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      delay: index * 0.06 + 0.03,
      duration: MOTION_DURATIONS.standard,
      ease: MOTION_EASINGS.easeOutCubic,
    },
  }),
};

export const timelineConnectorVariants: Variants = {
  initial: { scaleY: 0, originY: 0 },
  animate: (index = 0) => ({
    scaleY: 1,
    transition: {
      delay: index * 0.06 + 0.02,
      duration: MOTION_DURATIONS.standard,
      ease: MOTION_EASINGS.easeOutCubic,
    },
  }),
};

/**
 * Modal Backdrop & Panel Transitions
 */
export const modalBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: MOTION_DURATIONS.fast } },
  exit: { opacity: 0, transition: { duration: MOTION_DURATIONS.fast } },
};

export const modalPanelVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: {
      duration: MOTION_DURATIONS.fast,
      ease: MOTION_EASINGS.easeOutCubic,
    },
  },
};
