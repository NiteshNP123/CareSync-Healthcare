import React, { type ReactNode } from 'react';
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type HTMLMotionProps,
} from 'framer-motion';
import { Check, Loader2, Sparkles } from 'lucide-react';
import {
  MOTION_DURATIONS,
  MOTION_EASINGS,
  pageVariants,
  pageVariantsReduced,
  fadeInVariants,
  fadeInReducedVariants,
  scaleInVariants,
  staggerContainerVariants,
  staggerItemVariants,
  tabContentVariants,
  modalBackdropVariants,
  modalPanelVariants,
  timelineNodeVariants,
  timelineCardVariants,
  timelineConnectorVariants,
} from '@/lib/motion';

/**
 * 1. PageTransition
 * Calm entrance and exit for route changes.
 */
export function PageTransition({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const variants = shouldReduceMotion ? pageVariantsReduced : pageVariants;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * 2. FadeIn
 * Subtle fade-in with optional delay and direction.
 */
export function FadeIn({
  children,
  delay = 0,
  duration = MOTION_DURATIONS.standard,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();
  const variants = shouldReduceMotion ? fadeInReducedVariants : fadeInVariants;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      custom={{ delay, duration }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * 3. SlideIn
 * Directional entrance with calm easing.
 */
export function SlideIn({
  children,
  direction = 'up',
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  delay?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  const getInitialOffset = () => {
    if (shouldReduceMotion) return { x: 0, y: 0 };
    switch (direction) {
      case 'up':
        return { x: 0, y: 12 };
      case 'down':
        return { x: 0, y: -12 };
      case 'left':
        return { x: 12, y: 0 };
      case 'right':
        return { x: -12, y: 0 };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...getInitialOffset() }}
      animate={{
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          duration: MOTION_DURATIONS.standard,
          delay,
          ease: MOTION_EASINGS.easeOutCubic,
        },
      }}
      exit={{
        opacity: 0,
        transition: { duration: MOTION_DURATIONS.fast },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * 4. ScaleIn
 * Restrained scale pop for interactive state changes.
 */
export function ScaleIn({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={
        shouldReduceMotion
          ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
          : scaleInVariants
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * 5. StaggerContainer & StaggerItem
 * Progressive entry for lists, metrics, and cards.
 */
export function StaggerContainer({
  children,
  stagger = 0.05,
  delayChildren = 0.02,
  className = '',
}: {
  children: ReactNode;
  stagger?: number;
  delayChildren?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={shouldReduceMotion ? {} : staggerContainerVariants}
      custom={{ stagger, delayChildren }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={
        shouldReduceMotion
          ? { initial: { opacity: 0 }, animate: { opacity: 1 } }
          : staggerItemVariants
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * 6. TabContent
 * Smooth content transition without page-level flicker.
 */
export function TabContent({
  tabKey,
  children,
  className = '',
}: {
  tabKey: string;
  children: ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={
          shouldReduceMotion
            ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
            : tabContentVariants
        }
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * 7. AmbientFloating
 * Extremely subtle ambient motion for hero background elements (disabled on reduced motion).
 */
export function AmbientFloating({
  children,
  duration = 6,
  yOffset = 6,
  className = '',
}: {
  children: ReactNode;
  duration?: number;
  yOffset?: number;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate={{ y: [-yOffset, yOffset, -yOffset] }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * 8. ModalTransition
 * Calmer backdrop and dialog presentation with Escape listener.
 */
export function ModalTransition({
  isOpen,
  onClose,
  children,
  className = '',
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial="initial"
          animate="animate"
          exit="exit"
          variants={modalBackdropVariants}
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            key="modal-panel"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={modalPanelVariants}
            className={`modal-panel ${className}`}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 9. StatusTransition
 * Smoothly morphs status badges (e.g. PENDING -> CONFIRMED / DELIVERED).
 */
export function StatusTransition({
  status,
  variant = 'slate',
  label,
  icon,
}: {
  status: string;
  variant?: 'green' | 'amber' | 'coral' | 'slate' | 'blue' | 'purple';
  label?: string;
  icon?: ReactNode;
}) {
  const colorMap = {
    green: 'bg-[hsl(155_40%_90%)] text-[hsl(155_43%_26%)] border-[hsl(155_40%_80%)]',
    amber: 'bg-[hsl(38_73%_89%)] text-[hsl(29_65%_32%)] border-[hsl(38_73%_78%)]',
    coral: 'bg-[hsl(8_65%_92%)] text-[hsl(3_55%_38%)] border-[hsl(8_65%_82%)]',
    slate: 'bg-[hsl(190_14%_91%)] text-[hsl(190_15%_38%)] border-[hsl(190_14%_82%)]',
    blue: 'bg-[hsl(199_60%_92%)] text-[hsl(199_68%_32%)] border-[hsl(199_60%_82%)]',
    purple: 'bg-[hsl(260_55%_93%)] text-[hsl(260_55%_36%)] border-[hsl(260_55%_82%)]',
  };

  return (
    <motion.span
      layout
      key={status}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: MOTION_DURATIONS.fast, ease: MOTION_EASINGS.easeOutExpo }}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wider ${colorMap[variant]}`}
    >
      {icon || <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      <span>{label || status.replaceAll('_', ' ')}</span>
    </motion.span>
  );
}

/**
 * 10. TimelineNode & TimelineConnector
 * The Hero CareSync Healthcare Journey timeline animation.
 */
export function TimelineNode({
  index = 0,
  accentColor,
  icon,
}: {
  index?: number;
  accentColor: string;
  icon: ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      custom={index}
      initial="initial"
      animate="animate"
      variants={shouldReduceMotion ? { initial: { opacity: 0 }, animate: { opacity: 1 } } : timelineNodeVariants}
      className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-[3px] border-[hsl(var(--background))] shadow-[0_0_0_1px_hsl(var(--border))]"
      style={{ backgroundColor: accentColor }}
    >
      {icon}
    </motion.div>
  );
}

export function TimelineConnector({
  index = 0,
}: {
  index?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      custom={index}
      initial="initial"
      animate="animate"
      variants={shouldReduceMotion ? { initial: { opacity: 0 }, animate: { opacity: 1 } } : timelineConnectorVariants}
      className="absolute bottom-0 left-[15px] top-[32px] w-[2px] bg-[hsl(var(--border))]"
    />
  );
}

/**
 * 11. ProgressIndicator
 * Accessible, stepped progress timeline for Lab, Pharmacy, Payment & Appointment states.
 */
export function ProgressIndicator({
  steps,
  currentStepIndex,
  className = '',
}: {
  steps: Array<{ label: string; description?: string }>;
  currentStepIndex: number;
  className?: string;
}) {
  return (
    <nav aria-label="Care Progress" className={`w-full ${className}`}>
      <ol className="flex items-center justify-between gap-2">
        {steps.map((step, i) => {
          const isCompleted = i < currentStepIndex;
          const isCurrent = i === currentStepIndex;

          return (
            <React.Fragment key={step.label}>
              <li className="flex flex-1 flex-col items-center text-center">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isCompleted || isCurrent
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--muted))',
                    color: isCompleted || isCurrent
                      ? 'hsl(var(--primary-foreground))'
                      : 'hsl(var(--muted-foreground))',
                    scale: isCurrent ? 1.06 : 1,
                  }}
                  transition={{ duration: MOTION_DURATIONS.fast }}
                  className="grid h-7 w-7 place-items-center rounded-full text-xs font-bold shadow-sm"
                >
                  {isCompleted ? <Check size={14} strokeWidth={2.5} /> : i + 1}
                </motion.div>
                <span
                  className={`mt-1.5 text-[0.68rem] font-semibold ${
                    isCurrent
                      ? 'text-[hsl(var(--primary))] font-bold'
                      : isCompleted
                      ? 'text-[hsl(var(--foreground))]'
                      : 'text-[hsl(var(--muted-foreground))]'
                  }`}
                >
                  {step.label}
                </span>
              </li>
              {i < steps.length - 1 && (
                <div
                  className="mb-4 h-1 flex-1 overflow-hidden rounded-full bg-[hsl(var(--muted))]"
                  aria-hidden="true"
                >
                  <motion.div
                    initial={false}
                    animate={{
                      width: isCompleted ? '100%' : '0%',
                    }}
                    transition={{ duration: MOTION_DURATIONS.standard, ease: MOTION_EASINGS.easeOutCubic }}
                    className="h-full bg-[hsl(var(--primary))]"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * 12. SkeletonLoader
 * Calmer, accessible healthcare shimmer placeholder.
 */
export function SkeletonLoader({
  className = 'h-5 w-full',
  count = 1,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div className="space-y-2.5" role="status" aria-label="Loading health data...">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0.55 }}
          animate={{ opacity: [0.55, 0.85, 0.55] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.12,
          }}
          className={`rounded-lg bg-[hsl(var(--muted))] ${className}`}
        />
      ))}
      <span className="sr-only">Loading healthcare records...</span>
    </div>
  );
}

/**
 * 13. SuccessAnimation
 * Restrained SVG checkmark draw animation on confirmed states.
 */
export function SuccessAnimation({
  size = 48,
  title = 'Completed',
  subtitle,
  className = '',
}: {
  size?: number;
  title?: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 350 }}
        className="grid place-items-center rounded-full bg-[hsl(155_40%_90%)] text-[hsl(155_43%_26%)]"
        style={{ width: size, height: size }}
      >
        <motion.svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M20 6L9 17l-5-5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, delay: 0.08, ease: 'easeOut' }}
          />
        </motion.svg>
      </motion.div>
      {title && <h3 className="font-display mt-3 text-xl font-bold">{title}</h3>}
      {subtitle && <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{subtitle}</p>}
    </div>
  );
}

/**
 * 14. AIAnalyzingPulse
 * Calm medical shimmer pulse during AI synthesis without artificial delay.
 */
export function AIAnalyzingPulse({
  label = 'Synthesizing verified medical timeline...',
}: {
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--accent)/.3)] bg-[hsl(var(--accent)/.08)] px-4 py-3 text-xs font-semibold text-[hsl(var(--accent-foreground))]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="text-[hsl(var(--accent))]"
      >
        <Sparkles size={16} />
      </motion.div>
      <span>{label}</span>
    </div>
  );
}
