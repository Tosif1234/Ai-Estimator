import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, CircleDashed, AlertCircle, SkipForward, ChevronDown, ChevronUp } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"

export interface Gap {
  id: string
  title: string
  description: string
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  status: "OPEN" | "RESOLVED"
  moduleName?: string
  impact?: string
}

import { Question, QuestionCard } from "./question-card"

interface GapCardProps {
  gap: Gap
  questions?: Question[]
  onAnswer?: (id: string, answer: string) => Promise<void>
  onSkip?: (id: string) => Promise<void>
}

import { cn } from "@/lib/utils"

export function GapCard({ gap, questions, onAnswer, onSkip }: GapCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const DEFAULT_VISIBLE_COUNT = 4

  const answered = questions?.filter(q => q.status === "ANSWERED").length || 0;
  const total = questions?.length || 0;
  const skipped = questions?.filter(q => q.status === "SKIPPED").length || 0;

  const allQuestions = questions ?? []
  const sortedQuestions = [...allQuestions].sort((a, b) => {
    const order: Record<string, number> = { PENDING: 0, ANSWERED: 1, SKIPPED: 2 }
    return (order[a.status] ?? 3) - (order[b.status] ?? 3)
  })

  const visibleQuestions = isExpanded ? sortedQuestions : sortedQuestions.slice(0, DEFAULT_VISIBLE_COUNT)
  const hasMore = sortedQuestions.length > DEFAULT_VISIBLE_COUNT

  return (
    <div className={cn(
      "rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-5 sm:p-7 shadow-xs transition-all space-y-5",
      gap.status === "RESOLVED" && "opacity-80 bg-slate-50/50 dark:bg-[#0b0f19]"
    )}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2.5">
            {gap.status === "RESOLVED" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : gap.priority === "CRITICAL" ? (
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            ) : (
              <CircleDashed className="h-5 w-5 text-slate-400 dark:text-slate-500 shrink-0" />
            )}
            <h3 className="text-[15px] sm:text-[16px] lg:text-[17px] font-semibold text-slate-900 dark:text-white leading-snug">{gap.title}</h3>
          </div>
          {gap.moduleName && (
            <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {gap.moduleName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={gap.priority} />
          {gap.status === "RESOLVED" ? (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">RESOLVED</span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">OPEN</span>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs sm:text-[13px] md:text-sm text-slate-600 dark:text-slate-400 mb-3.5 leading-relaxed font-normal">{gap.description}</p>
        
        {gap.impact && (
          <div className="bg-slate-50/80 dark:bg-[#111625] p-3.5 rounded-xl text-xs sm:text-[13px] border border-slate-200/80 dark:border-slate-800 mb-4">
            <span className="font-medium block mb-0.5 text-slate-900 dark:text-white">What&apos;s missing (Impact on estimation):</span>
            <span className="text-slate-600 dark:text-slate-400 leading-relaxed font-normal">{gap.impact}</span>
          </div>
        )}

        {sortedQuestions.length > 0 && (
          <div className="mt-4 space-y-3.5">
            {/* Header with progress */}
            <div className="flex items-center justify-between text-xs sm:text-[13px] border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Clarification Questions</span>
              <div className="flex items-center gap-3 text-xs font-normal text-slate-500 dark:text-slate-400">
                <span>{answered} / {total} answered</span>
                {skipped > 0 && (
                  <span className="flex items-center gap-1">
                    <SkipForward className="h-3.5 w-3.5" />
                    {skipped} skipped
                  </span>
                )}
              </div>
            </div>

            {/* Questions list - Default first 4 items */}
            <div className="space-y-4">
              {visibleQuestions.map(q => (
                <QuestionCard key={q.id} question={q} onAnswer={onAnswer!} onSkip={onSkip!} />
              ))}

              {/* Show More / Show Less Toggle Button */}
              {hasMore && (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full h-10 px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 bg-white dark:bg-[#0e1322] flex items-center justify-center gap-2 shadow-2xs transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        <span>Show Less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        <span>See More Questions ({sortedQuestions.length - DEFAULT_VISIBLE_COUNT} remaining)</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
