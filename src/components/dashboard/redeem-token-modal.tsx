import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, Loader2, QrCode, Sparkles } from "lucide-react";

export interface RedeemTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenCode: string;
}

export function RedeemTokenModal({ isOpen, onClose, tokenCode }: RedeemTokenModalProps) {
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"qr" | "confirming" | "success">("qr");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset the flow whenever the modal is (re)opened so a previous
  // redemption never leaks into a new one.
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on open
      setStep("qr");
      setTimeLeft(300);
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || step !== "qr") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, step]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen, step]);
  
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && step !== "confirming") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, step, onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tokenCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const simulateSupplierConfirm = () => {
    setStep("confirming");
    setTimeout(() => {
      setStep("success");
    }, 2000);
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all animate-fade-in"
      role="presentation"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="redeem-modal-headline"
        className="w-full max-w-md rounded-3xl border border-white/12 bg-slate-900 p-6 sm:p-8 shadow-2xl relative focus:outline-none animate-scale-up"
      >
        {step !== "confirming" && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center rounded-full border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 z-10"
            aria-label="Close modal dialog"
          >
            ✕
          </button>
        )}

        {step === "qr" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 id="redeem-modal-headline" className="text-xl font-bold text-white">
                Redeem Time Token
              </h3>
              <p className="text-xs leading-relaxed text-slate-400 max-w-sm mx-auto">
                Present this QR code or short code to the supplier to confirm your arrival and begin the session.
              </p>
            </div>

            <div className="flex justify-center my-6">
              {/* Fake QR code placeholder */}
              <div className="bg-white p-4 rounded-xl shadow-inner relative group flex items-center justify-center" aria-label="QR Code for redemption">
                <QrCode className="w-48 h-48 text-slate-900" />
                <span className="sr-only">QR Code containing token {tokenCode}</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 p-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Short Code</span>
                <span className="font-mono text-lg font-bold text-cyan-300 tracking-[0.2em]">{tokenCode}</span>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors border border-white/5"
                aria-label="Copy short code"
                title="Copy short code"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-amber-300/90 flex items-center justify-center gap-2">
                <span className="motion-safe:animate-pulse" aria-hidden="true">⏳</span> Code expires in {minutes}:{seconds.toString().padStart(2, "0")}
              </p>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden motion-reduce:hidden" aria-hidden="true">
                <div 
                  className="h-full bg-amber-400/80 transition-all duration-1000 ease-linear"
                  style={{ width: `${(timeLeft / 300) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={simulateSupplierConfirm}
                className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 px-5 py-3 text-sm border border-cyan-400/30 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20"
              >
                Simulate Supplier Scan
              </button>
            </div>
          </div>
        )}

        {step === "confirming" && (
          <div className="text-center py-6 space-y-6">
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
              <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
              <span className="absolute inset-0 rounded-full border-2 border-cyan-400/20 animate-ping" />
            </div>
            
            <div className="space-y-2">
              <h3 id="redeem-modal-headline" className="text-lg font-bold text-white">
                Waiting for Supplier
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Supplier is confirming your code. Please wait...
              </p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-6 animate-scale-up text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
              <Check className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h3 id="redeem-modal-headline" className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                Token Redeemed!
                <Sparkles className="h-5 w-5 text-cyan-300 shrink-0" />
              </h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                Your session has officially begun. The smart escrow has been unlocked.
              </p>
            </div>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 px-5 py-3 text-sm bg-cyan-300 text-slate-950 hover:bg-cyan-200"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
