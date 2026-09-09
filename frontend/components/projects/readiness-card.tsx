import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calculator, AlertTriangle, CheckCircle, ArrowRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReadinessProps {
  score: number // 0-100
  status: "READY_FOR_ESTIMATION" | "NEEDS_CLARIFICATION" | "ESTIMATED" | "NOT_STARTED"
  criticalGaps: number
  highGaps: number
  openQuestions: number
  onGenerateEstimate?: () => void
  onViewReports?: () => void
  isGenerating?: boolean
}

export function ReadinessCard({ 
  score, 
  status, 
  criticalGaps, 
  highGaps, 
  openQuestions,
  onGenerateEstimate,
  onViewReports,
  isGenerating = false
}: ReadinessProps) {
  const isReady = status === "READY_FOR_ESTIMATION" || status === "ESTIMATED"
  const isBlocked = (criticalGaps ?? 0) > 0

  return (
    <div className={cn(
      "rounded-2xl border bg-white dark:bg-[#0e1322] p-6 sm:p-7 shadow-xs transition-all h-full flex flex-col justify-between space-y-6",
      isReady ? "border-emerald-200 dark:border-emerald-800/60" : isBlocked ? "border-red-200 dark:border-red-800/60" : "border-slate-200/90 dark:border-slate-800"
    )}>
      <div className="space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-white">Requirement Readiness</h3>
              <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Scored against completeness rules</p>
            </div>
            <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-slate-900 dark:text-white">{Math.round(score)}%</div>
          </div>
          
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isReady ? "bg-emerald-600" : isBlocked ? "bg-red-500" : "bg-indigo-600 dark:bg-indigo-500"
              )} 
              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs sm:text-[13px]">
            <span className="font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px]">Readiness State</span>
            {isReady ? (
              <span className="inline-flex items-center gap-1.5 font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                <CheckCircle className="w-3.5 h-3.5" />
                {status === "ESTIMATED" ? "Estimate Generated" : "Ready for Estimation"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                <AlertTriangle className="w-3.5 h-3.5" />
                {status === "NOT_STARTED" ? "Not Started" : "Needs Clarification"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
            <div className="bg-red-50/70 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 rounded-xl p-2.5 sm:p-3">
              <div className="text-lg sm:text-xl font-mono font-bold text-red-600 dark:text-red-400">{criticalGaps ?? 0}</div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">Critical Gaps</div>
            </div>
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 rounded-xl p-2.5 sm:p-3">
              <div className="text-lg sm:text-xl font-mono font-bold text-amber-600 dark:text-amber-400">{highGaps ?? 0}</div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">High Gaps</div>
            </div>
            <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-2.5 sm:p-3">
              <div className="text-lg sm:text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400">{openQuestions ?? 0}</div>
              <div className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">Open Questions</div>
            </div>
          </div>

          {isBlocked && (
            <div className="rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/40 p-3 text-xs sm:text-[13px] text-red-700 dark:text-red-300 flex items-start gap-2.5 leading-relaxed font-normal">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
              <span>Estimation is blocked because {criticalGaps ?? 0} critical requirement gaps remain unresolved.</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-2">
        {status === "ESTIMATED" ? (
          <Button 
            type="button"
            className="w-full h-11 rounded-xl font-semibold shadow-xs text-sm bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
            onClick={onViewReports}
          >
            <span>View Deliverable Reports</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            type="button"
            className="w-full h-11 rounded-xl font-semibold shadow-xs text-sm bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 cursor-pointer" 
            disabled={!isReady || isGenerating}
            onClick={onGenerateEstimate}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Generating Estimate...</span>
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                <span>Generate Engineering Estimate</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
