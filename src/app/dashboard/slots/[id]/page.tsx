"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { DashboardShell } from "@/app/components/dashboard-shell";
import { BreadcrumbOverflow } from "@/app/components/ui/breadcrumb-overflow";
import { StatusChip } from "@/components/dashboard/status-chip";
import { OrderSummaryDrawer } from "@/components/dashboard/order-summary-drawer";
import { slots as mockSlots } from "@/components/dashboard/dashboard-data";
import { ReceiptModal } from "@/components/receipt";
import { RedeemTokenModal } from "@/components/dashboard/redeem-token-modal";
import type { ReceiptData } from "@/components/receipt";
import { PromoCodeEntry } from "@/app/components/ui/promo-code-entry";
import { GiftPurchaseToggle } from "@/components/dashboard/gift-purchase-toggle";
import type { GiftDetails } from "@/components/dashboard/gift-purchase-toggle";
import { BookingAbandonmentBanner } from "@/components/dashboard/booking-abandonment-banner";
import { DisputeFilingForm, type DisputeFormData } from "@/app/components/dispute-filing-form";
import { DisputeTrackingPanel, type Dispute } from "@/app/components/dispute-tracking-panel";
import {
  ArrowLeft,
  Wallet,
  AlertCircle,
  Calendar,
  Clock,
  ShieldCheck,
  Info,
  ExternalLink,
  Loader2,
  Sparkles,
  Check,
  Receipt,
  Users,
  LayoutDashboard,
  Scale,
  X
} from "lucide-react";

function FocusTrap({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Robust metadata/details mapper for slots
const slotDetailsMap: Record<
  string,
  {
    durationHours: number;
    description: string;
    seller: {
      id: string;
      name: string;
      role: string;
      avatarInitials: string;
      avatarGradient: string;
      bio: string;
      stats: { label: string; value: string }[];
    };
  }
> = {
  "slot-1": {
    durationHours: 1.5,
    description:
      "Deep dive into your product roadmap, tech stack architecture, and launch strategy. We will review your current product design, identify potential technical bottlenecks on the Stellar network integration, and map out a concrete step-by-step roadmap for your engineering team.",
    seller: {
      id: "sarah-jenkins",
      name: "Dr. Sarah Jenkins",
      role: "Lead Product Architect",
      avatarInitials: "SJ",
      avatarGradient: "from-cyan-500 to-blue-600",
      bio: "Former MIT researcher and Stellar Core contributor with 10+ years of experience designing high-scale decentralized architectures.",
      stats: [
        { label: "Tokenized Hours", value: "142h" },
        { label: "Completion Rate", value: "99.4%" },
        { label: "Rating", value: "4.9/5" },
      ],
    },
  },
  "slot-2": {
    durationHours: 1.0,
    description:
      "A comprehensive heuristic evaluation of your web or mobile application interface. We will analyze your layout, user onboarding flow, and transactional friction points to improve conversion and ensure alignment with modern web design guidelines.",
    seller: {
      id: "marcus-vance",
      name: "Marcus Vance",
      role: "Principal UX Designer",
      avatarInitials: "MV",
      avatarGradient: "from-purple-500 to-indigo-600",
      bio: "Award-winning designer passionate about building human-centered financial products. Previously at Stripe and Stellar Development Foundation.",
      stats: [
        { label: "Tokenized Hours", value: "85h" },
        { label: "Completion Rate", value: "100%" },
        { label: "Rating", value: "5.0/5" },
      ],
    },
  },
  "slot-3": {
    durationHours: 1.0,
    description:
      "Open office hours for early-stage web3 founders. Bring your hardest questions about fundraising, go-to-market strategies, community building, and structuring secure, compliant token economies.",
    seller: {
      id: "elena-rostova",
      name: "Elena Rostova",
      role: "Managing Partner, Zenith Capital",
      avatarInitials: "ER",
      avatarGradient: "from-amber-500 to-rose-600",
      bio: "Venture capitalist and ecosystem growth advisor. Helps web3 startups bootstrap from inception to series A and scale their protocols.",
      stats: [
        { label: "Tokenized Hours", value: "210h" },
        { label: "Completion Rate", value: "98.7%" },
        { label: "Rating", value: "4.8/5" },
      ],
    },
  },
};

/** Demo dispute so the tracking view has something to render. */
const DEMO_EPOCH = Date.now();

function buildExistingDisputes(slotId: string): Dispute[] {
  return [
  {
    id: "disp-12345678",
    slotId,
    category: "quality_mismatch",
    reason: "Service quality did not match expectations",
    description: "The delivered consultation was significantly shorter than the agreed 1.5 hours and lacked the depth of technical analysis promised in the description.",
    status: "under_review",
    evidence: [
      {
        id: "ev-1",
        fileName: "chat_transcript.pdf",
        fileSize: 245000,
        fileType: "application/pdf",
        uploadStatus: "completed",
        scanStatus: "clean",
        uploadedAt: new Date(DEMO_EPOCH).toISOString()
      }
    ],
    createdAt: new Date(DEMO_EPOCH - 86400000).toISOString(),
    updatedAt: new Date(DEMO_EPOCH - 3600000).toISOString(),
    submittedAt: new Date(DEMO_EPOCH - 86400000).toISOString(),
    notes: [
      {
        id: "note-1",
        author: "System",
        authorRole: "system",
        content: "Dispute submitted successfully. Awaiting initial review.",
        createdAt: new Date(DEMO_EPOCH - 86400000).toISOString()
      }
    ],
    metadata: {
      priority: "medium",
      escalationCount: 0,
      lastActivityAt: new Date(DEMO_EPOCH - 3600000).toISOString()
    }
  }
  ];
}

/** Deterministic demo redemption code for a slot. */
function demoTokenCode(slotId: string): string {
  const seed = Array.from(slotId).reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 9000,
    7,
  );
  return `CHR-${slotId.toUpperCase()}-${1000 + seed}`;
}

export default function SlotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  // Find the current slot, fallback to slot-1 if invalid
  const slot = mockSlots.find((s) => s.id === id) || mockSlots[0];
  const details = slotDetailsMap[slot.id] || slotDetailsMap["slot-1"];

  // SIMULATOR STATES for thorough testing of edge cases
  const [simWallet, setSimWallet] = useState<"connected" | "disconnected" | "error">("connected");
  const [simBalance, setSimBalance] = useState<"sufficient" | "insufficient">("sufficient");
  
  // Wallet Address simulation
  const mockAddress = "GCDQ7M3F6JH2K4N8Q5RLP9TZB3YH4W8F1S7N6U0X2A5V8E1C";
  const displayAddress = `${mockAddress.slice(0, 6)}...${mockAddress.slice(-6)}`;
  
  // Calculate simulated funds available based on selector state
  const availableFunds = simBalance === "sufficient" ? 1500 : 50;

  // FEE CALCULATIONS (Clean 1.5% Escrow fee + Stellar gas fee)
  const rateNum = parseFloat(slot.rate.replace(/[^0-9.]/g, ""));
  const subtotal = rateNum * details.durationHours;
  const escrowFee = parseFloat((subtotal * 0.015).toFixed(4));
  const stellarFee = 0.0001;
  const totalCost = subtotal + escrowFee + stellarFee;

  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountedTotal, setDiscountedTotal] = useState(totalCost);

  useEffect(() => {
    // Reset discount state when the slot or total price changes. Deferred so
    // the writes don't run synchronously inside the effect body.
    window.setTimeout(() => {
      setDiscountPercent(0);
      setDiscountedTotal(totalCost);
    }, 0);
  }, [id, totalCost]);

  const effectiveTotalCost = discountPercent > 0 ? discountedTotal : totalCost;

  // Validation
  const hasFunds = availableFunds >= effectiveTotalCost;
  const isWalletReady = simWallet === "connected";

  // MODAL / CHECKOUT STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<"auth" | "confirm" | "loading" | "success">("auth");
  const [loadingMessage, setLoadingMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [announcement, setAnnouncement] = useState(""); // Screen reader announcer
  const [giftDetails, setGiftDetails] = useState<GiftDetails | null>(null);

  // DISPUTE STATE
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeView, setDisputeView] = useState<"filing" | "tracking">("filing");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [currentDispute, setCurrentDispute] = useState<Dispute | null>(null);
  
  // Mock existing dispute for demonstration
  const [existingDisputes, setExistingDisputes] = useState<Dispute[]>(() =>
    buildExistingDisputes(id),
  );

  // DRAFT ABANDONMENT STATE
  const [hasDraft, setHasDraft] = useState(false);
  const draftKey = `draft-booking-${id}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        // Deferred so the live-region state write doesn't run synchronously
        // inside the effect body.
        window.setTimeout(() => setHasDraft(true), 0);
      }
    }
  }, [draftKey]);

  // Handle saving draft automatically when modal is open
  useEffect(() => {
    if (isModalOpen && typeof window !== "undefined") {
      localStorage.setItem(draftKey, "true");
    }
  }, [isModalOpen, draftKey]);

  const handleResumeDraft = () => {
    setHasDraft(false);
    if (!isWalletReady || !hasFunds) return;
    setPurchaseStep("auth");
    setIsModalOpen(true);
  };

  const handleDiscardDraft = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(draftKey);
    }
    setHasDraft(false);
  };

  const handleViewDetails = () => {
    if (!isWalletReady || !hasFunds) return;
    setPurchaseStep("auth");
    setIsModalOpen(true);
  };

  // RECEIPT STATE (only meaningful once the transaction has settled)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const isSettled = purchaseStep === "success" && txHash !== "";

  const receipt: ReceiptData | null = isSettled
    ? {
        id: slot.id,
        assetCode: `CHRONO-${slot.id.toUpperCase()}`,
        title: slot.title,
        status: "settled",
        settledAt: `${slot.dateLabel} · ${slot.timeRange}`,
        buyer: { name: "You", role: "Buyer", address: mockAddress },
        seller: { name: details.seller.name, role: details.seller.role },
        lineItems: [
          { label: "Token subtotal", value: `${subtotal.toFixed(2)} XLM`, note: `${slot.rate} × ${details.durationHours} hrs` },
          { label: "Smart escrow fee", value: `${escrowFee.toFixed(4)} XLM`, note: "1.5% held in contract" },
          { label: "Stellar network fee", value: `${stellarFee.toFixed(4)} XLM`, note: "Paid to validators" },
        ],
        net: `${subtotal.toFixed(2)} XLM`,
        total: `${totalCost.toFixed(4)} XLM`,
        txHash,
        escrowContract: "GCSW67F2Y3MQK4N8Q5RLP9TZB3YH4W8F1S7N6U0X2A5V8T9H3K2",
        trace: [
          { label: "Stellar transaction initiated", status: "complete" },
          { label: "Trustline established for asset", status: "complete" },
          { label: "Funds locked in multi-sig escrow", status: "complete" },
          { label: "Token minted and funds released", status: "complete" },
        ],
        explorerBaseUrl: "https://stellar.expert/explorer/public/tx",
      }
    : null;
  
  // Refs for accessibility / focus trap
  const modalRef = useRef<HTMLDivElement>(null);
  const purchaseBtnRef = useRef<HTMLButtonElement>(null);
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  // Accessible Announcement utility
  const announce = (msg: string) => {
    setAnnouncement(msg);
  };

  const handleOpenModal = () => {
    if (!isWalletReady || !hasFunds) return;
    setPurchaseStep("auth");
    setIsModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setPurchaseStep("auth");
  }, []);

  // Keyboard navigation & focus management inside checkout modal
  useEffect(() => {
    if (isModalOpen) {
      lastActiveElementRef.current = document.activeElement as HTMLElement;

      // Move focus to modal container
      if (modalRef.current) {
        modalRef.current.focus();
      }
      // Defer state update so it does not run synchronously inside the effect
      const raf = requestAnimationFrame(() => {
        announce("Confirm purchase modal opened. Press Tab to navigate.");
      });
      return () => cancelAnimationFrame(raf);
    } else {
      // Restore focus
      if (lastActiveElementRef.current) {
        lastActiveElementRef.current.focus();
      }
    }
  }, [isModalOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, handleCloseModal]);

  // Simulated blockchain transaction workflow
  const handleProceedPurchase = () => {
    setPurchaseStep("loading");
    
    const steps = [
      { text: "Initiating Stellar transaction...", time: 0 },
      { text: "Establishing trustline for CHRONO-SLOT-TIME...", time: 1000 },
      { text: "Locking funds in Multi-Sig Smart Escrow...", time: 2000 },
      { text: "Minting token and finalizing receipt...", time: 3000 },
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setLoadingMessage(step.text);
        announce(step.text);
      }, step.time);
    });

    setTimeout(() => {
      // Generate randomized Stellar-like txn hash for realism
      const randomHash = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("") + "...minted";
      setTxHash(randomHash);
      setPurchaseStep("success");
      announce("Time token purchased successfully. Receipt ready.");
    }, 4000);
  };

  const handleSimulateConnection = () => {
    setSimWallet("connected");
    announce("Wallet connected successfully.");
  };

  // DISPUTE HANDLERS
  const handleOpenDisputeModal = () => {
    setDisputeView(existingDisputes.length > 0 ? "tracking" : "filing");
    if (existingDisputes.length > 0) {
      setCurrentDispute(existingDisputes[0]);
    }
    setIsDisputeModalOpen(true);
  };

  const handleCloseDisputeModal = () => {
    setIsDisputeModalOpen(false);
    setCurrentDispute(null);
  };

  const handleSubmitDispute = async (formData: DisputeFormData) => {
    setIsSubmittingDispute(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newDispute: Dispute = {
      id: `disp-${Date.now()}`,
      slotId: id,
      category: formData.category,
      reason: formData.reason,
      description: formData.description,
      status: "submitted",
      evidence: formData.evidence.map((file, index) => ({
        id: `ev-${Date.now()}-${index}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadStatus: "completed" as const,
        scanStatus: "clean" as const,
        uploadedAt: new Date().toISOString()
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      notes: [
        {
          id: "note-1",
          author: "System",
          authorRole: "system",
          content: "Dispute submitted successfully. Awaiting initial review.",
          createdAt: new Date().toISOString()
        }
      ],
      metadata: {
        priority: "medium",
        escalationCount: 0,
        lastActivityAt: new Date().toISOString()
      }
    };

    setExistingDisputes(prev => [...prev, newDispute]);
    setCurrentDispute(newDispute);
    setDisputeView("tracking");
    setIsSubmittingDispute(false);
    announce("Dispute submitted successfully");
  };

  const handleAddDisputeNote = async (content: string) => {
    if (!currentDispute) return;
    
    const newNote = {
      id: `note-${Date.now()}`,
      author: "You",
      authorRole: "buyer" as const,
      content,
      createdAt: new Date().toISOString()
    };

    const updatedDispute = {
      ...currentDispute,
      notes: [...currentDispute.notes, newNote],
      updatedAt: new Date().toISOString(),
      metadata: {
        ...currentDispute.metadata,
        lastActivityAt: new Date().toISOString()
      }
    };

    setCurrentDispute(updatedDispute);
    setExistingDisputes(prev => 
      prev.map(d => d.id === updatedDispute.id ? updatedDispute : d)
    );
  };

  const mapTone = (status: typeof slot.status) => {
    if (status === "Healthy") return "positive" as const;
    if (status === "Tight") return "warning" as const;
    return "critical" as const;
  };

  return (
    <DashboardShell>
      {/* Screen Reader Live Announcer */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>

      <div className="space-y-6">
        {hasDraft && (
          <BookingAbandonmentBanner
            onResume={handleResumeDraft}
            onDiscard={handleDiscardDraft}
            onViewDetails={handleViewDetails}
          />
        )}
        {/* Breadcrumb Navigation & Back Button */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-cyan-300/30 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <ArrowLeft className="icon-directional h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Dashboard
          </Link>

          <BreadcrumbOverflow
            className="relative"
            items={[
              { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
              { label: "Slots", href: "/dashboard/slots" },
              { label: "Booking", href: `/dashboard/slots/${id}` },
              { label: "Details" },
            ]}
          />
        </div>

        {/* ----------------- SCENARIO SIMULATOR (TESTING UTILITY) ----------------- */}
        <section
          className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 shadow-[0_0_20px_rgba(34,211,238,0.06)]"
          aria-labelledby="simulator-title"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="simulator-title" className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Scenario Simulator
              </h2>
              <p className="helper-text helper-text--muted mt-1">
                Toggle simulated states below to review edge case UX flows dynamically.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="space-y-1.5">
                <span className="block text-[10px] text-slate-400 font-medium uppercase">Stellar Wallet Status</span>
                <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-white/10">
                  {(["connected", "disconnected", "error"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSimWallet(mode)}
                      className={`rounded px-2.5 py-1 font-semibold uppercase tracking-wider transition ${
                        simWallet === mode
                          ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/20"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-[10px] text-slate-400 font-medium uppercase">Simulated Balance</span>
                <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-white/10">
                  {(["sufficient", "insufficient"] as const).map((bal) => (
                    <button
                      key={bal}
                      onClick={() => setSimBalance(bal)}
                      className={`rounded px-2.5 py-1 font-semibold uppercase tracking-wider transition ${
                        simBalance === bal
                          ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/20"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {bal === "sufficient" ? "1,500 XLM" : "50 XLM"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ----------------- TWO-COLUMN DETAILS GRID ----------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT SIDE: SLOT SUMMARY & SELLER INFO (2 Columns wide) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Slot Core Overview */}
            <article className="glass-panel rounded-[2rem] p-6 sm:p-8 space-y-5 border border-white/10 bg-slate-950/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StatusChip tone={mapTone(slot.status)}>{slot.status}</StatusChip>
                  {slot.isNextAvailable && (
                    <span className="inline-flex items-center rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-cyan-200 border border-cyan-400/20">
                      ⚡ NEXT AVAILABLE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Users className="h-3.5 w-3.5 text-cyan-400" />
                  {slot.demand}
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {slot.title}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-y border-white/8 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-cyan-400">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Date Scheduled</p>
                    <p className="text-sm font-semibold text-white">{slot.dateLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-cyan-400">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Time (Duration)</p>
                    <p className="text-sm font-semibold text-white">
                      {slot.timeRange} ({details.durationHours} hrs)
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Slot Description
                </h2>
                <p className="text-sm leading-7 text-slate-300">
                  {details.description}
                </p>
              </div>
            </article>

            {/* Seller profile block */}
            <article className="glass-panel rounded-[2rem] p-6 sm:p-8 space-y-6 border border-white/10 bg-slate-950/20">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Seller Information
              </h2>

              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* CSS Premium Avatar */}
                <div
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-tr ${details.seller.avatarGradient} text-xl font-bold tracking-wider text-white shadow-lg`}
                  aria-hidden={true}
                >
                  {details.seller.avatarInitials}
                </div>

                <div className="space-y-2">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {details.seller.name}
                      <span className="inline-flex rounded bg-emerald-400/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase border border-emerald-400/20">
                        Verified Seller
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{details.seller.role}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {details.seller.bio}
                  </p>
                </div>
              </div>

              {/* Seller metrics grid */}
              <div className="grid grid-cols-3 gap-4 border-t border-white/8 pt-5">
                {details.seller.stats.map((stat, i) => (
                  <div key={i} className="text-center sm:text-left">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-lg font-bold text-white mt-1">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-400">
                  Availability, reviews, and policies are maintained on the supplier profile.
                </p>
                <Link
                  href={`/dashboard/suppliers/${details.seller.id}`}
                  aria-label={`View ${details.seller.name}'s profile with availability, reviews, and policies`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-200 transition-all hover:border-cyan-400/50 hover:bg-cyan-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  View supplier profile
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          </div>

          {/* RIGHT SIDE: PRICING CARD & WALLET STATE (1 Column wide) */}
          <aside className="lg:col-span-1 space-y-6">
            
            {/* Purchase Details & Price Breakdown */}
            <OrderSummaryDrawer
              title="Purchase details"
              description="Review pricing, wallet readiness, and confirm the booking before you lock funds."
            >
              <section
                className="glass-panel rounded-[2rem] p-6 border border-white/10 bg-slate-950/20 space-y-6"
                aria-labelledby="pricing-summary-title"
              >
                <h2 id="pricing-summary-title" className="text-sm font-bold uppercase tracking-wider text-slate-300">
                  Purchase Details
                </h2>

                {/* Stellar Wallet Integration State Banners */}
                <div className="space-y-3">
                {simWallet === "disconnected" && (
                  <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-semibold">Stellar Wallet Disconnected</p>
                      <p className="helper-text helper-text--muted mt-1">
                        Please connect your Stellar active wallet to continue.
                      </p>
                    </div>
                  </div>
                )}

                {simWallet === "error" && (
                  <div className="rounded-xl border border-rose-400/25 bg-rose-400/10 p-3.5 text-xs text-rose-200 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <p className="font-semibold">Wallet Sync Interrupted</p>
                      <p className="helper-text helper-text--muted mt-1">
                        Network timeout while validating Stellar account trustline.
                      </p>
                    </div>
                  </div>
                )}

                {isWalletReady && !hasFunds && (
                  <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-semibold">Insufficient Balance</p>
                      <p className="helper-text helper-text--muted mt-1">
                        Your balance ({availableFunds} XLM) is lower than the total cost ({effectiveTotalCost.toFixed(4)} XLM).
                      </p>
                    </div>
                  </div>
                )}

                {isWalletReady && hasFunds && (
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3.5 text-xs text-cyan-100 flex items-start gap-2.5">
                    <Wallet className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">Connected Wallet</p>
                      <p className="helper-text mt-0.5 text-slate-400 truncate">{displayAddress}</p>
                      <p className="helper-text mt-1 text-cyan-300 font-medium">Balance: {availableFunds} XLM</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Breakdown Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-2">
                  Cost Breakdown
                </h3>
                
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-300">Rate per Hour</dt>
                    <dd className="font-semibold text-white">{slot.rate}</dd>
                  </div>
                  
                  <div className="flex justify-between">
                    <dt className="text-slate-300">Total Hours</dt>
                    <dd className="font-semibold text-white">{details.durationHours} hrs</dd>
                  </div>

                  <div className="flex justify-between border-b border-white/5 pb-3">
                    <dt className="text-slate-300">Token Subtotal</dt>
                    <dd className="font-semibold text-white">{subtotal.toFixed(2)} XLM</dd>
                  </div>

                  {/* Escrow Fee */}
                  <div className="flex items-center justify-between gap-1">
                    <dt className="text-slate-300 flex items-center gap-1.5">
                      Smart Escrow Fee
                      <span className="group relative">
                        <Info className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-white" />
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-900 border border-white/10 p-2 text-[10px] text-slate-200 opacity-0 group-hover:opacity-100 transition shadow-xl z-10">
                          1.5% fee held securely in Stellar contract during booking.
                        </span>
                      </span>
                    </dt>
                    <dd className="font-semibold text-white">{escrowFee.toFixed(4)} XLM</dd>
                  </div>

                  {/* Network Fee */}
                  <div className="flex items-center justify-between gap-1 border-b border-white/5 pb-3">
                    <dt className="text-slate-300 flex items-center gap-1.5">
                      Stellar Network Fee
                      <span className="group relative">
                        <Info className="h-3.5 w-3.5 text-slate-400 cursor-pointer hover:text-white" />
                        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-900 border border-white/10 p-2 text-[10px] text-slate-200 opacity-0 group-hover:opacity-100 transition shadow-xl z-10">
                          Gas fees paid directly to Stellar validators for ledger commitment.
                        </span>
                      </span>
                    </dt>
                    <dd className="font-semibold text-white">{stellarFee.toFixed(4)} XLM</dd>
                  </div>

                  {/* Total Cost */}
                  <div className="space-y-2 rounded-xl border border-cyan-400/10 bg-cyan-400/5 p-3 text-sm">
                    {discountPercent > 0 ? (
                      <div className="flex justify-between text-cyan-100">
                        <dt>Discounted total</dt>
                        <dd className="font-semibold">{discountedTotal.toFixed(4)} XLM</dd>
                      </div>
                    ) : (
                      <div className="flex justify-between text-cyan-100">
                        <dt>Base total</dt>
                        <dd className="font-semibold">{totalCost.toFixed(4)} XLM</dd>
                      </div>
                    )}
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-xs text-cyan-200/80">
                        <dt>{discountPercent}% promo applied</dt>
                        <dd>{(totalCost - discountedTotal).toFixed(4)} XLM saved</dd>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-base font-bold text-white pt-1">
                    <dt className="text-cyan-300">Total Purchase Cost</dt>
                    <dd className="text-cyan-300 font-extrabold">{effectiveTotalCost.toFixed(4)} XLM</dd>
                  </div>
                </dl>
              </div>

              <GiftPurchaseToggle onChange={setGiftDetails} />

              <PromoCodeEntry
                baseTotal={totalCost}
                onDiscountApplied={({ percent, discountedTotal: nextTotal }) => {
                  setDiscountPercent(percent);
                  setDiscountedTotal(nextTotal);
                }}
              />

              {/* Escrow Guarantee Statement */}
              <div className="rounded-xl bg-white/4 border border-white/8 p-3.5 text-[11px] text-slate-300 flex gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Funds are secured in a Stellar Smart Escrow lockbox. Funds are only released after successful slot completion. Cancel safely up to 24 hours prior.
                </p>
              </div>

                {/* CTA Action Buttons */}
                <div className="pt-2">
                  {simWallet === "disconnected" && (
                    <button
                      type="button"
                      onClick={handleSimulateConnection}
                      className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 px-5 py-3 text-sm bg-cyan-300 text-slate-950 hover:bg-cyan-200 shadow-[0_16px_34px_rgba(34,211,238,0.15)]"
                    >
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect Stellar Wallet
                    </button>
                  )}

                  {simWallet === "error" && (
                    <button
                      type="button"
                      onClick={() => {
                        setSimWallet("connected");
                        announce("Wallet connected successfully.");
                      }}
                      className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 px-5 py-3 text-sm border border-rose-400/30 bg-rose-400/10 text-rose-200 hover:bg-rose-400/20"
                    >
                      Retry Connection Sync
                    </button>
                  )}

                  {isWalletReady && !hasFunds && (
                    <button
                      type="button"
                      disabled
                      className="w-full flex items-center justify-center rounded-full font-bold px-5 py-3 text-sm border border-white/10 bg-white/5 text-slate-400 cursor-not-allowed"
                    >
                      Insufficient Stellar Funds
                    </button>
                  )}

                  {isWalletReady && hasFunds && (
                    <button
                      type="button"
                      ref={purchaseBtnRef}
                      onClick={handleOpenModal}
                      className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 px-5 py-3 text-sm bg-cyan-300 text-slate-950 hover:bg-cyan-200 hover:scale-[1.01] hover:shadow-[0_16px_34px_rgba(34,211,238,0.22)] active:scale-[0.99]"
                    >
                      Purchase Time Token
                    </button>
                  )}

                  {/* Dispute Button */}
                  {existingDisputes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleOpenDisputeModal}
                      className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 px-5 py-3 text-sm border border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/20 mt-3"
                    >
                      <Scale className="h-4 w-4 mr-2" />
                      View Dispute ({existingDisputes.length})
                    </button>
                  )}
                </div>
              </section>
            </OrderSummaryDrawer>
          </aside>
        </div>
      </div>

      {/* ----------------- CONFIRM PURCHASE MODAL DIALOG ----------------- */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all animate-fade-in"
          role="presentation"
        >
          <FocusTrap>
            <div
              ref={modalRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-headline"
              className="w-full max-w-md rounded-3xl border border-white/12 bg-slate-900 p-6 sm:p-8 shadow-2xl relative focus:outline-none animate-scale-up"
            >
              
              {/* CLOSE BUTTON (Only visible in confirm/success states) */}
              {purchaseStep !== "loading" && (
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 z-10"
                  aria-label="Close modal dialog"
                >
                  ✕
                </button>
              )}

              {/* STEP 0: AUTHENTICATION / PATH SELECTION */}
              {purchaseStep === "auth" && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h3 id="modal-headline" className="text-xl font-bold text-white">
                      How would you like to continue?
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-400 max-w-sm mx-auto">
                      Choose your checkout path to secure this booking.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Guest Card */}
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition-all hover:border-cyan-400/30">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-sm font-bold text-white">Guest (Wallet Only)</h4>
                      </div>
                      <ul className="space-y-2 mb-4 text-xs text-slate-300">
                        <li className="flex gap-2 items-start">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Fast checkout</span>
                        </li>
                        <li className="flex gap-2 items-start">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>No booking history or preferences saved</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => setPurchaseStep("confirm")}
                        className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 px-4 py-2.5 text-xs border border-white/10 text-slate-300 hover:bg-white/5"
                      >
                        Continue as Guest
                      </button>
                    </div>

                    {/* Sign In Card */}
                    <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-4 transition-all hover:border-cyan-400/50 relative">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                          Sign In
                          <span className="group relative ml-1">
                            <Info className="h-3.5 w-3.5 text-cyan-400/60 cursor-pointer hover:text-cyan-300" aria-label="Why sign in?" />
                            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-slate-900 border border-white/10 p-2 text-[10px] text-slate-200 opacity-0 group-hover:opacity-100 transition shadow-xl z-20">
                              Signing in syncs your wallet with your profile, giving you access to purchase history, saved settings, and priority support.
                            </span>
                          </span>
                        </h4>
                        <span className="inline-flex rounded bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-bold text-cyan-400 uppercase border border-cyan-400/20">
                          Recommended
                        </span>
                      </div>
                      <ul className="space-y-2 mb-4 text-xs text-slate-300">
                        <li className="flex gap-2 items-start">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Full booking history & receipts</span>
                        </li>
                        <li className="flex gap-2 items-start">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Saved preferences & notifications</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => setPurchaseStep("confirm")}
                        className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 px-4 py-2.5 text-xs bg-cyan-400/20 text-cyan-100 hover:bg-cyan-400/30 border border-cyan-400/30"
                      >
                        Sign In to Continue
                      </button>
                    </div>

                    {/* Create Account Card */}
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition-all hover:border-cyan-400/30">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-sm font-bold text-white">Create Account</h4>
                      </div>
                      <ul className="space-y-2 mb-4 text-xs text-slate-300">
                        <li className="flex gap-2 items-start">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Unlock all platform features</span>
                        </li>
                        <li className="flex gap-2 items-start">
                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Setup takes &lt; 1 minute</span>
                        </li>
                      </ul>
                      <button
                        onClick={() => setPurchaseStep("confirm")}
                        className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 px-4 py-2.5 text-xs border border-white/10 text-slate-300 hover:bg-white/5"
                      >
                        Create Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 1: INITIAL CONFIRMATION DETAILS */}
              {purchaseStep === "confirm" && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h3 id="modal-headline" className="text-xl font-bold text-white">
                      Confirm Escrow Booking
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-400 max-w-xs mx-auto">
                      You are committing Stellar funds into smart escrow to tokenize availability.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 space-y-3.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Time Token</span>
                      <span className="font-semibold text-white max-w-[180px] truncate text-right">
                        {slot.title}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-slate-400">Scheduled Date</span>
                      <span className="font-semibold text-white">{slot.dateLabel}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Seller</span>
                      <span className="font-semibold text-white">{details.seller.name}</span>
                    </div>

                    {giftDetails?.isGift && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Gift for</span>
                        <span className="font-semibold text-white max-w-[180px] truncate text-right">
                          {giftDetails.recipientName || giftDetails.recipientEmail || "Recipient"}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-white/5 pt-3.5">
                      <span className="text-slate-400">Network + Escrow Fee</span>
                      <span className="font-semibold text-slate-200">{(escrowFee + stellarFee).toFixed(4)} XLM</span>
                    </div>

                    <div className="flex justify-between text-base font-bold border-t border-white/5 pt-3.5">
                      <span className="text-cyan-300">Total locked</span>
                      <span className="text-cyan-300 font-extrabold">{effectiveTotalCost.toFixed(4)} XLM</span>
                    </div>
                  </div>

                  {/* Confirm / Commit Action CTAs */}
                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleProceedPurchase}
                      className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 px-5 py-3 text-sm bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                    >
                      Confirm & Lock Funds
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white px-5 py-3 text-sm border border-white/10 text-slate-300 hover:bg-white/5"
                    >
                      Cancel Booking
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: BLOCKCHAIN TX LOG LOADING STATE */}
              {purchaseStep === "loading" && (
                <div className="text-center py-6 space-y-6">
                  <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
                    <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
                    <span className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 id="modal-headline" className="text-lg font-bold text-white">
                      Stellar Blockchain Syncing
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto h-8 flex items-center justify-center">
                      {loadingMessage}
                    </p>
                  </div>

                  <div className="max-w-[240px] mx-auto space-y-2" aria-hidden={true}>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-cyan-400 animate-[loading-bar_4s_ease-out_forwards]" />
                    </div>
                    <span className="text-[10px] text-slate-500 block uppercase tracking-wider">
                      Ledger validation in progress
                    </span>
                  </div>
                </div>
              )}

              {/* STEP 3: TRANSACTION SUCCESS CONFIRMATION RECEIPT */}
              {purchaseStep === "success" && (
                <div className="space-y-6 animate-scale-up">
                  <div className="text-center space-y-2">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                      <Check className="h-6 w-6" />
                    </div>
                    <h3 id="modal-headline" className="text-xl font-bold text-white flex items-center justify-center gap-1.5">
                      Time Token Purchased
                      <Sparkles className="h-4 w-4 text-cyan-300 shrink-0" />
                    </h3>
                    <p className="text-xs text-slate-400">
                      Your availability block has been secured and tokenized on Stellar ledger.
                    </p>
                  </div>

                  {/* Successful Tx Receipt Table */}
                  <div className="rounded-2xl border border-white/8 bg-slate-950/60 p-4 space-y-3.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Minted Asset Code</span>
                      <span className="font-mono text-cyan-300 font-semibold uppercase">
                        CHRONO-{slot.id.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-400 shrink-0">Stellar Txn Hash</span>
                      <span className="font-mono text-slate-300 truncate max-w-[160px]" title={txHash}>
                        {txHash}
                      </span>
                    </div>

                    <div className="flex justify-between items-start gap-4">
                      <span className="text-slate-400 shrink-0">Escrow Contract</span>
                      <span className="font-mono text-slate-300 truncate max-w-[160px]">
                        GCSW67F2Y...T9H3K2
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-white/5 pt-3.5">
                      <span className="text-slate-400">Total Locked</span>
                      <span className="font-bold text-white">{effectiveTotalCost.toFixed(4)} XLM</span>
                    </div>
                  </div>

                  {/* Auxiliary Booking CTAs */}
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => setIsRedeemModalOpen(true)}
                      className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 px-4 py-2.5 text-xs border border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20"
                    >
                      Redeem Time Token
                    </button>

                    <button
                      type="button"
                      onClick={() => alert("Simulated Calendar Link: Dynamic Google Calendar invite dispatched successfully.")}
                      className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 px-4 py-2.5 text-xs border border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
                    >
                      Add Booking to Calendar
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsReceiptOpen(true)}
                      className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 px-4 py-2.5 text-xs border border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
                    >
                      View Receipt
                      <Receipt className="h-3 w-3 ml-1.5" />
                    </button>

                    <a
                      href="https://stellar.expert"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center rounded-full font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white px-4 py-2.5 text-xs border border-white/10 text-slate-300 hover:bg-white/5"
                    >
                      View Ledger Transaction
                      <ExternalLink className="h-3 w-3 ml-1.5" />
                    </a>

                    <Link
                      href="/dashboard"
                      className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 px-5 py-3 text-sm bg-cyan-300 text-slate-950 hover:bg-cyan-200 text-center mt-2"
                    >
                      Return to Dashboard
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </FocusTrap>
        </div>
      )}

      {/* ----------------- DISPUTE MODAL DIALOG ----------------- */}
      {isDisputeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all animate-fade-in"
          role="presentation"
        >
          <FocusTrap>
            <div
              ref={modalRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dispute-modal-headline"
              className="w-full max-w-2xl rounded-3xl border border-white/12 bg-slate-900 p-6 sm:p-8 shadow-2xl relative focus:outline-none animate-scale-up max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 id="dispute-modal-headline" className="text-xl font-bold text-white">
                  {disputeView === "filing" ? "File a Dispute" : "Dispute Tracking"}
                </h2>
                <button
                  type="button"
                  onClick={handleCloseDisputeModal}
                  className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Close dispute modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* View Toggle */}
              {existingDisputes.length > 0 && (
                <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-full">
                  <button
                    type="button"
                    onClick={() => setDisputeView("tracking")}
                    className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      disputeView === "tracking"
                        ? "bg-amber-400/20 text-amber-200"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Track Dispute
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisputeView("filing")}
                    className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      disputeView === "filing"
                        ? "bg-amber-400/20 text-amber-200"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    File New Dispute
                  </button>
                </div>
              )}

              {/* Content */}
              {disputeView === "filing" ? (
                <DisputeFilingForm
                  slotId={id}
                  onSubmit={handleSubmitDispute}
                  isSubmitting={isSubmittingDispute}
                  onCancel={handleCloseDisputeModal}
                />
              ) : (
                currentDispute && (
                  <DisputeTrackingPanel
                    dispute={currentDispute}
                    onAddNote={handleAddDisputeNote}
                  />
                )
              )}
            </div>
          </FocusTrap>
        </div>
      )}

      {/* ----------------- ON-CHAIN RECEIPT DIALOG ----------------- */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        receipt={receipt}
      />

      {/* ----------------- TOKEN REDEMPTION DIALOG ----------------- */}
      <RedeemTokenModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        tokenCode={demoTokenCode(slot.id)}
      />
    </DashboardShell>
  );
}
