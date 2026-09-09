"use client"

import * as React from "react"
import { 
  CheckCircle2, 
  ArrowRight, 
  Loader2,
  AlertCircle,
  Clock
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface WorkflowStepperProps {
  activeTab: string
  onSelectTab: (tab: string) => void
  hasRequirement: boolean
  hasAnalysis: boolean
  totalGaps: number
  openCriticalGaps: number
  totalQuestions: number
  pendingQuestions: number
  answeredQuestions: number
  isReadyForEstimation: boolean
  hasEstimate: boolean
  estimateHours?: number
  onRunAnalysis?: () => void
  onRunGapAnalysis?: () => void
  onApplyAnswers?: () => void
  onGenerateEstimate?: () => void
  isAnalyzing?: boolean
  isGeneratingEstimate?: boolean
}

export function WorkflowStepper({
  activeTab,
  onSelectTab,
  hasRequirement,
  hasAnalysis,
  totalGaps,
  openCriticalGaps,
  totalQuestions,
  pendingQuestions,
  answeredQuestions,
  isReadyForEstimation,
  hasEstimate,
  estimateHours,
  onRunAnalysis,
  onRunGapAnalysis,
  onApplyAnswers,
  onGenerateEstimate,
  isAnalyzing = false,
  isGeneratingEstimate = false
}: WorkflowStepperProps) {
  // Determine completion of the 5 workflow stages
  const step1Complete = hasRequirement
  const step2Complete = hasAnalysis
  const step3Complete = totalQuestions > 0 && pendingQuestions === 0 && openCriticalGaps === 0
  const step4Complete = hasEstimate
  const step5Complete = hasEstimate // Reports available once estimate is generated

  // Determine current active workflow stage (1 to 5)
  let currentStage = 1
  if (!step1Complete) {
    currentStage = 1
  } else if (!step2Complete) {
    currentStage = 2
  } else if (!step3Complete) {
    currentStage = 3
  } else if (!step4Complete) {
    currentStage = 4
  } else {
    currentStage = 5
  }

  // Recommended action guidance (answers "What is happening now?" and "What should the user do next?")
  let actionInfo = {
    statusText: "Requirement Input",
    description: "Provide your project specification in natural language to unlock AI architectural analysis.",
    actionLabel: "Add Requirements",
    tab: "requirements",
    onAction: () => onSelectTab("requirements"),
    isLoading: false,
    needsAttention: false,
  }

  if (!hasRequirement) {
    actionInfo = {
      statusText: "Requirements Needed",
      description: "Describe your project idea and requirements to begin scoping your estimate.",
      actionLabel: "Edit Requirements",
      tab: "requirements",
      onAction: () => onSelectTab("requirements"),
      isLoading: false,
      needsAttention: false,
    }
  } else if (!hasAnalysis) {
    actionInfo = {
      statusText: "Ready for Analysis",
      description: "Your requirements are saved. Run analysis to identify key architecture and features.",
      actionLabel: "Run Analysis",
      tab: "analysis",
      onAction: onRunAnalysis || (() => onSelectTab("analysis")),
      isLoading: isAnalyzing,
      needsAttention: false,
    }
  } else if (totalGaps === 0 && !hasEstimate) {
    actionInfo = {
      statusText: "Clarifications Needed",
      description: "Your requirements have been analyzed. Review clarifications to prepare your estimate.",
      actionLabel: "Review Questions",
      tab: "gaps",
      onAction: onRunGapAnalysis || (() => onSelectTab("gaps")),
      isLoading: false,
      needsAttention: false,
    }
  } else if (pendingQuestions > 0) {
    actionInfo = {
      statusText: `${pendingQuestions} Question${pendingQuestions > 1 ? "s" : ""} Need Your Input`,
      description: "We need a few additional details before preparing your estimate.",
      actionLabel: "Review Questions",
      tab: "gaps",
      onAction: () => onSelectTab("gaps"),
      isLoading: false,
      needsAttention: true,
    }
  } else if (answeredQuestions > 0 && !isReadyForEstimation && !hasEstimate) {
    actionInfo = {
      statusText: "Answers Ready to Apply",
      description: "Your answers have been recorded. Update the scope to proceed to estimation.",
      actionLabel: "Update Scope",
      tab: "gaps",
      onAction: onApplyAnswers || (() => onSelectTab("gaps")),
      isLoading: false,
      needsAttention: false,
    }
  } else if (!hasEstimate) {
    actionInfo = {
      statusText: "Ready for Estimation",
      description: "All details clarified. Ready to generate your project estimate.",
      actionLabel: "Generate Estimate",
      tab: "estimation",
      onAction: onGenerateEstimate || (() => onSelectTab("estimation")),
      isLoading: isGeneratingEstimate,
      needsAttention: false,
    }
  } else {
    const isReportsActive = activeTab === "reports"
    actionInfo = {
      statusText: `Estimate Ready · ${estimateHours || 0} Total Hours`,
      description: isReportsActive
        ? "Your project estimate is ready. Review and download your deliverables below."
        : "Your project estimate is ready. Review the deliverables or download the Excel workbook.",
      actionLabel: isReportsActive ? "" : "View Deliverables",
      tab: "reports",
      onAction: () => onSelectTab("reports"),
      isLoading: false,
      needsAttention: false,
    }
  }

  // Exactly 5 production workflow stages
  const steps = [
    { id: "requirements", number: 1, title: "Requirements", isCompleted: step1Complete },
    { id: "analysis", number: 2, title: "AI Analysis", isCompleted: step2Complete },
    { id: "gaps", number: 3, title: "Gaps & Clarifications", isCompleted: step3Complete },
    { id: "estimation", number: 4, title: "Estimation", isCompleted: step4Complete },
    { id: "reports", number: 5, title: "Reports", isCompleted: step5Complete },
  ]

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] shadow-xs overflow-hidden">
      {/* 5-Stage Stepper Navigation Bar */}
      <div className="grid grid-cols-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f19] min-w-0">
        {steps.map((step) => {
          const isCurrent = currentStage === step.number
          const isTabActive = activeTab === step.id
          const isDone = step.isCompleted
          const hasAttention = step.id === "gaps" && (openCriticalGaps > 0 || pendingQuestions > 0) && !isDone

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectTab(step.id)}
              className={cn(
                "relative flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-1 sm:px-3 text-xs sm:text-[13px] font-medium transition-colors border-r border-slate-100 dark:border-slate-800 last:border-r-0 text-left focus:outline-none min-w-0",
                isTabActive
                  ? "bg-white dark:bg-[#0e1322] text-slate-900 dark:text-white font-semibold shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:bg-white/80 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {/* Active Tab Underline Indicator */}
              {isTabActive && (
                <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-indigo-600 dark:bg-indigo-500" />
              )}

              {/* Status Indicator Icon / Number */}
              <div
                className={cn(
                  "flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors shadow-2xs",
                  isDone
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                    : hasAttention
                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50"
                    : isCurrent
                    ? "bg-indigo-600 dark:bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-[#111625] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                ) : hasAttention ? (
                  <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                ) : (
                  step.number
                )}
              </div>

              {/* Step Title & State Label */}
              <div className="truncate hidden sm:block min-w-0">
                <span className="truncate block leading-tight text-xs sm:text-[13px]">{step.title}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Action Strip: "What is happening now?" & "What should user do next?" */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3.5 bg-white dark:bg-[#0e1322]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            {actionInfo.needsAttention ? (
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500" />
            ) : actionInfo.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            ) : (
              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-500" />
            )}
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
              {actionInfo.statusText}
            </span>
          </div>
          <span className="text-slate-300 dark:text-slate-700 hidden md:inline">•</span>
          <p className="text-xs sm:text-[13px] md:text-sm text-slate-500 dark:text-slate-400 truncate hidden md:inline font-normal">
            {actionInfo.description}
          </p>
        </div>

        {actionInfo.actionLabel ? (
          <Button
            size="sm"
            onClick={actionInfo.onAction}
            disabled={actionInfo.isLoading}
            className="shrink-0 w-full sm:w-auto h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs"
          >
            {actionInfo.isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <span>{actionInfo.actionLabel}</span>
            )}
            {!actionInfo.isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        ) : (
          <div className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800/50">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Deliverables Ready</span>
          </div>
        )}
      </div>
    </div>
  )
}
