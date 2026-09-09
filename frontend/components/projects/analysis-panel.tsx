"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  CheckCircle2, 
  Layers, 
  Users, 
  Monitor, 
  ExternalLink, 
  AlertCircle,
  ArrowRight,
  ShieldCheck
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface AnalysisData {
  projectType?: string
  platforms?: string[]
  actors?: string[]
  modules?: {
    name: string
    features: string[]
  }[]
  integrations?: string[]
  assumptions?: string[]
}

interface AnalysisPanelProps {
  analysis: AnalysisData
  onProceedToGaps?: () => void
}

export function AnalysisPanel({ 
  analysis,
  onProceedToGaps
}: AnalysisPanelProps) {
  if (!analysis) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">No architectural analysis data available for this project yet.</p>
      </div>
    )
  }

  const totalFeatures = analysis.modules?.reduce((acc, m) => acc + (m.features?.length || 0), 0) || 0

  return (
    <div className="space-y-6">
      {/* 1. Architecture Overview Header */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Technical Decomposition
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Verified Scope
            </span>
          </div>
          <h2 className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white">
            System Architecture &amp; Modular Breakdown
          </h2>
          <p className="text-[13px] sm:text-sm text-slate-500 dark:text-slate-400 font-normal">
            {analysis.modules?.length || 0} Functional Modules · {totalFeatures} Scoped Features · {analysis.actors?.length || 0} User Personas Identified
          </p>
        </div>

        {onProceedToGaps && (
          <Button 
            size="sm" 
            onClick={onProceedToGaps} 
            className="shrink-0 self-start sm:self-auto h-10 sm:h-11 px-4 sm:px-5 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs"
          >
            Review Gaps &amp; Questions
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 2. Platform Archetype & User Personas (Clean 2-Column Grid) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Platform Archetype */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-[15px] sm:text-base">
            <Monitor className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            <span>Platform &amp; System Archetype</span>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Project Classification</p>
              <div className="text-sm font-medium px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#111625] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800">
                {analysis.projectType || "Modular Web Application (Standard Architecture)"}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Target Environments</p>
              <div className="flex flex-wrap gap-2">
                {analysis.platforms?.length ? (
                  analysis.platforms.map((p, i) => (
                    <span 
                      key={i} 
                      className="text-xs sm:text-[13px] font-medium px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50"
                    >
                      {p}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400 dark:text-slate-500 italic font-normal">Not specified in requirements</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Roles & Personas */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-[15px] sm:text-base">
            <Users className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            <span>User Personas &amp; Access Roles</span>
          </div>
          <div>
            {analysis.actors?.length ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {analysis.actors.map((actor, i) => (
                  <span 
                    key={i} 
                    className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-medium px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#111625] text-slate-800 dark:text-slate-200"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                    <span>{actor}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic pt-2 font-normal">No distinct user roles identified in specifications.</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Functional Modules & Feature Inventory */}
      {analysis.modules && analysis.modules.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-[15px] sm:text-base">
              <Layers className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
              <span>Identified Modules &amp; Feature Inventory</span>
            </div>
            <span className="text-xs sm:text-[13px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-lg">
              {analysis.modules.length} Functional Modules
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {analysis.modules.map((mod, i) => {
              const isOptionalModule = /\b(optional|future|phase|out of scope)\b/i.test(mod.name)

              return (
                <div 
                  key={i} 
                  className={cn(
                    "rounded-xl border p-4 space-y-2.5 transition-colors",
                    isOptionalModule 
                      ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20" 
                      : "border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#111625]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm sm:text-[15px] text-slate-900 dark:text-white truncate">
                      {mod.name}
                    </h3>
                    <span className={cn(
                      "text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0",
                      isOptionalModule 
                        ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50" 
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    )}>
                      {mod.features.length} feature{mod.features.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-200/60 dark:border-slate-800 pt-2.5">
                    {mod.features.map((feature, j) => (
                      <div key={j} className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 flex items-start gap-2 leading-relaxed">
                        <span className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5">•</span>
                        <span className="text-slate-700 dark:text-slate-300 font-normal">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 4. External Integrations & Scope Assumptions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Integrations */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-[15px] sm:text-base">
            <ExternalLink className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            <span>External Integrations &amp; Connectors</span>
          </div>
          <div>
            {analysis.integrations && analysis.integrations.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {analysis.integrations.map((item, i) => (
                  <span 
                    key={i} 
                    className="text-xs sm:text-[13px] font-medium px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#111625] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic font-normal">No external integrations or APIs specified in base requirements.</p>
            )}
          </div>
        </div>

        {/* Assumptions */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-[15px] sm:text-base">
            <ShieldCheck className="h-4.5 w-4.5 text-indigo-600 dark:text-indigo-400" />
            <span>Scope Assumptions &amp; Compliance Notes</span>
          </div>
          <div>
            {analysis.assumptions && analysis.assumptions.length > 0 ? (
              <ul className="space-y-2 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 pt-1">
                {analysis.assumptions.map((assumption, i) => (
                  <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">•</span>
                    <span className="text-slate-700 dark:text-slate-300 font-normal">{assumption}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic font-normal">Standard web architecture assumptions apply.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
