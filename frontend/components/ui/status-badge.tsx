import * as React from "react"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
  className?: string
  showDot?: boolean
}

interface StatusConfig {
  label: string
  containerClass: string
  dotClass: string
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const normalized = (status || "").toUpperCase().trim()

  let config: StatusConfig = {
    label: formatStatusText(normalized),
    containerClass: "bg-slate-100/90 text-slate-700 border-slate-200/80 dark:bg-zinc-850 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700/60",
    dotClass: "bg-slate-400 dark:bg-zinc-400",
  }

  switch (normalized) {
    case "DRAFT":
    case "PENDING":
    case "OPEN":
      config = {
        label: normalized === "DRAFT" ? "Draft" : normalized === "PENDING" ? "Pending" : "Open",
        containerClass: "bg-slate-100/80 text-slate-700 border-slate-200/70 dark:bg-zinc-800/40 dark:text-zinc-300 dark:border-zinc-700/50",
        dotClass: "bg-slate-400 dark:bg-zinc-400",
      }
      break

    case "NEEDS_CLARIFICATION":
      config = {
        label: "Needs Clarification",
        containerClass: "bg-amber-500/10 text-amber-800 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
        dotClass: "bg-amber-500 animate-pulse",
      }
      break

    case "READY_FOR_ESTIMATION":
      config = {
        label: "Ready for Estimation",
        containerClass: "bg-emerald-500/10 text-emerald-800 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
        dotClass: "bg-emerald-500",
      }
      break

    case "ESTIMATED":
      config = {
        label: "Estimated",
        containerClass: "bg-blue-500/10 text-blue-800 border-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
        dotClass: "bg-blue-500",
      }
      break

    case "COMPLETED":
    case "RESOLVED":
      config = {
        label: normalized === "COMPLETED" ? "Completed" : "Resolved",
        containerClass: "bg-emerald-500/10 text-emerald-800 border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
        dotClass: "bg-emerald-500",
      }
      break

    case "ANALYZING":
      config = {
        label: "Analyzing...",
        containerClass: "bg-indigo-500/10 text-indigo-800 border-indigo-500/20 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
        dotClass: "bg-indigo-500 animate-ping",
      }
      break

    case "CRITICAL":
    case "HIGH":
      config = {
        label: normalized === "CRITICAL" ? "Critical" : "High",
        containerClass: "bg-rose-500/10 text-rose-800 border-rose-500/20 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
        dotClass: "bg-rose-500",
      }
      break

    case "MEDIUM":
      config = {
        label: "Medium",
        containerClass: "bg-amber-500/10 text-amber-800 border-amber-500/20 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
        dotClass: "bg-amber-500",
      }
      break

    case "LOW":
      config = {
        label: "Low",
        containerClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700/50",
        dotClass: "bg-slate-400",
      }
      break
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors shadow-2xs select-none whitespace-nowrap",
        config.containerClass,
        className
      )}
    >
      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotClass)} />
      )}
      <span>{config.label}</span>
    </span>
  )
}

function formatStatusText(str: string): string {
  return str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
