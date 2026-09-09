"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, ChevronUp, Loader2, Layers, CheckSquare } from "lucide-react"
import { apiClient } from "@/lib/api/apiClient"
import { cn } from "@/lib/utils"
import { swalToast } from "@/lib/swal"

export interface EstimateItem {
  id: string
  moduleName: string
  featureName: string
  hours: number
  description?: string | null
  category?: string | null
  complexity?: string | null
}

interface Subtask {
  id: string
  name: string
  description: string
  hours: number
}

interface EstimateSummaryProps {
  version: number
  totalHours: number
  items: EstimateItem[]
  createdAt: string
  projectId: string
}

export interface EstimateExecutiveCardProps {
  version: number
  totalHours: number
  items: EstimateItem[]
  createdAt: string | Date
}

export function EstimateExecutiveCard({ version, totalHours, items, createdAt }: EstimateExecutiveCardProps) {
  const modules = React.useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.moduleName]) {
        acc[item.moduleName] = { hours: 0, features: [] }
      }
      acc[item.moduleName].hours += item.hours
      acc[item.moduleName].features.push(item)
      return acc
    }, {} as Record<string, { hours: number; features: EstimateItem[] }>)
  }, [items])

  const moduleEntries = React.useMemo(() => {
    return Object.entries(modules).sort((a, b) => b[1].hours - a[1].hours)
  }, [modules])

  const palette = [
    "bg-primary",
    "bg-emerald-600 dark:bg-emerald-500",
    "bg-amber-600 dark:bg-amber-500",
    "bg-sky-600 dark:bg-sky-500",
    "bg-violet-600 dark:bg-violet-500",
    "bg-rose-600 dark:bg-rose-500",
    "bg-slate-600 dark:bg-slate-400",
  ]

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] shadow-xs overflow-hidden h-full flex flex-col justify-between">
      <div>
        <div className="border-b border-slate-100 dark:border-slate-800 bg-[#f8fbff]/70 dark:bg-[#0b0f19] px-6 sm:px-7 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">Engineering Deliverable</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50">
                Version {version}
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
              Generated {new Date(createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-4 sm:gap-7 self-start sm:self-auto flex-wrap">
            <div>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Modules</p>
              <p className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white font-mono">{moduleEntries.length}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Features</p>
              <p className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white font-mono">{items.length}</p>
            </div>
            <div className="border-l border-slate-200 dark:border-slate-800 pl-4 sm:pl-7">
              <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Effort</p>
              <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">{totalHours} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">hrs</span></p>
            </div>
          </div>
        </div>

        {totalHours > 0 && (
          <div className="p-5 sm:p-6 space-y-3.5">
            <div className="flex justify-between text-xs sm:text-[13px] text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">Effort Distribution Across Modules</span>
              <span className="font-normal">{items.length} work items scoped</span>
            </div>
            
            {/* Segmented bar */}
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              {moduleEntries.map(([modName, modData], idx) => {
                const pct = (modData.hours / totalHours) * 100
                return (
                  <div
                    key={modName}
                    title={`${modName}: ${modData.hours} hrs (${Math.round(pct)}%)`}
                    style={{ width: `${pct}%` }}
                    className={cn(palette[idx % palette.length], "h-full transition-all")}
                  />
                )
              })}
            </div>

            {/* Legend chips */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
              {moduleEntries.map(([modName, modData], idx) => {
                const pct = Math.round((modData.hours / totalHours) * 100)
                return (
                  <div key={modName} className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400">
                    <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", palette[idx % palette.length])} />
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[160px]">{modName}</span>
                    <span className="text-slate-400 dark:text-slate-500 font-normal">({modData.hours}h · {pct}%)</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FeatureTableRow({ 
  feature, 
  projectId,
  isLast 
}: { 
  feature: EstimateItem
  projectId?: string
  isLast: boolean
}) {
  const [expanded, setExpanded] = React.useState(false)
  const [subtasks, setSubtasks] = React.useState<Subtask[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleToggle = async () => {
    if (!projectId) return
    const next = !expanded
    setExpanded(next)
    if (next && subtasks === null) {
      setLoading(true)
      setError(null)
      try {
        const data = await apiClient.post(
          `/projects/${projectId}/estimate-items/${feature.id}/subtasks`,
        ) as Subtask[]
        setSubtasks(data)
      } catch {
        setError("Failed to load subtasks.")
        swalToast.error("Failed to load subtasks.")
        setExpanded(false)
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <>
      <tr 
        onClick={handleToggle}
        className={cn(
          "group hover:bg-muted/30 transition-colors cursor-pointer text-xs sm:text-sm",
          !isLast && "border-b border-border/60",
          expanded && "bg-muted/15"
        )}
      >
        <td className="py-3 px-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground leading-snug">
                {feature.featureName}
              </div>
              {feature.description && (
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">
                  {feature.description}
                </p>
              )}
            </div>
          </div>
        </td>

        <td className="py-3 px-3 text-left whitespace-nowrap">
          {feature.category ? (
            <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
              {feature.category}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </td>

        <td className="py-3 px-3 text-left whitespace-nowrap">
          {feature.complexity ? (
            <span className={cn(
              "inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-md border",
              feature.complexity === "HIGH" 
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                : feature.complexity === "LOW"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                : "bg-muted text-muted-foreground border-border"
            )}>
              {feature.complexity}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </td>

        <td className="py-3 px-4 text-right font-mono font-semibold text-foreground whitespace-nowrap">
          {feature.hours} <span className="text-[11px] font-normal text-muted-foreground">hrs</span>
        </td>
      </tr>

      {/* Expanded subtasks row */}
      {expanded && !loading && (
        <tr className="bg-muted/10 border-b border-border/80">
          <td colSpan={4} className="py-3 px-4 sm:px-8">
            <div className="rounded-md border border-border bg-card p-3 space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-border pb-1.5">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-primary" />
                  Engineering Subtasks Breakdown
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Subtask Total: {subtasks?.reduce((s, t) => s + t.hours, 0) ?? 0} hrs
                </span>
              </div>

              {error && (
                <div className="p-2 text-xs text-destructive">
                  {error}
                </div>
              )}

              {subtasks && subtasks.length > 0 ? (
                <div className="divide-y divide-border/50 text-xs">
                  {subtasks.map((st, idx) => (
                    <div key={st.id ?? idx} className="py-1.5 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-foreground">{st.name}</span>
                        {st.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{st.description}</p>
                        )}
                      </div>
                      <span className="font-mono text-xs text-muted-foreground shrink-0 font-medium">
                        {st.hours} h
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic py-1">No discrete subtasks recorded.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export interface EstimateBreakdownListProps {
  items: EstimateItem[]
  totalHours: number
  projectId?: string
}

function ModuleCard({
  moduleName,
  moduleData,
  totalHours,
  projectId
}: {
  moduleName: string
  moduleData: { hours: number; features: EstimateItem[] }
  totalHours: number
  projectId?: string
}) {
  const modPct = totalHours > 0 ? Math.round((moduleData.hours / totalHours) * 100) : 0

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] shadow-xs overflow-hidden">
      {/* Module sub-header strip */}
      <div className="bg-slate-50/80 dark:bg-[#0b0f19] px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white">{moduleName}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            ({moduleData.features.length} {moduleData.features.length === 1 ? "feature" : "features"} · {modPct}%)
          </span>
        </div>
        <div className="font-mono text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-[#111625] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
          {moduleData.hours} hrs
        </div>
      </div>

      {/* Table of features */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-[#0b0f19] text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-5 sm:px-6 font-medium">Feature / Work Item</th>
              <th className="py-3 px-4 font-medium w-32 text-left">Category</th>
              <th className="py-3 px-4 font-medium w-32 text-left">Complexity</th>
              <th className="py-3 px-5 sm:px-6 font-medium w-28 text-right">Effort</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {moduleData.features.map((feature, idx) => (
              <FeatureTableRow
                key={feature.id}
                feature={feature}
                projectId={projectId}
                isLast={idx === moduleData.features.length - 1}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function EstimateBreakdownList({ items, totalHours, projectId }: EstimateBreakdownListProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const DEFAULT_VISIBLE_MODULES = 2

  const modules = React.useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.moduleName]) {
        acc[item.moduleName] = { hours: 0, features: [] }
      }
      acc[item.moduleName].hours += item.hours
      acc[item.moduleName].features.push(item)
      return acc
    }, {} as Record<string, { hours: number; features: EstimateItem[] }>)
  }, [items])

  const moduleEntries = React.useMemo(() => {
    return Object.entries(modules).sort((a, b) => b[1].hours - a[1].hours)
  }, [modules])

  const visibleModules = isExpanded ? moduleEntries : moduleEntries.slice(0, DEFAULT_VISIBLE_MODULES)
  const hasMoreModules = moduleEntries.length > DEFAULT_VISIBLE_MODULES

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-[18px] sm:text-[20px] lg:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.25]">Itemized Engineering Work Breakdown</h2>
          <p className="text-[13px] sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Click any feature row to inspect technical subtasks and effort calibration</p>
        </div>
        <span className="text-xs sm:text-[13px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
          {items.length} scoped items · {totalHours} total hrs
        </span>
      </div>

      <div className="space-y-5">
        {visibleModules.map(([moduleName, moduleData]) => (
          <ModuleCard
            key={moduleName}
            moduleName={moduleName}
            moduleData={moduleData}
            totalHours={totalHours}
            projectId={projectId}
          />
        ))}

        {/* Toggle button if more than 2 module cards */}
        {hasMoreModules && (
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full h-11 px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 bg-white dark:bg-[#0e1322] flex items-center justify-center gap-2 shadow-2xs transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Show Less</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span>See More ({moduleEntries.length - DEFAULT_VISIBLE_MODULES} remaining)</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export function EstimateSummary({ version, totalHours, items, createdAt, projectId }: EstimateSummaryProps) {
  return (
    <div className="space-y-6">
      <EstimateExecutiveCard
        version={version}
        totalHours={totalHours}
        items={items}
        createdAt={createdAt}
      />
      <EstimateBreakdownList
        items={items}
        totalHours={totalHours}
        projectId={projectId}
      />
    </div>
  )
}
