"use client";

import { useState, useCallback, useRef, useId } from "react";
import { 
  AlertCircle, 
  FileText, 
  ShieldCheck, 
  Send, 
  X, 
  ChevronRight,
  Info,
  Loader2
} from "lucide-react";
import { DisputeEvidenceUploader, DisputeFile } from "./dispute-evidence-uploader";
import { 
  DisputeFormData, 
  DisputeCategory, 
  DISPUTE_CATEGORIES 
} from "./dispute-types";

interface DisputeFilingFormProps {
  slotId: string;
  onSubmit: (data: DisputeFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const REASON_MIN_LENGTH = 10;
const REASON_MAX_LENGTH = 200;
const DESCRIPTION_MIN_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 2000;

export function DisputeFilingForm({
  slotId,
  onSubmit,
  onCancel,
  isSubmitting = false
}: DisputeFilingFormProps) {
  const [category, setCategory] = useState<DisputeCategory | "">("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<DisputeFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const formId = useId();
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const validateField = useCallback(
    (field: string, value: unknown): string | null => {
    switch (field) {
      case "category":
        if (!value) return "Please select a dispute category";
        return null;
      case "reason":
        if (!String(value).trim()) return "Reason is required";
        if (String(value).length < REASON_MIN_LENGTH) 
          return `Reason must be at least ${REASON_MIN_LENGTH} characters`;
        if (String(value).length > REASON_MAX_LENGTH) 
          return `Reason must not exceed ${REASON_MAX_LENGTH} characters`;
        return null;
      case "description":
        if (!String(value).trim()) return "Description is required";
        if (String(value).length < DESCRIPTION_MIN_LENGTH) 
          return `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters`;
        if (String(value).length > DESCRIPTION_MAX_LENGTH) 
          return `Description must not exceed ${DESCRIPTION_MAX_LENGTH} characters`;
        return null;
      case "evidence":
        if (evidenceFiles.length === 0) 
          return "At least one evidence file is required";
        const hasFailedUploads = evidenceFiles.some(f => 
          f.uploadStatus === "error" || f.scanStatus === "threat_detected"
        );
        if (hasFailedUploads) 
          return "Please resolve failed or threat-detected files before submitting";
        const hasPendingUploads = evidenceFiles.some(f => 
          f.uploadStatus === "uploading" || f.scanStatus === "scanning"
        );
        if (hasPendingUploads) 
          return "Please wait for all files to finish uploading and scanning";
        return null;
      default:
        return null;
    }
  }, [evidenceFiles]);

  const handleFieldBlur = (field: string, value: unknown) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors(prev => ({ 
      ...prev, 
      [field]: error || "" 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const fieldErrors: Record<string, string> = {};
    const fieldsToValidate = [
      { field: "category", value: category },
      { field: "reason", value: reason },
      { field: "description", value: description },
      { field: "evidence", value: evidenceFiles }
    ];

    fieldsToValidate.forEach(({ field, value }) => {
      const error = validateField(field, value);
      if (error) fieldErrors[field] = error;
    });

    setTouched(
      fieldsToValidate.reduce((acc, { field }) => ({ ...acc, [field]: true }), {})
    );
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      // Focus first error field
      const firstErrorField = Object.keys(fieldErrors)[0];
      if (firstErrorField === "category") {
        document.getElementById(`${formId}-category`)?.focus();
      } else if (firstErrorField === "reason") {
        document.getElementById(`${formId}-reason`)?.focus();
      } else if (firstErrorField === "description") {
        document.getElementById(`${formId}-description`)?.focus();
      }
      return;
    }

    // Prepare form data
    const formData: DisputeFormData = {
      category: category as DisputeCategory,
      reason,
      description,
      evidence: evidenceFiles.map(f => f.file)
    };

    await onSubmit(formData);
  };

  const canSubmit = !isSubmitting && 
    category && 
    reason.length >= REASON_MIN_LENGTH && 
    description.length >= DESCRIPTION_MIN_LENGTH &&
    evidenceFiles.length > 0 &&
    evidenceFiles.every(f => f.uploadStatus === "completed" && f.scanStatus === "clean") &&
    Object.values(errors).every(e => !e);

  return (
    <form 
      id={formId}
      onSubmit={handleSubmit} 
      className="space-y-6"
      noValidate
    >
      {/* Category Selection */}
      <div className="space-y-3">
        <label 
          htmlFor={`${formId}-category`}
          className="block text-sm font-semibold uppercase tracking-wider text-slate-300"
        >
          Dispute Category
          <span className="text-rose-400 ml-1" aria-hidden="true">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.entries(DISPUTE_CATEGORIES) as [DisputeCategory, typeof DISPUTE_CATEGORIES[DisputeCategory]][]).map(([key, cat]) => (
            <button
              key={key}
              type="button"
              id={`${formId}-category-${key}`}
              onClick={() => {
                setCategory(key);
                handleFieldBlur("category", key);
              }}
              onBlur={() => handleFieldBlur("category", category)}
              className={`text-left p-4 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                category === key
                  ? "border-cyan-400/50 bg-cyan-400/10 ring-1 ring-cyan-400/30"
                  : "border-white/10 bg-slate-950/40 hover:border-white/20"
              }`}
              aria-pressed={category === key}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{cat.label}</p>
                  <p className="text-xs text-slate-400 mt-1">{cat.description}</p>
                </div>
                {category === key && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400">
                    <ChevronRight className="h-3 w-3 text-slate-950" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
        {touched.category && errors.category && (
          <p className="flex items-center gap-1.5 text-xs text-rose-400" role="alert">
            <AlertCircle className="h-3.5 w-3.5" />
            {errors.category}
          </p>
        )}
      </div>

      {/* Reason Input */}
      <div className="space-y-3">
        <label 
          htmlFor={`${formId}-reason`}
          className="block text-sm font-semibold uppercase tracking-wider text-slate-300"
        >
          Reason for Dispute
          <span className="text-rose-400 ml-1" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <input
            id={`${formId}-reason`}
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => handleFieldBlur("reason", reason)}
            placeholder="Brief summary of why you're filing this dispute"
            maxLength={REASON_MAX_LENGTH}
            className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors ${
              touched.reason && errors.reason
                ? "border-rose-400/50 focus:ring-rose-400"
                : "border-white/10 focus:border-cyan-400/30"
            }`}
            aria-invalid={touched.reason && !!errors.reason}
            aria-describedby={`${formId}-reason-error ${formId}-reason-hint`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
            {reason.length}/{REASON_MAX_LENGTH}
          </div>
        </div>
        {touched.reason && errors.reason ? (
          <p id={`${formId}-reason-error`} className="flex items-center gap-1.5 text-xs text-rose-400" role="alert">
            <AlertCircle className="h-3.5 w-3.5" />
            {errors.reason}
          </p>
        ) : (
          <p id={`${formId}-reason-hint`} className="text-xs text-slate-500">
            Minimum {REASON_MIN_LENGTH} characters
          </p>
        )}
      </div>

      {/* Description Textarea */}
      <div className="space-y-3">
        <label 
          htmlFor={`${formId}-description`}
          className="block text-sm font-semibold uppercase tracking-wider text-slate-300"
        >
          Detailed Description
          <span className="text-rose-400 ml-1" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <textarea
            id={`${formId}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => handleFieldBlur("description", description)}
            placeholder="Provide a detailed explanation of the issue, including relevant dates, communications, and specific concerns..."
            rows={6}
            maxLength={DESCRIPTION_MAX_LENGTH}
            className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors resize-none ${
              touched.description && errors.description
                ? "border-rose-400/50 focus:ring-rose-400"
                : "border-white/10 focus:border-cyan-400/30"
            }`}
            aria-invalid={touched.description && !!errors.description}
            aria-describedby={`${formId}-description-error ${formId}-description-hint`}
          />
          <div className="absolute right-3 bottom-3 text-xs text-slate-500">
            {description.length}/{DESCRIPTION_MAX_LENGTH}
          </div>
        </div>
        {touched.description && errors.description ? (
          <p id={`${formId}-description-error`} className="flex items-center gap-1.5 text-xs text-rose-400" role="alert">
            <AlertCircle className="h-3.5 w-3.5" />
            {errors.description}
          </p>
        ) : (
          <p id={`${formId}-description-hint`} className="text-xs text-slate-500">
            Minimum {DESCRIPTION_MIN_LENGTH} characters. Be as specific as possible.
          </p>
        )}
      </div>

      {/* Evidence Upload */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold uppercase tracking-wider text-slate-300">
          Evidence Files
          <span className="text-rose-400 ml-1" aria-hidden="true">*</span>
        </label>
        <DisputeEvidenceUploader
          maxFileSizeMB={10}
          maxFiles={5}
          onFilesChange={(files) => {
            setEvidenceFiles(files);
            if (touched.evidence) {
              handleFieldBlur("evidence", files);
            }
          }}
        />
        {touched.evidence && errors.evidence && (
          <p className="flex items-center gap-1.5 text-xs text-rose-400" role="alert">
            <AlertCircle className="h-3.5 w-3.5" />
            {errors.evidence}
          </p>
        )}
      </div>

      {/* Security Notice */}
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 flex gap-3">
        <ShieldCheck className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-cyan-200">
            Evidence Security & Privacy
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            All uploaded files are scanned for security threats before being stored. 
            Your evidence is encrypted and only accessible to you, the other party, 
            and assigned mediators during the dispute resolution process.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          ref={submitButtonRef}
          type="submit"
          disabled={!canSubmit}
          className="flex-1 flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 px-5 py-3 text-sm bg-cyan-300 text-slate-950 hover:bg-cyan-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-cyan-300"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting Dispute...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Dispute
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white px-5 py-3 text-sm border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}
