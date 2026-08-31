import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  FlaskConical,
  HeartPulse,
  Home,
  Info,
  KeyRound,
  LockKeyhole,
  MapPin,
  Menu,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Stethoscope,
  TestTube2,
  Truck,
  UserCheck,
  UserRound,
  Users,
  Video,
  WalletCards,
  X,
  XCircle,
} from 'lucide-react';
import {
  getGetCareSyncAiSummaryQueryKey,
  getGetCareSyncDashboardQueryKey,
  getGetCareSyncJourneyQueryKey,
  getListAccessRequestsQueryKey,
  getListCareSyncAppointmentsQueryKey,
  getListCareSyncDoctorsQueryKey,
  getListPharmacyOrdersQueryKey,
  useCreateCareSyncAppointment,
  useDecideAccessRequest,
  useGetCareSyncAiSummary,
  useGetCareSyncDashboard,
  useGetCareSyncJourney,
  useListAccessRequests,
  useListCareSyncAppointments,
  useListCareSyncDoctors,
  useListPharmacyOrders,
  type AccessRequest,
  type Appointment,
  type Doctor,
  type JourneyEvent,
  type PharmacyOrder,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import {
  PageTransition,
  FadeIn,
  SlideIn,
  ScaleIn,
  StaggerContainer,
  StaggerItem,
  TabContent,
  ModalTransition,
  StatusTransition,
  TimelineNode,
  TimelineConnector,
  ProgressIndicator,
  SkeletonLoader,
  SuccessAnimation,
  AIAnalyzingPulse,
} from '@/components/motion';
import { AnimatePresence, motion } from 'framer-motion';
import { JourneyDetailModal } from '@/components/journey-modal';
import { ShareTransferModal } from '@/components/share-transfer-modal';
import { ExplainReportModal } from '@/components/explain-report-modal';
import { SandboxPaymentModal } from '@/components/sandbox-payment-modal';

const queryClient = new QueryClient();

export type UserRole = 'PATIENT' | 'DOCTOR' | 'LAB_STAFF' | 'PHARMACY_STAFF' | 'CAREGIVER' | 'ADMIN';

interface Persona {
  id: UserRole;
  label: string;
  name: string;
  subtext: string;
  initials: string;
  badge: string;
  icon: typeof UserRound;
}

const PERSONAS: Persona[] = [
  { id: 'PATIENT', label: 'Patient', name: 'Rahul Sharma', subtext: 'CareSync ID: CS-2048-7392', initials: 'RS', badge: 'Patient', icon: UserRound },
  { id: 'DOCTOR', label: 'Doctor', name: 'Dr. Rahul Mehta', subtext: 'Internal Medicine · Northstar', initials: 'RM', badge: 'Physician', icon: Stethoscope },
  { id: 'LAB_STAFF', label: 'Diagnostics', name: 'ABC Diagnostics', subtext: 'Richmond Road · NABL', initials: 'AD', badge: 'Laboratory', icon: FlaskConical },
  { id: 'PHARMACY_STAFF', label: 'Pharmacy', name: 'XYZ Pharmacy', subtext: 'Indiranagar · Dispensing', initials: 'XP', badge: 'Pharmacy', icon: Pill },
  { id: 'CAREGIVER', label: 'Caregiver', name: 'Priya Sharma', subtext: 'Family Care Delegate', initials: 'PS', badge: 'Caregiver', icon: Users },
  { id: 'ADMIN', label: 'Governance', name: 'CareSync Compliance', subtext: 'Audit & Verification', initials: 'CC', badge: 'Admin', icon: ShieldCheck },
];

const fallbackAppointment: Appointment = {
  id: 1,
  doctorName: 'Dr. Rahul Mehta',
  specialization: 'Internal Medicine',
  date: '2026-09-15',
  time: '11:30 AM',
  mode: 'Video consultation',
  status: 'CONFIRMED',
  fee: 850,
};

const fallbackJourney: JourneyEvent[] = [
  { id: 1, title: 'Follow-up Consultation', type: 'consultation', status: 'completed', date: '2026-08-28', provider: 'Dr. Rahul Mehta', organization: 'Northstar Medical Centre', description: 'Review glucose trends and discuss ongoing cardiometabolic care plan.', accent: 'teal' },
  { id: 2, title: 'HbA1c & Fasting Lipid Report', type: 'report', status: 'completed', date: '2026-08-21', provider: 'ABC Diagnostics', organization: 'Richmond Road Branch', description: 'Verified report added to continuous journey. Fasting glucose 114 mg/dL, HbA1c 6.6%.', accent: 'blue' },
  { id: 3, title: 'Diagnostic Blood Sample Collected', type: 'test', status: 'completed', date: '2026-08-19', provider: 'ABC Diagnostics', organization: 'Richmond Road Branch', description: 'Comprehensive metabolic panel & fasting lipid profile processed.', accent: 'violet' },
  { id: 4, title: 'Prescription Dispensed', type: 'medication', status: 'active', date: '2026-08-12', provider: 'XYZ Pharmacy', organization: 'XYZ Pharmacy · Order PS-2048', description: 'Metformin 500mg SR once daily added to active care plan.', accent: 'amber' },
  { id: 5, title: 'Initial Consultation', type: 'consultation', status: 'completed', date: '2026-08-12', provider: 'Dr. Rahul Mehta', organization: 'Northstar Medical Centre', description: 'Clinical symptoms reviewed and baseline metabolic investigation requested.', accent: 'rose' },
];

const fallbackDoctors: Doctor[] = [
  { id: 1, name: 'Dr. Rahul Mehta', specialization: 'Internal Medicine', organization: 'Northstar Medical Centre', location: 'Indiranagar, Bengaluru', experience: '14 years', rating: 4.9, fee: 850, verified: true, nextSlot: 'Tomorrow · 10:00 AM', initials: 'RM' },
  { id: 2, name: 'Dr. Ananya Sharma', specialization: 'Cardiology', organization: 'Aster Grove Clinic', location: 'Koramangala, Bengaluru', experience: '18 years', rating: 4.8, fee: 1200, verified: true, nextSlot: 'Tomorrow · 2:00 PM', initials: 'AS' },
  { id: 3, name: 'Dr. Kavya Menon', specialization: 'Endocrinology', organization: 'WellSpring Specialty Care', location: 'HSR Layout, Bengaluru', experience: '11 years', rating: 4.9, fee: 950, verified: true, nextSlot: 'Fri · 11:30 AM', initials: 'KM' },
];

const fallbackOrders: PharmacyOrder[] = [
  { id: 'PS-2048', pharmacy: 'XYZ Pharmacy', itemCount: 3, amount: 640, status: 'PREPARING', updatedAt: 'Updated 18 min ago' },
  { id: 'PS-1972', pharmacy: 'XYZ Pharmacy', itemCount: 2, amount: 410, status: 'DELIVERED', updatedAt: 'Delivered 14 Aug 2026' },
];

function LogoMark({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-caresync">
      <div className={`grid h-9 w-9 place-items-center rounded-[10px] transition-transform duration-200 hover:scale-105 ${dark ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]' : 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'}`}>
        <HeartPulse size={20} strokeWidth={2.4} />
      </div>
      <div className="brand-copy">
        <div className={`font-display text-[1.15rem] font-bold leading-none ${dark ? 'text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--foreground))]'}`}>CareSync</div>
        <div className={`mt-1 text-[.58rem] font-bold uppercase tracking-[.18em] ${dark ? 'text-[hsl(var(--sidebar-foreground)/.45)]' : 'text-[hsl(var(--muted-foreground))]'}`}>care, connected</div>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="app-noise min-h-[100dvh] overflow-hidden bg-[hsl(var(--background))]">
      <header className="landing-nav relative z-10 mx-auto flex max-w-[1160px] items-center justify-between px-6 py-5">
        <Link href="/" className="no-underline" data-testid="link-brand-home"><LogoMark /></Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-[hsl(var(--muted-foreground))] md:flex" aria-label="Public navigation">
          <a href="#how-it-works" data-testid="link-how-it-works" className="transition-colors hover:text-[hsl(var(--foreground))]">How it works</a>
          <a href="#care-journey" data-testid="link-care-journey" className="transition-colors hover:text-[hsl(var(--foreground))]">The connected journey</a>
          <a href="#principles" data-testid="link-care-principles" className="transition-colors hover:text-[hsl(var(--foreground))]">Clinical principles</a>
          <a href="#independent" data-testid="link-independent-prototype" className="transition-colors hover:text-[hsl(var(--foreground))]">About the prototype</a>
        </nav>
        <Link href="/app" className="btn-secondary group no-underline" data-testid="link-open-care-space">
          Open Care Space <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </header>

      <main>
        {/* REFINED BALANCED HERO SECTION */}
        <section className="landing-hero landing-grid relative mx-auto max-w-[1160px] overflow-hidden rounded-[24px] px-6 py-16 md:px-12 md:py-20">
          <div className="hero-orb right-[-8%] top-[-14%] h-[380px] w-[380px] bg-[hsl(var(--accent)/.12)]" />
          <div className="hero-orb bottom-[-18%] left-[35%] h-[280px] w-[280px] bg-[hsl(var(--primary)/.06)]" />
          
          <div className="relative z-[1] grid items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
            <div>
              <FadeIn delay={0.02}>
                <div className="eyebrow mb-4 flex items-center gap-2.5 text-[hsl(var(--primary))]">
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" />
                  CareSync · Connected Healthcare Coordination
                </div>
              </FadeIn>
              <FadeIn delay={0.05}>
                <h1 className="font-display text-balance text-3xl sm:text-4xl lg:text-5xl font-normal leading-[1.08] tracking-[-.035em] text-[hsl(var(--foreground))]">
                  Your healthcare journey <span className="text-[hsl(var(--primary))] font-medium">should never</span> start from zero.
                </h1>
              </FadeIn>
              <FadeIn delay={0.1}>
                <p className="mt-5 max-w-[560px] text-base leading-7 text-[hsl(var(--muted-foreground))]">
                  CareSync connects patients, doctors, laboratories, pharmacies, and caregivers through one continuous healthcare journey, with AI-assisted tools that help organize and explain healthcare information.
                </p>
              </FadeIn>
              <FadeIn delay={0.16}>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href="/app" className="btn-primary group no-underline text-sm h-10 px-5" data-testid="link-start-care-journey">
                    Explore CareSync <ChevronRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                  <a href="#how-it-works" className="btn-secondary group no-underline text-sm h-10 px-4" data-testid="link-see-how-it-works">
                    See how it works <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </div>
              </FadeIn>
            </div>

            {/* Visual Healthcare Journey Anchor Card */}
            <FadeIn delay={0.18}>
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-lg transition-shadow duration-200 hover:shadow-xl">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]">
                        <HeartPulse size={16} />
                      </div>
                      <span className="text-xs font-bold">Continuous Care Timeline</span>
                    </div>
                    <span className="status-pill status-green">Active Care Plan</span>
                  </div>
                  
                  <div className="mt-4 space-y-3 text-xs">
                    {[
                      { title: 'Follow-up Consultation', role: 'Dr. Rahul Mehta · Physician', date: '28 Aug', status: 'Completed', color: 'status-green' },
                      { title: 'HbA1c & Fasting Lipid Panel', role: 'ABC Diagnostics · Laboratory', date: '21 Aug', status: 'Report Ready', color: 'status-blue' },
                      { title: 'Prescription Order PS-2048', role: 'XYZ Pharmacy · Dispensing', date: '12 Aug', status: 'Dispatched', color: 'status-amber' },
                      { title: 'Specialist Cardiology Transfer', role: 'Dr. Ananya Sharma · Referral', date: 'Upcoming', status: 'Consented', color: 'status-violet' },
                    ].map((item) => (
                      <div key={item.title} className="flex items-center justify-between rounded-xl bg-[hsl(var(--secondary)/.6)] p-3 transition-colors hover:bg-[hsl(var(--secondary))]">
                        <div>
                          <div className="font-bold text-[hsl(var(--foreground))]">{item.title}</div>
                          <div className="text-[.68rem] text-[hsl(var(--muted-foreground))]">{item.role} · {item.date}</div>
                        </div>
                        <span className={`status-pill ${item.color}`}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between border-t border-[hsl(var(--border))] pt-3 text-[.68rem] text-[hsl(var(--muted-foreground))]">
                    <span>Patient-Controlled Scoped Access</span>
                    <span className="font-bold text-[hsl(var(--primary))]">Rahul Sharma (CS-2048)</span>
                  </div>
                </div>
            </FadeIn>
          </div>
        </section>

        {/* Connected Journey Visual Flow */}
        <section id="care-journey" className="mx-auto max-w-[1160px] px-6 py-20">
          <div className="text-center">
            <div className="eyebrow text-[hsl(var(--primary))]">The Connected Lifecycle</div>
            <h2 className="font-display mt-2 text-3xl font-bold leading-tight md:text-4xl">From first symptom to ongoing wellness.</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-[hsl(var(--muted-foreground))]">CareSync bridges each clinical handoff so context is never lost.</p>
          </div>
          <StaggerContainer stagger={0.06} className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {[
              [Stethoscope, 'Consultation', 'Doctor assessment & notes'],
              [TestTube2, 'Investigation', 'Diagnostic lab requisition'],
              [FileText, 'Report', 'NABL verified findings'],
              [Pill, 'Treatment', 'Prescription itemization'],
              [ShoppingBag, 'Pharmacy', 'Dispensing & delivery'],
              [CalendarDays, 'Follow-up', 'Specialist review'],
            ].map(([Icon, step, desc], i) => {
              const IconComp = Icon as typeof Stethoscope;
              return (
                <StaggerItem key={step as string}>
                  <div className="soft-card flex flex-col items-center p-5 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] font-bold">
                      <IconComp size={18} />
                    </div>
                    <div className="mt-3 font-display text-base font-bold">{step as string}</div>
                    <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))] leading-snug">{desc as string}</div>
                    <div className="mt-3 text-[.64rem] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">Step 0{i + 1}</div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto grid max-w-[1120px] gap-12 px-6 py-20 md:grid-cols-[.9fr_1.1fr] md:items-start">
          <FadeIn>
            <div>
              <div className="eyebrow text-[hsl(var(--primary))]">One Connected Thread</div>
              <h2 className="font-display mt-3 text-3xl font-bold leading-tight md:text-4xl">Care is a series of handoffs. Context makes handoffs safer.</h2>
              <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                When medical records stay organized across appointments, lab tests, and pharmacies, doctors make faster decisions and patients feel in control.
              </p>
            </div>
          </FadeIn>
          <div className="grid gap-4">
            {[
              [FileText, 'Bring the whole picture', 'Your reports and prescriptions stay connected to the appointments that made them matter.'],
              [ShieldCheck, 'Share with clarity', 'See who is asking, why they need access, and exactly what data scopes you are allowing.'],
              [Sparkles, 'Leave with a next step', 'A quiet, AI-assisted summary helps you move from “what happened?” to “what now?”'],
            ].map(([Icon, title, text], index) => {
              const IconComponent = Icon as typeof FileText;
              return (
                <FadeIn key={title as string} delay={index * 0.08} className="flex gap-4 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-all duration-200 hover:shadow-sm">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><IconComponent size={18} /></div>
                  <div className="flex-1">
                    <div className="font-display text-lg font-bold">{title as string}</div>
                    <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{text as string}</p>
                  </div>
                  <div className="font-mono-care text-xs text-[hsl(var(--muted-foreground))]">0{index + 1}</div>
                </FadeIn>
              );
            })}
          </div>
        </section>

        {/* Principles */}
        <section id="principles" className="bg-[hsl(var(--sidebar))] px-6 py-20 text-[hsl(var(--sidebar-foreground))]">
          <div className="mx-auto grid max-w-[1120px] gap-10 md:grid-cols-[1fr_1.4fr] md:items-center">
            <div>
              <div className="eyebrow text-[hsl(var(--sidebar-primary))]">Designed Around You</div>
              <h2 className="font-display mt-3 text-3xl font-bold leading-tight md:text-4xl">More human than a file cabinet.</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="border-l border-[hsl(var(--sidebar-border))] pl-4"><div className="font-display text-lg font-bold">Continuity over clutter</div><p className="mt-1 text-xs leading-5 text-[hsl(var(--sidebar-foreground)/.6)]">Only the detail that helps you take the next step. No noisy admin maze.</p></div>
              <div className="border-l border-[hsl(var(--sidebar-border))] pl-4"><div className="font-display text-lg font-bold">Consent over assumption</div><p className="mt-1 text-xs leading-5 text-[hsl(var(--sidebar-foreground)/.6)]">Your health information is yours. CareSync makes sharing legible.</p></div>
              <div className="border-l border-[hsl(var(--sidebar-border))] pl-4"><div className="font-display text-lg font-bold">Progress over panic</div><p className="mt-1 text-xs leading-5 text-[hsl(var(--sidebar-foreground)/.6)]">A steady view of what happened, what is active, and what comes next.</p></div>
              <div className="border-l border-[hsl(var(--sidebar-border))] pl-4"><div className="font-display text-lg font-bold">People over systems</div><p className="mt-1 text-xs leading-5 text-[hsl(var(--sidebar-foreground)/.6)]">Built for patients, clinicians, caregivers, labs, and pharmacies to meet in the middle.</p></div>
            </div>
          </div>
        </section>

        {/* Independent Prototype Notice */}
        <section id="independent" className="mx-auto max-w-[1120px] px-6 py-16">
          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.6)] p-6 md:flex md:items-center md:justify-between md:p-8">
            <div className="max-w-[620px]">
              <div className="eyebrow text-[hsl(var(--primary))]">Independent Software Prototype</div>
              <h3 className="font-display mt-2 text-2xl font-bold">CareSync is an independent healthcare software concept.</h3>
              <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                CareSync is not affiliated with or endorsed by the Government of India, ABDM, ABHA, eSanjeevani, or any government authority. It provides software-assisted information management and does not replace professional medical diagnosis or clinical judgment.
              </p>
            </div>
            <Link href="/app" className="btn-primary mt-5 no-underline md:mt-0 shrink-0" data-testid="link-banner-open-app">
              Open Demo <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-8">
        <div className="mx-auto flex max-w-[1160px] flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <LogoMark />
          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            CareSync © 2026 · AI-Assisted Healthcare Journey & Care Coordination Prototype
          </div>
        </div>
      </footer>
    </div>
  );
}

function AppShell({
  title,
  eyebrow,
  currentRole,
  onRoleChange,
  children,
}: {
  title: string;
  eyebrow?: string;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  children: ReactNode;
}) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeRole = currentRole ?? 'PATIENT';
  const currentPersona = PERSONAS.find((p) => p.id === activeRole) ?? PERSONAS[0];

  const roleNavItems = useMemo(() => {
    switch (activeRole) {
      case 'DOCTOR':
        return [
          { href: '/app', label: 'Workstation', icon: Stethoscope },
          { href: '/app/journey', label: 'Patient Journeys', icon: Activity },
          { href: '/app/doctors', label: 'Doctor Network', icon: Users },
          { href: '/app/consent', label: 'Consent Scopes', icon: LockKeyhole },
        ];
      case 'LAB_STAFF':
        return [
          { href: '/app', label: 'Requisitions', icon: FlaskConical },
          { href: '/app/journey', label: 'Reports Published', icon: FileCheck2 },
          { href: '/app/profile', label: 'Lab Settings', icon: UserRound },
        ];
      case 'PHARMACY_STAFF':
        return [
          { href: '/app', label: 'Fulfillment Queue', icon: ShoppingBag },
          { href: '/app/orders', label: 'All Orders', icon: Pill },
          { href: '/app/profile', label: 'Pharmacy Hub', icon: Building2 },
        ];
      case 'CAREGIVER':
        return [
          { href: '/app', label: 'Family View', icon: Users },
          { href: '/app/journey', label: 'Care Timeline', icon: Activity },
          { href: '/app/orders', label: 'Prescriptions', icon: Pill },
        ];
      case 'ADMIN':
        return [
          { href: '/app', label: 'Governance & Audit', icon: ShieldCheck },
          { href: '/app/doctors', label: 'Physician Registry', icon: UserCheck },
          { href: '/app/profile', label: 'System Policy', icon: LockKeyhole },
        ];
      case 'PATIENT':
      default:
        return [
          { href: '/app', label: 'Overview', icon: Home },
          { href: '/app/journey', label: 'My Journey', icon: Activity },
          { href: '/app/doctors', label: 'Care Team', icon: Users },
          { href: '/app/consent', label: 'Consent & Access', icon: LockKeyhole },
          { href: '/app/orders', label: 'Pharmacy Orders', icon: ShoppingBag },
          { href: '/app/profile', label: 'Profile & Privacy', icon: UserRound },
        ];
    }
  }, [activeRole]);

  return (
    <div className="shell-grid">
      {/* STRUCTURED REFINED SIDEBAR */}
      <aside className="sidebar flex flex-col p-4">
        <Link href="/app" className="mb-6 no-underline" data-testid="link-sidebar-brand"><LogoMark dark /></Link>
        
        {/* Role Persona Switcher */}
        <div className="role-switch-container mb-6 rounded-xl bg-[hsl(var(--sidebar-accent))] p-2.5">
          <div className="mb-2 flex items-center justify-between text-[.6rem] font-bold uppercase tracking-[.14em] text-[hsl(var(--sidebar-foreground)/.5)]">
            <span>Explore as Role</span>
            <span className="rounded bg-[hsl(var(--sidebar-primary)/.2)] px-1 text-[.55rem] text-[hsl(var(--sidebar-primary))]">Interactive</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const isActive = activeRole === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onRoleChange?.(p.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[0.72rem] font-bold transition-all ${isActive ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-sm scale-[1.02]' : 'text-[hsl(var(--sidebar-foreground)/.65)] hover:bg-[hsl(var(--sidebar-border))]'}`}
                  title={`${p.label}: ${p.name}`}
                >
                  <Icon size={12} className={isActive ? 'text-inherit' : 'text-[hsl(var(--sidebar-primary))]'} />
                  <span className="truncate">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="sidebar-caption mb-2.5 px-2 text-[.6rem] font-bold uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.38)]">Navigation</div>
        <nav className="grid gap-1" aria-label="Care space navigation">
          {roleNavItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href + label}
              href={href}
              className={`nav-item no-underline ${location === href ? 'nav-item-active' : ''}`}
              data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}
            >
              <Icon size={16} />
              <span className="nav-label">{label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-[hsl(var(--sidebar-border))] pt-4">
          <div className="profile-copy mb-3 flex items-center gap-2.5 px-1">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[hsl(var(--sidebar-primary))] text-xs font-bold text-[hsl(var(--sidebar-primary-foreground))]" data-testid="avatar-patient">
              {currentPersona.initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold">{currentPersona.name}</div>
              <div className="truncate text-[.65rem] text-[hsl(var(--sidebar-foreground)/.48)]">{currentPersona.subtext}</div>
            </div>
          </div>
          <Link href="/" className="nav-item no-underline text-xs" data-testid="link-back-to-home">
            <ArrowLeft size={14} />
            <span className="nav-label">Back to welcome</span>
          </Link>
        </div>
      </aside>

      <div className="main-canvas">
        {/* Mobile Sticky Header */}
        <header className="mobile-topbar">
          <Link href="/app" className="no-underline" data-testid="link-mobile-brand"><LogoMark dark /></Link>
          <button className="btn-ghost text-[hsl(var(--sidebar-foreground))]" onClick={() => setMobileOpen(!mobileOpen)} data-testid="button-toggle-mobile-nav" aria-label="Toggle navigation">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                  onClick={() => setMobileOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute left-2 right-2 top-[58px] z-50 rounded-2xl bg-[hsl(var(--sidebar))] p-4 shadow-2xl"
                >
                  <div className="mb-2 text-xs font-bold text-[hsl(var(--sidebar-primary))]">Role View:</div>
                  <div className="mb-4 grid grid-cols-3 gap-1.5">
                    {PERSONAS.map((p) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          onClick={() => { onRoleChange?.(p.id); setMobileOpen(false); }}
                          className={`flex items-center justify-center gap-1 rounded-lg p-2 text-xs font-bold ${activeRole === p.id ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]' : 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]'}`}
                        >
                          <Icon size={12} /> {p.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-1">
                    {roleNavItems.map(({ href, label, icon: Icon }) => (
                      <Link key={href + label} href={href} onClick={() => setMobileOpen(false)} className="nav-item no-underline" data-testid={`link-mobile-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
                        <Icon size={16} />{label}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </header>

        {/* Aligned Page Header */}
        <div className="content-width page-header flex flex-wrap items-end justify-between gap-4 pb-5 pt-8">
          <div>
            <div className="eyebrow">{eyebrow ?? 'CareSync Care Space'}</div>
            <h1 className="font-display mt-1 text-2xl font-bold leading-tight tracking-[-.03em] md:text-3xl" data-testid="text-page-title">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
              <currentPersona.icon size={13} className="text-[hsl(var(--primary))]" /> {currentPersona.badge} View
            </div>
          </div>
        </div>

        <main className="content-width pb-16">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  );
}

function LoadingState({ label = 'Gathering your care details' }: { label?: string }) {
  return (
    <div className="soft-card p-6" data-testid="state-loading">
      <SkeletonLoader count={4} className="h-4 w-full" />
      <p className="mt-4 text-xs text-[hsl(var(--muted-foreground))]">{label}</p>
    </div>
  );
}

function DataNotice({ onRetry, message = 'Some details are taking a moment to arrive.' }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[hsl(var(--accent)/.3)] bg-[hsl(var(--accent)/.08)] px-4 py-3 text-xs text-[hsl(var(--accent-foreground))]" data-testid="state-error">
      <span className="flex items-center gap-2 font-medium"><CircleAlert size={15} />{message}</span>
      {onRetry && (
        <button className="btn-ghost text-xs" onClick={onRetry} data-testid="button-retry-data">
          <RefreshCw size={12} /> Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="soft-card flex flex-col items-center justify-center px-6 py-14 text-center" data-testid="state-empty">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><HeartPulse size={22} /></div>
      <h3 className="font-display mt-4 text-xl font-bold">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[hsl(var(--muted-foreground))]">{body}</p>
    </div>
  );
}

function DashboardPage({ role, onRoleChange }: { role: UserRole; onRoleChange: (r: UserRole) => void }) {
  const dashboardQuery = useGetCareSyncDashboard();
  const summaryQuery = useGetCareSyncAiSummary({ query: { queryKey: getGetCareSyncAiSummaryQueryKey() } });
  const journeyQuery = useGetCareSyncJourney({ query: { queryKey: getGetCareSyncJourneyQueryKey() } });
  const doctorsQuery = useListCareSyncDoctors({ query: { queryKey: getListCareSyncDoctorsQueryKey() } });

  const [selectedEvent, setSelectedEvent] = useState<JourneyEvent | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [explainModalOpen, setExplainModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [savedEncounter, setSavedEncounter] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<{ title: string; amount: number; type: 'APPOINTMENT' | 'PHARMACY' }>({ title: 'Specialist Consultation Fee', amount: 850, type: 'APPOINTMENT' });

  const dashboard = dashboardQuery.data;
  const patient = dashboard?.patient ?? { name: 'Rahul Sharma', patientId: 'CS-2048-7392', initials: 'RS', idStatus: 'VERIFIED' };
  const appointment = dashboard?.nextAppointment ?? fallbackAppointment;
  const journey = Array.isArray(journeyQuery.data) ? journeyQuery.data : fallbackJourney;
  const summary = summaryQuery.data;
  const doctors = Array.isArray(doctorsQuery.data) ? doctorsQuery.data : fallbackDoctors;

  if (dashboardQuery.isLoading) {
    return <AppShell title="CareSync Space" currentRole={role} onRoleChange={onRoleChange}><LoadingState /></AppShell>;
  }

  // Role: DOCTOR WORKSTATION
  if (role === 'DOCTOR') {
    return (
      <AppShell title="Clinical Workstation" eyebrow="Dr. Rahul Mehta · Internal Medicine" currentRole={role} onRoleChange={onRoleChange}>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <section className="soft-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--primary))] text-sm font-bold text-[hsl(var(--primary-foreground))]">
                  RS
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold">Rahul Sharma (32M)</h2>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">CareSync ID: CS-2048-7392 · Blood: O+ · Active Scopes (5)</div>
                </div>
              </div>
              <span className="status-pill status-green"><ShieldCheck size={12} /> Active Consent</span>
            </div>

            {/* AI Intake Summary for Doctor */}
            <div className="mt-4 rounded-xl border border-[hsl(var(--accent)/.2)] bg-[hsl(var(--secondary)/.6)] p-3.5 text-xs">
              <div className="font-bold text-[hsl(var(--primary))] flex items-center gap-1.5">
                <Sparkles size={13} /> AI Clinical Longitudinal Synthesis
              </div>
              <p className="mt-1 text-[hsl(var(--foreground))] leading-relaxed">
                Patient under active cardiometabolic follow-up. Recent laboratory findings reveal pre-diabetic glycemic trend (HbA1c 6.6%, Fasting Glucose 114 mg/dL) and mild dyslipidemia. Currently on Metformin 500mg SR.
              </p>
            </div>

            {/* Biometric Tiles */}
            <StaggerContainer stagger={0.05} className="mt-4 grid grid-cols-3 gap-3 text-xs">
              <StaggerItem>
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                  <div className="font-bold text-[hsl(var(--muted-foreground))]">HbA1c</div>
                  <div className="font-display text-lg font-bold text-amber-700">6.6%</div>
                  <div className="text-[.65rem] text-[hsl(var(--muted-foreground))]">Ref: 4.0 - 5.6%</div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                  <div className="font-bold text-[hsl(var(--muted-foreground))]">Fasting Glucose</div>
                  <div className="font-display text-lg font-bold text-amber-700">114 mg/dL</div>
                  <div className="text-[.65rem] text-[hsl(var(--muted-foreground))]">Ref: 70 - 99 mg/dL</div>
                </div>
              </StaggerItem>
              <StaggerItem>
                <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3">
                  <div className="font-bold text-[hsl(var(--muted-foreground))]">Blood Pressure</div>
                  <div className="font-display text-lg font-bold text-amber-700">136/84</div>
                  <div className="text-[.65rem] text-[hsl(var(--muted-foreground))]">Stage 1 Hypertensive</div>
                </div>
              </StaggerItem>
            </StaggerContainer>

            {/* Clinical Encounter & Prescription Tool */}
            <div className="mt-5 border-t border-[hsl(var(--border))] pt-4">
              <div className="font-bold text-xs">Conduct Clinical Encounter & Prescribe</div>
              <div className="mt-2.5 grid gap-2.5">
                <textarea
                  className="field h-20 text-xs"
                  placeholder="Clinical observations & diagnosis assessment..."
                  defaultValue="Metabolic syndrome & dyslipidemia. Recommend continued Metformin 500mg SR, low sodium diet, and repeat lipid profile in 60 days."
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[.68rem] text-[hsl(var(--muted-foreground))]">Encounter will auto-synthesize into Patient’s Journey</div>
                  <button
                    className={`btn-primary text-xs ${savedEncounter ? 'bg-[hsl(155_48%_28%)]' : ''}`}
                    onClick={() => {
                      setSavedEncounter(true);
                      setTimeout(() => setSavedEncounter(false), 3000);
                    }}
                  >
                    {savedEncounter ? (
                      <span className="flex items-center gap-1"><Check size={13} /> Saved to Care Journey</span>
                    ) : (
                      'Save Clinical Record & Issue Rx'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="soft-card p-6 flex flex-col justify-between">
            <div>
              <div className="eyebrow">Physician Schedule</div>
              <h3 className="font-display mt-1 text-lg font-bold">Today’s Consultations</h3>
              <div className="mt-3.5 space-y-2.5">
                {[
                  ['10:00 AM', 'Rahul Sharma', 'Follow-up · Video', 'Confirmed'],
                  ['11:30 AM', 'Anjali Gupta', 'Initial Consult · In-clinic', 'Confirmed'],
                  ['02:15 PM', 'Vikram Sen', 'Cardiology Referral · Video', 'Confirmed'],
                ].map(([time, name, type, st]) => (
                  <div key={time} className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] p-3 text-xs transition-colors hover:bg-[hsl(var(--secondary)/.5)]">
                    <div>
                      <div className="font-bold">{name}</div>
                      <div className="text-[hsl(var(--muted-foreground))]">{time} · {type}</div>
                    </div>
                    <span className={`status-pill ${st === 'Confirmed' ? 'status-green' : 'status-amber'}`}>{st}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 border-t border-[hsl(var(--border))] pt-4">
              <button className="btn-secondary w-full text-xs justify-center" onClick={() => setShareModalOpen(true)}>
                <Share2 size={13} /> Initiate Specialist Referral
              </button>
            </div>
          </section>
        </div>

        <ShareTransferModal
          isOpen={shareModalOpen}
          doctors={doctors}
          onClose={() => setShareModalOpen(false)}
          onSuccess={() => setShareModalOpen(false)}
        />
      </AppShell>
    );
  }

  // Role: DIAGNOSTIC LAB PORTAL
  if (role === 'LAB_STAFF') {
    return (
      <AppShell title="Diagnostic Laboratory Queue" eyebrow="ABC Diagnostics · Richmond Road Branch" currentRole={role} onRoleChange={onRoleChange}>
        <section className="soft-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-4">
            <div>
              <div className="eyebrow">Investigation Requisitions</div>
              <h2 className="font-display mt-1 text-2xl font-bold">Pending Diagnostic Panels</h2>
            </div>
            <span className="status-pill status-blue">NABL Accredited Facility</span>
          </div>
          <div className="mt-5 space-y-3">
            {[
              { id: 'INV-101', patient: 'Rahul Sharma', test: 'HbA1c & Fasting Lipid Panel', doctor: 'Dr. Rahul Mehta', status: 'SAMPLE_COLLECTED' },
              { id: 'INV-102', patient: 'Suresh Raina', test: 'Thyroid Function Panel (FT3, FT4, TSH)', doctor: 'Dr. Kavya Menon', status: 'ORDERED' },
            ].map((inv) => (
              <div key={inv.id} className="flex flex-col gap-3 rounded-xl border border-[hsl(var(--border))] p-4 sm:flex-row sm:items-center sm:justify-between transition-all duration-200 hover:shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{inv.test}</span>
                    <span className="status-pill status-amber">{inv.status}</span>
                  </div>
                  <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Patient: {inv.patient} · Ordering Doctor: {inv.doctor}</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary text-xs">Mark Sample Collected</button>
                  <button className="btn-primary text-xs" onClick={() => setExplainModalOpen(true)}>Upload Verified Findings</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </AppShell>
    );
  }

  // Role: PHARMACY DISPENSING PORTAL
  if (role === 'PHARMACY_STAFF') {
    return (
      <AppShell title="Pharmacy Fulfillment Queue" eyebrow="XYZ Pharmacy · Indiranagar Branch" currentRole={role} onRoleChange={onRoleChange}>
        <section className="soft-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[hsl(var(--border))] pb-4">
            <div>
              <div className="eyebrow">Active Prescriptions</div>
              <h2 className="font-display mt-1 text-2xl font-bold">Dispensing & Delivery Orders</h2>
            </div>
            <span className="status-pill status-green">Dispensing Hub</span>
          </div>
          <div className="mt-5 space-y-3.5">
            {fallbackOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-[hsl(var(--border))] p-4 transition-all duration-200 hover:shadow-sm">
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <div className="font-display text-lg font-bold">Order #{order.id}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">Patient: Rahul Sharma · 3 Items Prescribed by Dr. Rahul Mehta</div>
                  </div>
                  <StatusTransition status={order.status} variant="amber" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-primary text-xs">Verify Stock</button>
                  <button
                    className="btn-secondary text-xs"
                    onClick={() => {
                      setPaymentDetails({ title: `Pharmacy Dispensing #${order.id}`, amount: Number(order.amount), type: 'PHARMACY' });
                      setPaymentModalOpen(true);
                    }}
                  >
                    Request Sandbox Payment
                  </button>
                  <button className="btn-ghost text-xs">Update Dispatch</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <SandboxPaymentModal
          isOpen={paymentModalOpen}
          itemTitle={paymentDetails.title}
          amount={paymentDetails.amount}
          paymentType={paymentDetails.type}
          onClose={() => setPaymentModalOpen(false)}
          onPaymentSuccess={() => setPaymentModalOpen(false)}
        />
      </AppShell>
    );
  }

  // Role: ADMIN / COMPLIANCE
  if (role === 'ADMIN') {
    return (
      <AppShell title="Governance & Security Audit" eyebrow="CareSync System Integrity & Compliance" currentRole={role} onRoleChange={onRoleChange}>
        <section className="soft-card p-6">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-[hsl(var(--border))] pb-4">
            <div>
              <div className="eyebrow">Immutable Audit Trail</div>
              <h2 className="font-display mt-1 text-2xl font-bold">Security Encounters & Record Access Log</h2>
            </div>
            <span className="status-pill status-green"><ShieldCheck size={13} /> Full Integrity</span>
          </div>
          <div className="mt-4 space-y-2.5 font-mono-care text-xs">
            {[
              ['2026-08-31 19:35:46', 'CONSULTATION_CREATED', 'Dr. Rahul Mehta', 'Rahul Sharma (CS-2048-7392)', 'SUCCESS'],
              ['2026-08-31 19:35:46', 'LAB_REPORT_PUBLISHED', 'ABC Diagnostics', 'Rahul Sharma (CS-2048-7392)', 'SUCCESS'],
              ['2026-08-31 19:35:46', 'PAYMENT_COMPLETED_SANDBOX', 'Rahul Sharma', 'INV-2048-3', 'SUCCESS'],
              ['2026-08-31 19:35:46', 'CONSENT_GRANTED', 'Rahul Sharma', 'Dr. Ananya Sharma', 'SUCCESS'],
            ].map(([time, action, actor, target, res]) => (
              <div key={time + action} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between rounded-xl bg-[hsl(var(--secondary)/.6)] p-3">
                <div>
                  <span className="font-bold text-[hsl(var(--primary))]">{action}</span>
                  <div className="text-[.66rem] text-[hsl(var(--muted-foreground))]">{time} · Actor: {actor} · Target: {target}</div>
                </div>
                <span className={`status-pill ${res === 'SUCCESS' ? 'status-green' : 'status-coral'}`}>{res}</span>
              </div>
            ))}
          </div>
        </section>
      </AppShell>
    );
  }

  // DEFAULT ROLE: PATIENT HERO DASHBOARD
  return (
    <AppShell title={`Good morning, ${patient.name.split(' ')[0]}`} eyebrow="Tuesday · 15 April 2026" currentRole={role} onRoleChange={onRoleChange}>
      {dashboardQuery.isError && <DataNotice onRetry={() => dashboardQuery.refetch()} />}
      
      {/* 1. HERO CARE STAGE & "WHAT'S NEXT?" ACTION */}
      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <FadeIn delay={0.04}>
          <section className="relative overflow-hidden rounded-[20px] bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] md:p-8" data-testid="card-care-status">
            <div className="hero-orb right-[-10%] top-[-25%] h-48 w-48 bg-[hsl(var(--accent)/.24)]" />
            <div className="relative">
              <div className="eyebrow text-[hsl(var(--primary-foreground)/.7)]">Current Care Stage · Step 4 of 6</div>
              <div className="mt-2 font-display text-2xl sm:text-3xl font-normal tracking-[-.03em]" data-testid="text-current-stage">
                {dashboard?.currentStage ?? 'Cardiometabolic Monitoring & Specialist Review'}
              </div>
              <p className="mt-2.5 max-w-[460px] text-xs sm:text-sm leading-6 text-[hsl(var(--primary-foreground)/.78)]">
                Your consultation notes, HbA1c lab report, and Metformin prescription are linked in your continuous care journey.
              </p>
              
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                <Link href="/app/journey" className="btn-secondary group border-0 bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] font-bold no-underline hover:bg-[hsl(174_58%_55%)]" data-testid="link-view-journey">
                  View Full Journey <ArrowUpRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <button
                  onClick={() => setShareModalOpen(true)}
                  className="btn-ghost text-[hsl(var(--primary-foreground))] border border-[hsl(var(--primary-foreground)/.3)] hover:bg-[hsl(var(--primary-foreground)/.1)] text-xs"
                  data-testid="button-transfer-doctor"
                >
                  <Share2 size={13} /> Share with Another Doctor
                </button>
              </div>
            </div>
          </section>
        </FadeIn>

        {/* "WHAT'S NEXT?" HERO ACTION CARD */}
        <FadeIn delay={0.08}>
          <section className="soft-card flex h-full flex-col justify-between p-6 border-l-4 border-l-[hsl(var(--primary))]" data-testid="card-whats-next">
            <div>
              <div className="flex items-center justify-between">
                <div className="eyebrow text-[hsl(var(--primary))] font-bold">What’s Next?</div>
                <span className="status-pill status-amber">Upcoming</span>
              </div>
              <div className="mt-2 font-display text-xl font-bold">Follow-up with {appointment.doctorName}</div>
              <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Scheduled for {appointment.date} at {appointment.time} to evaluate your latest HbA1c results and medication tolerance.
              </p>
            </div>
            
            <div className="mt-5 border-t border-[hsl(var(--border))] pt-3.5 flex items-center justify-between">
              <div>
                <div className="text-[.65rem] text-[hsl(var(--muted-foreground))]">Consultation Format</div>
                <div className="font-bold text-xs flex items-center gap-1"><Video size={13} /> {appointment.mode}</div>
              </div>
              <button
                className="btn-primary text-xs"
                onClick={() => {
                  setPaymentDetails({ title: `Appointment with ${appointment.doctorName}`, amount: 850, type: 'APPOINTMENT' });
                  setPaymentModalOpen(true);
                }}
              >
                Review & Pay
              </button>
            </div>
          </section>
        </FadeIn>
      </div>

      {/* 2. STATS & CLINICAL METRIC TILES */}
      <StaggerContainer stagger={0.05} className="metric-grid mt-5 grid grid-cols-4 gap-3">
        {[
          [TestTube2, dashboard?.pendingTests ?? 1, 'Pending tests', '/app/journey', 'text-pending-tests'],
          [Pill, dashboard?.activeMedications ?? 2, 'Active medicines', '/app/orders', 'text-active-medications'],
          [Bell, dashboard?.unreadNotifications ?? 3, 'Unread updates', '/app/journey', 'text-unread-notifications'],
          [ShieldCheck, patient.idStatus === 'VERIFIED' ? 'Active' : 'Review', 'Privacy controls', '/app/consent', 'text-privacy-status'],
        ].map(([Icon, value, label, href, testId]) => {
          const IconComponent = Icon as typeof Pill;
          return (
            <StaggerItem key={label as string}>
              <Link href={href as string} className="metric-tile group hover-elevate block no-underline" data-testid={`link-metric-${(label as string).toLowerCase().replaceAll(' ', '-')}`}>
                <div className="flex items-center justify-between">
                  <IconComponent size={16} className="text-[hsl(var(--primary))]" />
                  <ArrowUpRight size={13} className="text-[hsl(var(--muted-foreground))] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div className="mt-3 font-display text-2xl sm:text-3xl font-bold" data-testid={testId as string}>{value as string | number}</div>
                <div className="mt-1 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{label as string}</div>
              </Link>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* 3. HERO RECENT JOURNEY & AI SUMMARY */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <section className="soft-card p-6" data-testid="card-recent-journey">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3.5">
            <div>
              <div className="eyebrow">Recent Care Journey</div>
              <h2 className="font-display mt-1 text-xl font-bold">Nothing gets lost between steps.</h2>
            </div>
            <Link href="/app/journey" className="btn-ghost group text-xs" data-testid="link-see-all-journey">
              Complete timeline <ChevronRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="relative mt-5 space-y-1">
            {journey.slice(0, 3).map((event, idx) => (
              <div key={event.id} onClick={() => setSelectedEvent(event)} className="cursor-pointer">
                <JourneyRow event={event} index={idx} compact isLast={idx === 2} />
              </div>
            ))}
          </div>
        </section>

        {/* AI SUMMARY CARD */}
        <section className="soft-card relative overflow-hidden p-6" data-testid="card-ai-summary">
          <div className="absolute right-5 top-5 text-[hsl(var(--accent))]"><Sparkles size={18} /></div>
          <div className="flex items-center gap-2">
            <span className="eyebrow text-[hsl(var(--accent-foreground))]">CareSync AI Assistive Summary</span>
            <span className="rounded-full bg-[hsl(var(--accent)/.12)] px-2 py-0.5 text-[.6rem] font-bold text-[hsl(var(--accent))]">Non-Diagnostic</span>
          </div>

          {summaryQuery.isLoading ? (
            <div className="mt-4">
              <AIAnalyzingPulse label="Connecting consultation & laboratory findings..." />
            </div>
          ) : (
            <FadeIn delay={0.08}>
              <h2 className="font-display mt-2.5 text-xl font-bold" data-testid="text-ai-headline">
                {summary?.headline ?? 'Your care is moving in the right direction.'}
              </h2>
              <p className="mt-2 text-xs sm:text-sm leading-6 text-[hsl(var(--muted-foreground))]" data-testid="text-ai-body">
                {summary?.body ?? 'Your recent consultation is connected to your latest results. Keep your next appointment close so your doctor can pick up from here.'}
              </p>

              <div className="mt-4 rounded-xl bg-[hsl(var(--secondary)/.65)] p-3 text-xs font-semibold text-[hsl(var(--secondary-foreground))] flex items-center justify-between" data-testid="text-ai-next-step">
                <div>
                  <span className="text-[hsl(var(--primary))] font-bold">Next Action · </span>
                  {summary?.nextStep ?? 'Review your upcoming appointment details.'}
                </div>
                <button
                  onClick={() => setExplainModalOpen(true)}
                  className="btn-ghost text-xs text-[hsl(var(--primary))] hover:underline px-1 py-0.5"
                >
                  Explain Report <Sparkles size={12} />
                </button>
              </div>

              <div className="mt-3.5 flex items-center justify-between text-[.66rem] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))] pt-3">
                <span>{summary?.disclaimer ?? 'Assistive informational summary. Always verify against original records.'}</span>
                <button
                  onClick={() => setSelectedEvent(journey[1] || journey[0])}
                  className="font-bold text-[hsl(var(--primary))] hover:underline shrink-0"
                >
                  View Records
                </button>
              </div>
            </FadeIn>
          )}
        </section>
      </div>

      {/* INTERACTIVE MODALS */}
      <JourneyDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onExplainReport={() => {
          setSelectedEvent(null);
          setExplainModalOpen(true);
        }}
      />

      <ShareTransferModal
        isOpen={shareModalOpen}
        doctors={doctors}
        onClose={() => setShareModalOpen(false)}
        onSuccess={() => setShareModalOpen(false)}
      />

      <ExplainReportModal
        isOpen={explainModalOpen}
        testName="HbA1c & Fasting Lipid Profile"
        summary="Biological findings verified per NABL standard reference intervals."
        onClose={() => setExplainModalOpen(false)}
      />

      <SandboxPaymentModal
        isOpen={paymentModalOpen}
        itemTitle={paymentDetails.title}
        amount={paymentDetails.amount}
        paymentType={paymentDetails.type}
        onClose={() => setPaymentModalOpen(false)}
        onPaymentSuccess={() => setPaymentModalOpen(false)}
      />
    </AppShell>
  );
}

function JourneyRow({ event, index = 0, compact = false, isLast = false }: { event: JourneyEvent; index?: number; compact?: boolean; isLast?: boolean }) {
  const color = event.accent === 'coral' ? 'hsl(var(--accent))' : event.accent === 'gold' ? 'hsl(38 75% 50%)' : event.accent === 'blue' ? 'hsl(198 75% 45%)' : 'hsl(var(--primary))';
  const Icon = event.type === 'test' ? FlaskConical : event.type === 'medication' ? Pill : event.type === 'report' ? FileText : event.type === 'appointment' ? CalendarDays : Stethoscope;

  const statusVariant = event.status.toLowerCase() === 'completed'
    ? 'green'
    : event.status.toLowerCase() === 'upcoming'
    ? 'amber'
    : 'slate';

  return (
    <div className={`group relative flex gap-3.5 transition-transform duration-150 hover:translate-x-1 ${compact ? 'pb-4' : 'pb-8'}`} data-testid={`row-journey-event-${event.id}`}>
      {!isLast && <TimelineConnector index={index} />}
      <div className="relative shrink-0">
        <TimelineNode index={index} accentColor={color} icon={<Icon size={13} color="white" />} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-display text-base sm:text-lg font-bold leading-tight group-hover:text-[hsl(var(--primary))] transition-colors">{event.title}</div>
            <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{event.provider} · {event.organization}</div>
          </div>
          <StatusTransition status={event.status} variant={statusVariant} />
        </div>
        {!compact && (
          <FadeIn delay={index * 0.04 + 0.08}>
            <div className="mt-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{event.date}</div>
            <p className="mt-1.5 max-w-[680px] text-xs sm:text-sm leading-6 text-[hsl(var(--muted-foreground))]">{event.description}</p>
          </FadeIn>
        )}
      </div>
    </div>
  );
}

function JourneyPage({ role, onRoleChange }: { role: UserRole; onRoleChange: (r: UserRole) => void }) {
  const query = useGetCareSyncJourney({ query: { queryKey: getGetCareSyncJourneyQueryKey() } });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<JourneyEvent | null>(null);
  const [explainModalOpen, setExplainModalOpen] = useState(false);

  const journey = Array.isArray(query.data) ? query.data : fallbackJourney;
  const filtered = useMemo(() => journey.filter((event) => (filter === 'all' || event.type === filter) && `${event.title} ${event.provider} ${event.organization}`.toLowerCase().includes(search.toLowerCase())), [journey, filter, search]);
  const filters = ['all', 'consultation', 'test', 'report', 'medication', 'appointment'];

  return (
    <AppShell title="Your Care Journey" eyebrow="Everything connected, in chronological order" currentRole={role} onRoleChange={onRoleChange}>
      {query.isError && <DataNotice onRetry={() => query.refetch()} />}
      
      {/* ALIGNED FILTER BAR AND SEARCH */}
      <div className="soft-card mb-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <div className="tab-bar">
            {filters.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`tab-pill capitalize ${filter === item ? 'tab-pill-active' : ''}`}
                data-testid={`button-filter-${item}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="relative shrink-0">
          <Search size={14} className="absolute left-3 top-2.5 text-[hsl(var(--muted-foreground))]" />
          <input
            className="field w-full pl-8 sm:w-56 text-xs h-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your journey"
            data-testid="input-search-journey"
          />
        </div>
      </div>

      {query.isLoading ? (
        <LoadingState label="Placing each part of your care in order" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No matching moments" body="Try another search or clear the filter to see your complete journey." />
      ) : (
        <TabContent tabKey={filter + search}>
          <section className="soft-card p-6 md:p-8" data-testid="list-journey-events">
            <div className="mb-6 flex items-center justify-between border-b border-[hsl(var(--border))] pb-3.5">
              <div>
                <div className="eyebrow">A continuous clinical record</div>
                <h2 className="font-display mt-1 text-xl font-bold">{filtered.length} moments in your care story</h2>
              </div>
              {search && (
                <button className="btn-ghost text-xs" onClick={() => setSearch('')} data-testid="button-clear-journey-search">
                  Clear search
                </button>
              )}
            </div>
            <div className="relative pl-0 md:pl-1">
              {filtered.map((event, idx) => (
                <div key={event.id} onClick={() => setSelectedEvent(event)} className="cursor-pointer">
                  <JourneyRow event={event} index={idx} isLast={idx === filtered.length - 1} />
                </div>
              ))}
            </div>
          </section>
        </TabContent>
      )}

      <JourneyDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onExplainReport={() => {
          setSelectedEvent(null);
          setExplainModalOpen(true);
        }}
      />

      <ExplainReportModal
        isOpen={explainModalOpen}
        testName="HbA1c & Fasting Lipid Profile"
        summary="Biological reference parameters per NABL calibration."
        onClose={() => setExplainModalOpen(false)}
      />
    </AppShell>
  );
}

function DoctorsPage({ role, onRoleChange }: { role: UserRole; onRoleChange: (r: UserRole) => void }) {
  const query = useListCareSyncDoctors({ query: { queryKey: getListCareSyncDoctorsQueryKey() } });
  const appointmentMutation = useCreateCareSyncAppointment();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('all');
  const [selected, setSelected] = useState<Doctor | null>(null);
  const [form, setForm] = useState({ date: '2026-09-18', time: '10:30 AM', mode: 'Video consultation' });
  const [booked, setBooked] = useState(false);
  const doctors = Array.isArray(query.data) ? query.data : fallbackDoctors;
  const specializations = Array.from(new Set(doctors.map((doctor) => doctor.specialization)));
  const filtered = doctors.filter((doctor) => (specialization === 'all' || doctor.specialization === specialization) && `${doctor.name} ${doctor.specialization} ${doctor.organization}`.toLowerCase().includes(search.toLowerCase()));

  const book = () => {
    if (!selected) return;
    appointmentMutation.mutate({ data: { doctorId: selected.id, date: form.date, time: form.time, mode: form.mode } }, {
      onSuccess: () => {
        setBooked(true);
        qc.invalidateQueries({ queryKey: getListCareSyncAppointmentsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetCareSyncDashboardQueryKey() });
      },
    });
  };

  return (
    <AppShell title="Find Your Care Team" eyebrow="Verified doctors, considered clinical choices" currentRole={role} onRoleChange={onRoleChange}>
      {query.isError && <DataNotice onRetry={() => query.refetch()} />}
      <div className="soft-card mb-6 grid gap-3 p-3 sm:grid-cols-[1.5fr_1fr]">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-2.5 text-[hsl(var(--muted-foreground))]" />
          <input className="field pl-9 text-xs h-9" placeholder="Search by name or specialty" value={search} onChange={(event) => setSearch(event.target.value)} data-testid="input-search-doctors" />
        </div>
        <select className="field text-xs h-9" value={specialization} onChange={(event) => setSpecialization(event.target.value)} data-testid="select-doctor-specialization">
          <option value="all">All specialties</option>
          {specializations.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {query.isLoading ? (
        <LoadingState label="Finding clinicians in your care network" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No doctors found" body="Try a different name or specialty. Your care team is still here when you need them." />
      ) : (
        <StaggerContainer stagger={0.06} className="grid gap-4 lg:grid-cols-2" data-testid="list-doctors">
          {filtered.map((doctor) => (
            <StaggerItem key={doctor.id}>
              <DoctorCard doctor={doctor} onBook={() => { setSelected(doctor); setBooked(false); }} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      <ModalTransition isOpen={Boolean(selected)} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div className="flex items-start justify-between border-b border-[hsl(var(--border))] pb-3.5">
              <div>
                <div className="eyebrow">Book a Consultation</div>
                <h2 id="book-title" className="font-display mt-1 text-2xl font-bold">{selected.name}</h2>
                <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{selected.specialization} · {selected.organization}</p>
              </div>
              <button className="btn-ghost" onClick={() => setSelected(null)} data-testid="button-close-booking"><X size={16} /></button>
            </div>
            {booked ? (
              <div className="my-6 rounded-xl bg-[hsl(155_40%_92%)] p-6 text-center text-[hsl(155_43%_26%)]" data-testid="state-booking-success">
                <SuccessAnimation size={44} title="You’re booked in." subtitle="Your appointment request is now confirmed in your care journey." />
                <button className="btn-primary mt-5" onClick={() => setSelected(null)} data-testid="button-finish-booking">Done</button>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Preferred Date</label>
                    <input className="field text-xs" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} data-testid="input-appointment-date" />
                  </div>
                  <div>
                    <label className="field-label">Preferred Slot</label>
                    <select className="field text-xs" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} data-testid="select-appointment-time">
                      {['09:30 AM', '10:30 AM', '02:00 PM', '04:30 PM'].map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="field-label">Consultation Format</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {['Video consultation', 'In-clinic visit'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setForm({ ...form, mode: item })}
                        className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${form.mode === item ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]'}`}
                        data-testid={`button-mode-${item.toLowerCase().replaceAll(' ', '-')}`}
                      >
                        {item === 'Video consultation' ? <Video size={13} /> : <Building2 size={13} />} {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-[hsl(var(--secondary)/.6)] p-3 text-xs text-[hsl(var(--muted-foreground))]">
                  Appointment fee of ₹{selected.fee} includes pre-consultation record synthesis and follow-up notes.
                </div>
                <button className="btn-primary w-full justify-center text-xs h-10" disabled={appointmentMutation.isPending} onClick={book} data-testid="button-confirm-booking">
                  {appointmentMutation.isPending ? 'Confirming with care network...' : `Confirm appointment (₹${selected.fee})`}
                </button>
              </div>
            )}
          </>
        )}
      </ModalTransition>
    </AppShell>
  );
}

function DoctorCard({ doctor, onBook }: { doctor: Doctor; onBook: () => void }) {
  return (
    <article className="soft-card p-5" data-testid={`card-doctor-${doctor.id}`}>
      <div className="flex items-start gap-3.5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] font-display text-base font-bold text-[hsl(var(--primary))]">
          {doctor.initials ?? doctor.name.split(' ').map((item) => item[0]).join('').slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-bold">{doctor.name}</h2>
            {doctor.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--primary)/.12)] px-2 py-0.5 text-[.68rem] font-semibold text-[hsl(var(--primary))]">
                <CheckCircle2 size={11} /> Verified
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs font-semibold text-[hsl(var(--primary))]">{doctor.specialization}</p>
          <div className="mt-3 grid gap-1 text-xs text-[hsl(var(--muted-foreground))] sm:grid-cols-2">
            <span className="flex items-center gap-1.5"><Building2 size={13} />{doctor.organization}</span>
            <span className="flex items-center gap-1.5"><MapPin size={13} />{doctor.location}</span>
            <span className="flex items-center gap-1.5"><Clock3 size={13} />{doctor.experience}</span>
            <span className="flex items-center gap-1.5 text-[hsl(var(--accent-foreground))]"><Star size={13} fill="currentColor" />{doctor.rating} rating</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-[hsl(var(--border))] pt-3.5">
        <div>
          <div className="text-[.64rem] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Next available</div>
          <div className="mt-0.5 text-xs font-bold text-[hsl(var(--primary))]">{doctor.nextSlot}</div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold">₹{doctor.fee}</span>
          <button className="btn-primary text-xs" onClick={onBook} data-testid={`button-book-doctor-${doctor.id}`}>
            Book <CalendarDays size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

function ConsentPage({ role, onRoleChange }: { role: UserRole; onRoleChange: (r: UserRole) => void }) {
  const query = useListAccessRequests();
  const mutation = useDecideAccessRequest();
  const qc = useQueryClient();
  const requests = Array.isArray(query.data) ? query.data : [];

  const decide = (id: number, decision: 'ALLOW' | 'DENY') => {
    mutation.mutate({ id, data: { decision } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListAccessRequestsQueryKey() }),
    });
  };

  return (
    <AppShell title="Consent & Access Governance" eyebrow="Patient-Controlled Medical Records Authorization" currentRole={role} onRoleChange={onRoleChange}>
      {query.isError && <DataNotice onRetry={() => query.refetch()} />}
      <div className="mb-6 grid gap-4 md:grid-cols-[1.15fr_.85fr]">
        <FadeIn delay={0.05}>
          <div className="rounded-2xl bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))]">
            <div className="eyebrow text-[hsl(var(--primary-foreground)/.7)]">Your Privacy, Made Legible</div>
            <h2 className="font-display mt-2 text-2xl font-normal">No clinician gets the whole story by default.</h2>
            <p className="mt-2 text-xs leading-5 text-[hsl(var(--primary-foreground)/.78)]">
              Review every physician request, inspect the clinical purpose, and choose granular data scopes that move with your care handoff.
            </p>
          </div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div className="soft-card h-full p-6">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><LockKeyhole size={18} /></div>
              <div>
                <div className="font-display text-lg font-bold">Always Private</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Scoped access controls are active</div>
              </div>
            </div>
            <div className="mt-4 progress-track"><div className="progress-fill w-full bg-[hsl(var(--primary))]" /></div>
            <div className="mt-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">CareSync Zero-Assumption Security Policy</div>
          </div>
        </FadeIn>
      </div>

      {query.isLoading ? (
        <LoadingState label="Checking for new access requests" />
      ) : requests.length === 0 ? (
        <EmptyState title="No requests waiting" body="When a doctor or care partner asks to see part of your record, you’ll find the request here." />
      ) : (
        <StaggerContainer stagger={0.07} className="grid gap-4" data-testid="list-access-requests">
          {requests.map((request) => (
            <StaggerItem key={request.id}>
              <AccessCard request={request} onDecide={decide} pending={mutation.isPending} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </AppShell>
  );
}

function AccessCard({ request, onDecide, pending }: { request: AccessRequest; onDecide: (id: number, decision: 'ALLOW' | 'DENY') => void; pending: boolean }) {
  const statusLower = request.status.toLowerCase();
  const resolved = statusLower !== 'pending' && statusLower !== 'requested';
  const statusVariant = resolved ? (statusLower === 'allowed' ? 'green' : 'coral') : 'amber';

  return (
    <article className="soft-card p-5" data-testid={`card-access-request-${request.id}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] font-display text-base font-bold text-[hsl(var(--primary))]">
            {request.doctorName.split(' ').filter((part) => part !== 'Dr.').map((part) => part[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-bold">{request.doctorName}</h2>
              <StatusTransition status={request.status} variant={statusVariant} />
            </div>
            <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{request.specialization} · {request.organization}</div>
            <p className="mt-3 max-w-[620px] text-xs leading-5 text-[hsl(var(--muted-foreground))]">
              <span className="font-bold text-[hsl(var(--foreground))]">Clinical Purpose: </span>{request.purpose}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {request.dataScopes.map((scope) => (
                <span key={scope} className="rounded-full bg-[hsl(var(--secondary))] px-2.5 py-1 text-[.68rem] font-semibold text-[hsl(var(--secondary-foreground))]">{scope}</span>
              ))}
            </div>
          </div>
        </div>
        {!resolved && (
          <div className="flex shrink-0 gap-2 md:flex-col">
            <button className="btn-primary text-xs" disabled={pending} onClick={() => onDecide(request.id, 'ALLOW')} data-testid={`button-allow-access-${request.id}`}>
              <Check size={13} /> Allow Access
            </button>
            <button className="btn-secondary text-xs" disabled={pending} onClick={() => onDecide(request.id, 'DENY')} data-testid={`button-deny-access-${request.id}`}>
              <XCircle size={13} /> Deny
            </button>
          </div>
        )}
      </div>
      <div className="mt-4 border-t border-[hsl(var(--border))] pt-2.5 text-[.65rem] text-[hsl(var(--muted-foreground))]">
        Requested {request.requestedAt} · You can revoke access at any time
      </div>
    </article>
  );
}

function OrdersPage({ role, onRoleChange }: { role: UserRole; onRoleChange: (r: UserRole) => void }) {
  const query = useListPharmacyOrders({ query: { queryKey: getListPharmacyOrdersQueryKey() } });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PharmacyOrder | null>(null);
  const orders = Array.isArray(query.data) ? query.data : fallbackOrders;

  return (
    <AppShell title="Pharmacy Orders & Delivery" eyebrow="Connected Prescription Fulfillment" currentRole={role} onRoleChange={onRoleChange}>
      {query.isError && <DataNotice onRetry={() => query.refetch()} />}
      {query.isLoading ? (
        <LoadingState label="Checking on your pharmacy deliveries" />
      ) : orders.length === 0 ? (
        <EmptyState title="No pharmacy orders yet" body="When a prescription is ready to be filled, your connected orders will appear here." />
      ) : (
        <StaggerContainer stagger={0.08} className="grid gap-4" data-testid="list-pharmacy-orders">
          {orders.map((order) => (
            <StaggerItem key={order.id}>
              <OrderCard
                order={order}
                onPay={() => {
                  setSelectedOrder(order);
                  setPaymentModalOpen(true);
                }}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.42)] p-4 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" />
        <span>Orders shown here are connected to your CareSync journey. CareSync does not dispense medicines or replace advice from your licensed pharmacist.</span>
      </div>

      {selectedOrder && (
        <SandboxPaymentModal
          isOpen={paymentModalOpen}
          itemTitle={`Pharmacy Order #${selectedOrder.id}`}
          amount={Number(selectedOrder.amount)}
          paymentType="PHARMACY"
          onClose={() => {
            setPaymentModalOpen(false);
            setSelectedOrder(null);
          }}
          onPaymentSuccess={() => {
            setPaymentModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </AppShell>
  );
}

function OrderCard({ order, onPay }: { order: PharmacyOrder; onPay?: () => void }) {
  const status = order.status.toLowerCase().replaceAll('_', ' ');
  const delivered = status.includes('delivered');
  const outForDelivery = status.includes('out') || status.includes('delivery') || status.includes('dispatched');
  const preparing = status.includes('preparing') || status.includes('packed');

  const pharmacySteps = [
    { label: 'Placed' },
    { label: 'Review' },
    { label: 'Packed' },
    { label: 'On way' },
    { label: 'Delivered' },
  ];

  const currentStep = delivered ? 4 : outForDelivery ? 3 : preparing ? 2 : 1;

  return (
    <article className="soft-card p-5 transition-all duration-200 hover:shadow-sm" data-testid={`card-pharmacy-order-${order.id}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3.5">
          <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${delivered ? 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]' : 'bg-[hsl(var(--accent)/.14)] text-[hsl(var(--accent-foreground))]'}`}>
            <ShoppingBag size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-bold">{order.pharmacy}</h2>
              <StatusTransition status={status} variant={delivered ? 'green' : 'amber'} />
            </div>
            <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">Order #{order.id} · {order.itemCount} items</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 text-left sm:text-right">
          <div>
            <div className="text-[.64rem] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Total</div>
            <div className="mt-0.5 font-display text-xl font-bold">₹{order.amount.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[.64rem] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Latest update</div>
            <div className="mt-0.5 text-xs font-semibold">{order.updatedAt}</div>
          </div>
        </div>
      </div>
      {!delivered && (
        <div className="mt-5 border-t border-[hsl(var(--border))] pt-4">
          <ProgressIndicator steps={pharmacySteps} currentStepIndex={currentStep} />
          <div className="mt-3.5 flex justify-end">
            <button className="btn-primary text-xs py-1.5 px-3" onClick={onPay}>
              Review Bill & Pay (Sandbox)
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function ProfilePage({ role, onRoleChange }: { role: UserRole; onRoleChange: (r: UserRole) => void }) {
  const dashboardQuery = useGetCareSyncDashboard();
  const patient = dashboardQuery.data?.patient ?? { name: 'Rahul Sharma', patientId: 'CS-2048-7392', initials: 'RS', idStatus: 'VERIFIED' };
  const [name, setName] = useState(patient.name);
  const [email, setEmail] = useState('rahul.sharma@example.com');
  const [notifications, setNotifications] = useState(true);
  const [caregiver, setCaregiver] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <AppShell title="My Care Profile" eyebrow="Identity & Caregiver Delegation" currentRole={role} onRoleChange={onRoleChange}>
      {dashboardQuery.isError && <DataNotice onRetry={() => dashboardQuery.refetch()} />}
      <div className="grid gap-5 lg:grid-cols-[.78fr_1.22fr]">
        <FadeIn delay={0.05}>
          <section className="soft-card h-full p-6" data-testid="card-profile-identity">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--primary))] font-display text-2xl font-bold text-[hsl(var(--primary-foreground))]" data-testid="avatar-profile">{patient.initials}</div>
            <h2 className="font-display mt-4 text-2xl font-bold" data-testid="text-profile-name">{patient.name}</h2>
            <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">CareSync ID · {patient.patientId}</div>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-[hsl(155_40%_92%)] px-3 py-2 text-xs font-bold text-[hsl(155_43%_28%)]">
              <ShieldCheck size={14} /> Identity verified for this prototype
            </div>
            <div className="mt-6 border-t border-[hsl(var(--border))] pt-4">
              <div className="eyebrow">Your data, your say</div>
              <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">CareSync only shares information when you explicitly choose to. Visit Consent & access to review requests.</p>
              <Link href="/app/consent" className="btn-ghost mt-2 px-0 text-xs text-[hsl(var(--primary))]" data-testid="link-profile-consent">Review consent settings <ChevronRight size={13} /></Link>
            </div>
          </section>
        </FadeIn>
        <div className="grid gap-5">
          <FadeIn delay={0.1}>
            <section className="soft-card p-6" data-testid="card-personal-details">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] pb-3">
                <div>
                  <div className="eyebrow">Personal details</div>
                  <h2 className="font-display mt-1 text-xl font-bold">How your care team knows you</h2>
                </div>
                <UserRound size={18} className="text-[hsl(var(--primary))]" />
              </div>
              <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="profile-name">Full name</label>
                  <input id="profile-name" className="field text-xs" value={name} onChange={(event) => { setName(event.target.value); setSaved(false); }} data-testid="input-profile-name" />
                </div>
                <div>
                  <label className="field-label" htmlFor="profile-email">Email for updates</label>
                  <input id="profile-email" className="field text-xs" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSaved(false); }} data-testid="input-profile-email" />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-3.5">
                <span className={`text-xs font-semibold ${saved ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid="text-profile-save-status">
                  {saved ? 'Saved in this prototype' : 'Changes are private to this demo'}
                </span>
                <button
                  className="btn-primary text-xs"
                  onClick={() => {
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2500);
                  }}
                  data-testid="button-save-profile"
                >
                  {saved ? 'Saved ✓' : 'Save details'}
                </button>
              </div>
            </section>
          </FadeIn>
          <FadeIn delay={0.15}>
            <section className="soft-card p-6" data-testid="card-privacy-settings">
              <div className="eyebrow">Quiet controls</div>
              <h2 className="font-display mt-1 text-xl font-bold">Privacy & notifications</h2>
              <div className="mt-4 divide-y divide-[hsl(var(--border))]">
                {[
                  [Bell, 'Care updates', 'Get a gentle reminder when something in your journey needs attention.', notifications, setNotifications],
                  [UserRound, 'Caregiver view', 'Allow a trusted family caregiver to see the parts of your care you choose.', caregiver, setCaregiver],
                ].map(([Icon, title, body, enabled, setEnabled]) => {
                  const IconComponent = Icon as typeof Bell;
                  const setter = setEnabled as (value: boolean) => void;
                  return (
                    <div className="flex items-center gap-3.5 py-3.5" key={title as string}>
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><IconComponent size={16} /></div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold">{title as string}</div>
                        <div className="mt-0.5 text-[.68rem] leading-4 text-[hsl(var(--muted-foreground))]">{body as string}</div>
                      </div>
                      <button className={`switch-track ${enabled ? 'switch-on' : ''}`} onClick={() => setter(!(enabled as boolean))} aria-label={`Toggle ${title}`} data-testid={`button-toggle-${(title as string).toLowerCase().replaceAll(' ', '-')}`}>
                        <div className="switch-thumb" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </FadeIn>
        </div>
      </div>
    </AppShell>
  );
}

function AppRouter() {
  const [currentRole, setCurrentRole] = useState<UserRole>('PATIENT');

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/app">
        <DashboardPage role={currentRole} onRoleChange={setCurrentRole} />
      </Route>
      <Route path="/app/journey">
        <JourneyPage role={currentRole} onRoleChange={setCurrentRole} />
      </Route>
      <Route path="/app/doctors">
        <DoctorsPage role={currentRole} onRoleChange={setCurrentRole} />
      </Route>
      <Route path="/app/consent">
        <ConsentPage role={currentRole} onRoleChange={setCurrentRole} />
      </Route>
      <Route path="/app/orders">
        <OrdersPage role={currentRole} onRoleChange={setCurrentRole} />
      </Route>
      <Route path="/app/profile">
        <ProfilePage role={currentRole} onRoleChange={setCurrentRole} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <RoutedErrorBoundary>
            <AppRouter />
          </RoutedErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;