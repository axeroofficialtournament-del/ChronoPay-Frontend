"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Play } from "lucide-react";
import { A11yIssuePanel } from "./a11y-issue-panel";
import {
  SAMPLE_AUDIT_ISSUES,
  type AccessibilityIssue,
} from "@/lib/wcag-references";

type SeverityFilter = "all" | "critical" | "major" | "minor" | "warning";

function IssueCard({
  issue,
  isSelected,
  onClick,
  triggerRef,
}: {
  issue: AccessibilityIssue;
  isSelected: boolean;
  onClick: () => void;
  triggerRef:
    | React.RefObject<HTMLButtonElement | null>
    | ((el: HTMLButtonElement | null) => void);
}) {
  const severityColors = {
    critical: "border-rose-400/30 hover:bg-rose-400/5 hover:border-rose-400/50",
    major: "border-amber-400/30 hover:bg-amber-400/5 hover:border-amber-400/50",
    minor: "border-cyan-400/30 hover:bg-cyan-400/5 hover:border-cyan-400/50",
    warning: "border-blue-400/30 hover:bg-blue-400/5 hover:border-blue-400/50",
  };

  const severityBadgeColors = {
    critical: "bg-rose-400/20 text-rose-100",
    major: "bg-amber-400/20 text-amber-100",
    minor: "bg-cyan-400/20 text-cyan-100",
    warning: "bg-blue-400/20 text-blue-100",
  };

  const severityIcons = {
    critical: <AlertCircle className="h-4 w-4 text-rose-400" aria-hidden="true" />,
    major: <AlertCircle className="h-4 w-4 text-amber-400" aria-hidden="true" />,
    minor: <CheckCircle2 className="h-4 w-4 text-cyan-400" aria-hidden="true" />,
    warning: <AlertCircle className="h-4 w-4 text-blue-400" aria-hidden="true" />,
  };

  return (
    <button
      ref={triggerRef}
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`${issue.title}, severity: ${issue.severity}`}
      className={`w-full text-left rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 p-4 ${severityColors[issue.severity]} ${
        isSelected ? "bg-white/10 border-cyan-400/50" : "bg-slate-900/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{severityIcons[issue.severity]}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white truncate">
              {issue.title}
            </h3>
            <span
              className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-widest shrink-0 ${severityBadgeColors[issue.severity]}`}
            >
              {issue.severity}
            </span>
          </div>
          <p className="text-xs text-slate-400 line-clamp-2">
            {issue.description}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {issue.wcagCriterion?.id && (
              <span className="text-xs font-mono text-slate-500">
                WCAG {issue.wcagCriterion.id}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export function A11yAuditDashboard() {
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  
  const [issues, setIssues] = useState<AccessibilityIssue[]>(SAMPLE_AUDIT_ISSUES);
  const [isAuditing, setIsAuditing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const selectedIssue = issues.find(
    (issue) => issue.id === selectedIssueId
  ) ?? null;

  const filteredIssues =
    severityFilter === "all"
      ? issues
      : issues.filter((issue) => issue.severity === severityFilter);

  const issueCounts = {
    critical: issues.filter((i) => i.severity === "critical").length,
    major: issues.filter((i) => i.severity === "major").length,
    minor: issues.filter((i) => i.severity === "minor").length,
    warning: issues.filter((i) => i.severity === "warning").length,
  };

  const filterOptions: Array<{
    id: SeverityFilter;
    label: string;
    count: number;
  }> = [
    { id: "all", label: "All Issues", count: issues.length },
    { id: "critical", label: "Critical", count: issueCounts.critical },
    { id: "major", label: "Major", count: issueCounts.major },
    { id: "minor", label: "Minor", count: issueCounts.minor },
    { id: "warning", label: "Warning", count: issueCounts.warning },
  ];

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      const axe = (await import('axe-core')).default;
      const context = iframeRef.current?.contentWindow?.document || document;
      
      const results = await axe.run(context as unknown as Element);
      
      const newIssues: AccessibilityIssue[] = [];
      let idCounter = 1;
      
      results.violations.forEach(violation => {
        violation.nodes.forEach(node => {
          let severity: AccessibilityIssue['severity'] = 'minor';
          if (violation.impact === 'critical') severity = 'critical';
          if (violation.impact === 'serious') severity = 'major';
          if (violation.impact === 'moderate') severity = 'warning';
          
          newIssues.push({
            id: `live-issue-${idCounter++}`,
            title: violation.help,
            description: violation.description,
            severity,
            snippet: node.html,
            wcagCriterion: {
              id: 'Live',
              title: violation.id,
              description: '',
              level: 'A',
              specUrl: violation.helpUrl,
              techniques: violation.tags
            },
            recommendedFix: {
              description: node.failureSummary || 'Review Axe documentation',
              codeExample: '',
              explanation: ''
            },
            impact: violation.help || 'minor',
            elementType: Array.isArray(node.target)
                ? String(node.target[0])
                : 'unknown',
            location: 'Staged Route'
          });
        });
      });
      
      setIssues(newIssues.length > 0 ? newIssues : []);
    } catch(e) {
      console.error(e);
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400" aria-hidden="true" />
            Live Accessibility Audit
          </h2>
          <p className="text-sm text-slate-400">
            Run an axe-core audit on the staged route to surface live violations.
          </p>
        </div>
        <button
          onClick={runAudit}
          disabled={isAuditing}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isAuditing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run Axe Audit
        </button>
      </div>
      
      {/* Hidden iframe for staged routes */}
      <iframe ref={iframeRef} src="/" className="hidden" title="Staged Route" />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {filterOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setSeverityFilter(option.id)}
            aria-pressed={severityFilter === option.id}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              severityFilter === option.id
                ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:bg-white/10"
            }`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-slate-300">{option.label}</span>
              <span className="text-lg font-bold">{option.count}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-4 relative min-h-[600px]">
        <div className="flex-1 min-w-0">
          <div className="space-y-3">
            {filteredIssues.length > 0 ? (
              filteredIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  isSelected={selectedIssueId === issue.id}
                  onClick={() => setSelectedIssueId(issue.id)}
                  triggerRef={(el) => {
                    triggerRefs.current[issue.id] = el;
                  }}
                />
              ))
            ) : (
              <div className="rounded-lg border border-white/10 bg-slate-900/50 p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-slate-300">
                  No accessibility issues found with the current filter.
                </p>
              </div>
            )}
          </div>
        </div>

        {selectedIssue && (
          <A11yIssuePanel
            issue={selectedIssue}
            onClose={() => setSelectedIssueId(null)}
            triggerRef={undefined}
          />
        )}
      </div>
      <div className="rounded-lg border border-white/10 bg-slate-900/50 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Remediation Guidance
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          For full remediation guidance, consult the <a href="/docs/remediation.md" className="text-cyan-400 hover:underline">Accessibility Remediation Docs</a>.
        </p>
      </div>
    </div>
  );
}
