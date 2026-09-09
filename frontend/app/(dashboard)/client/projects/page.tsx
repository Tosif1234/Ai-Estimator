"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { 
  Plus, 
  ArrowRight, 
  Check, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Loader2, 
  ExternalLink,
  FolderKanban,
  Clock, 
  Sparkles, 
  FileText,
  Calendar,
  Download,
  Share2,
  FileCode,
  Layers,
  Headphones,
  MessageSquare,
  Compass,
  CheckCircle2,
  AlertCircle,
  Code2
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { apiClient } from "@/lib/api/apiClient"
import { cn } from "@/lib/utils"
import { swalToast, swalConfirm } from "@/lib/swal"
import { useAuth } from "@/components/providers/auth-provider"
import { ClientWelcomeLanding } from "@/components/client/client-welcome-landing"

interface Project {
  id: string
  name: string
  description?: string | null
  status: string
  createdAt?: string
  updatedAt?: string
  requirements?: Array<{
    id?: string
    completenessScore?: number
    rawText?: string
    gaps?: Array<{ priority: string; status: string }>
  }>
  estimates?: Array<{
    id?: string
    totalHours?: number
    version?: number
    createdAt?: string
    items?: Array<{ id: string }>
  }>
}

interface StageInfo {
  stageName: string
  stageIndex: number // 1 to 5
  statusLabel: string
  statusType: "ready" | "clarification" | "analysis" | "estimation" | "default"
  phaseTitle: string
  attentionText: string
  actionLabel: string
  tab: string
  progressPercent: number
}

function getClientProjectStage(project: Project): StageInfo {
  const status = project.status
  const req = project.requirements?.[0]
  const openGaps = req?.gaps?.filter(g => g.status === "OPEN") ?? []
  const openGapsCount = openGaps.length

  switch (status) {
    case "NEEDS_CLARIFICATION":
      return {
        stageName: "Gaps & Clarifications",
        stageIndex: 3,
        statusLabel: "Awaiting clarification",
        statusType: "clarification",
        phaseTitle: "Clarification Phase",
        attentionText: openGapsCount > 0 
          ? `We need answers for ${openGapsCount} clarification question${openGapsCount === 1 ? '' : 's'} to finalize technical architecture.`
          : "We need a few additional details before we can prepare your project estimate.",
        actionLabel: "Review Questions",
        tab: "gaps",
        progressPercent: 60,
      }
    case "READY_FOR_ESTIMATION":
      return {
        stageName: "Estimation",
        stageIndex: 4,
        statusLabel: "Ready for estimation",
        statusType: "estimation",
        phaseTitle: "Estimation Sizing Phase",
        attentionText: "Requirements and architecture parameters are verified. Ready to generate sprint-by-sprint estimation.",
        actionLabel: "Generate Estimate",
        tab: "estimation",
        progressPercent: 80,
      }
    case "ESTIMATED":
      return {
        stageName: "Reports",
        stageIndex: 5,
        statusLabel: "Estimate Ready",
        statusType: "ready",
        phaseTitle: "Final Milestone Phase",
        attentionText: "Your engineering estimate, architecture specifications, and delivery milestones are ready for executive review.",
        actionLabel: "View Deliverables & Scope",
        tab: "reports",
        progressPercent: 100,
      }
    case "COMPLETED":
      return {
        stageName: "Reports",
        stageIndex: 5,
        statusLabel: "Estimate Ready",
        statusType: "ready",
        phaseTitle: "Project Finalized",
        attentionText: "All project deliverables, engineering blueprints, and execution scopes are finalized.",
        actionLabel: "View Deliverables & Scope",
        tab: "reports",
        progressPercent: 100,
      }
    case "DRAFT":
    default:
      if (req?.rawText && req.rawText.trim().length > 0) {
        return {
          stageName: "AI Analysis",
          stageIndex: 2,
          statusLabel: "In analysis",
          statusType: "analysis",
          phaseTitle: "AI Analysis Phase",
          attentionText: "Your requirements are uploaded and technical stack components are being mapped.",
          actionLabel: "Continue Analysis",
          tab: "analysis",
          progressPercent: 40,
        }
      }
      return {
        stageName: "Requirements",
        stageIndex: 1,
        statusLabel: "Requirements needed",
        statusType: "default",
        phaseTitle: "Requirements Definition",
        attentionText: "Describe your software concept, features, or upload a PRD to begin automated architectural scoping.",
        actionLabel: "Add Requirements",
        tab: "requirements",
        progressPercent: 20,
      }
  }
}

const WORKFLOW_STAGES = [
  { step: 1, name: "1. Requirements", subtitle: "Brief & User Stories" },
  { step: 2, name: "2. AI Analysis", subtitle: "Tech Stack & Vector Models" },
  { step: 3, name: "3. Gaps & Clarifications", subtitle: "Architectural Q&A" },
  { step: 4, name: "4. Estimation", subtitle: "Sprint Model & Pod Sizing" },
  { step: 5, name: "5. Reports", subtitle: "Engineering Blueprint" },
]

function getDynamicChecklist(stage: StageInfo, project: Project) {
  const req = project.requirements?.[0]
  const openGapsCount = req?.gaps?.filter(g => g.status === "OPEN")?.length ?? 0
  const estimate = project.estimates?.[0]

  switch (stage.stageIndex) {
    case 5:
      return [
        { text: `Complete engineering breakdown ready with ${estimate?.totalHours ?? 0} estimated hours.` },
        { text: "Structured 2-sheet Excel workbook (Base Web Estimation & Optional Add-ons) generated." },
        { text: "Technical architecture specifications and milestone delivery roadmap available." },
      ]
    case 4:
      return [
        { text: "Functional requirements and architectural constraints verified." },
        { text: "AI estimation ready to compute developer hours, pod sizing, and sprint schedule." },
        { text: "Generates multi-sheet scope breakdown with contingency calibration." },
      ]
    case 3:
      return [
        { text: openGapsCount > 0 ? `${openGapsCount} architectural clarification question${openGapsCount === 1 ? '' : 's'} require your response.` : "Scope clarification questions require response." },
        { text: "Clarifying ambiguities protects against scope creep and ensures budget precision." },
        { text: "Once submitted, the AI estimation engine automatically unlocks." },
      ]
    case 2:
      return [
        { text: "AI engine processes requirements text and functional specifications." },
        { text: "Maps recommended technology stack, backend APIs, and integration touchpoints." },
        { text: "Scans for missing edge cases and prepares architectural clarification items." },
      ]
    case 1:
    default:
      return [
        { text: "Enter your project description or upload software specification documents." },
        { text: "AI extracts core user roles, functional modules, and acceptance criteria." },
        { text: "Generates real-time requirement completeness score and architectural baseline." },
      ]
  }
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "Recently"
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 60) return `${Math.max(1, diffMins)} mins ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 30) return `${diffDays} days ago`
    return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } catch {
    return "Recently"
  }
}

export default function ClientProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterParam = searchParams.get("filter")
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [showWelcomeGuide, setShowWelcomeGuide] = React.useState(false)
  
  const [editingProject, setEditingProject] = React.useState<Project | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editDescription, setEditDescription] = React.useState("")

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [createName, setCreateName] = React.useState("")
  const [createDescription, setCreateDescription] = React.useState("")

  const [isScheduleModalOpen, setIsScheduleModalOpen] = React.useState(false)
  const [isMessageLeadOpen, setIsMessageLeadOpen] = React.useState(false)
  const [messageText, setMessageText] = React.useState("")

  const handleStartWithArchetype = (initialData?: { name: string; description?: string }) => {
    if (initialData) {
      setCreateName(initialData.name)
      setCreateDescription(initialData.description || "")
    } else {
      setCreateName("")
      setCreateDescription("")
    }
    setIsCreateOpen(true)
  }

  const { data: rawProjects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      return await apiClient.get("/projects") as Project[]
    },
  })

  // Apply optional filtering from top navigation tabs
  const projects = React.useMemo(() => {
    if (!rawProjects) return []
    if (filterParam === "needs_action") {
      return rawProjects.filter(p => p.status === "NEEDS_CLARIFICATION" || p.status === "READY_FOR_ESTIMATION" || p.status === "DRAFT")
    }
    if (filterParam === "ready") {
      return rawProjects.filter(p => p.status === "ESTIMATED" || p.status === "COMPLETED")
    }
    return rawProjects
  }, [rawProjects, filterParam])

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return await apiClient.post("/projects", data) as { id: string }
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setIsCreateOpen(false)
      setCreateName("")
      setCreateDescription("")
      swalToast.success("Project workspace created successfully!")
      router.push(`/client/projects/${project.id}?tab=requirements`)
    },
    onError: (err: Error) => {
      swalToast.error(err.message || "Failed to create project")
    }
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) return
    createMutation.mutate({
      name: createName.trim(),
      description: createDescription.trim() || undefined,
    })
  }

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Record<string, unknown> }) => {
      return await apiClient.patch(`/projects/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setEditingProject(null)
      swalToast.success("Project updated successfully")
    },
    onError: (err: Error) => {
      swalToast.error(err.message || "Failed to update project")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiClient.delete(`/projects/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      swalToast.success("Project deleted successfully")
    },
    onError: (err: Error) => {
      swalToast.error(err.message || "Failed to delete project")
    }
  })

  const handleEditOpen = (e: React.MouseEvent, project: Project) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingProject(project)
    setEditName(project.name)
    setEditDescription(project.description || "")
  }

  const handleDeleteOpen = async (e: React.MouseEvent, project: Project) => {
    e.preventDefault()
    e.stopPropagation()
    const confirmed = await swalConfirm({
      title: "Delete Project",
      text: `Are you sure you want to permanently delete "${project.name}"? This action cannot be undone.`,
      confirmText: "Delete Project",
      isDestructive: true
    })
    if (confirmed) {
      deleteMutation.mutate(project.id)
    }
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return
    updateMutation.mutate({
      id: editingProject.id,
      data: { name: editName, description: editDescription }
    })
  }

  // Real CSV Export of Portfolio
  const handleExportSummary = () => {
    if (!projects || projects.length === 0) {
      swalToast.info("No projects available to export.")
      return
    }

    const headers = ["Project ID", "Project Name", "Workflow Status", "Current Stage", "Estimated Hours", "Last Updated"]
    const rows = projects.map(p => {
      const stage = getClientProjectStage(p)
      const hours = p.estimates?.[0]?.totalHours ?? 0
      const dateStr = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "")
      return [
        `"PRJ-${p.id.slice(-6).toUpperCase()}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.status}"`,
        `"${stage.stageName}"`,
        hours,
        `"${dateStr}"`
      ]
    })

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `ai-estimator-portfolio-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    swalToast.success("Portfolio summary report downloaded (.csv)")
  }

  // Split into Featured Active Project and Other Projects
  const { featuredProject, secondaryProjects } = React.useMemo(() => {
    if (!projects || projects.length === 0) {
      return { featuredProject: null, secondaryProjects: [] }
    }

    // Identify active or most ready project for top hero focus
    const readyIdx = projects.findIndex(p => p.status === "ESTIMATED" || p.status === "COMPLETED")
    const actionIdx = projects.findIndex(p => p.status === "NEEDS_CLARIFICATION" || p.status === "READY_FOR_ESTIMATION")
    
    const targetIdx = readyIdx !== -1 ? readyIdx : actionIdx !== -1 ? actionIdx : 0
    const featured = projects[targetIdx]
    const others = projects.filter((_, idx) => idx !== targetIdx)

    return { featuredProject: featured, secondaryProjects: others }
  }, [projects])

  const isLandingView = !featuredProject || showWelcomeGuide

  return (
    <div className="space-y-12 sm:space-y-14">
      
      {/* 1. TOP SUB-HEADER / HERO BAR (Shown only when in Projects Dashboard View) */}
      {!isLandingView ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {/* Breadcrumb Label */}
            <div className="flex items-center gap-2 text-[11px] font-medium tracking-wider uppercase text-slate-500 dark:text-slate-400 mb-1">
              <span>CLIENT ESTIMATION WORKSPACE</span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-indigo-500" />
              <span className="text-blue-600 dark:text-indigo-400">Active Portfolio</span>
            </div>

            <h1 className="text-[24px] sm:text-[28px] lg:text-[30px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.2]">
              My Projects
            </h1>
            <p className="mt-1 text-[14px] sm:text-[15px] text-slate-500 dark:text-slate-400 font-normal">
              Continue where you left off in your project workspace.
            </p>
          </div>

          {/* Top Right Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWelcomeGuide(true)}
              className="h-10 sm:h-11 px-3.5 sm:px-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0e1322] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-2xs"
              title="View scoping methodology and 1-click project templates"
            >
              <Compass className="mr-2 h-4 w-4 text-blue-600 dark:text-indigo-400" />
              Scoping Guide
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsScheduleModalOpen(true)}
              className="h-10 sm:h-11 px-3.5 sm:px-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0e1322] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-2xs"
            >
              <Calendar className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              Schedule Review
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSummary}
              className="h-10 sm:h-11 px-3.5 sm:px-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#0e1322] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-2xs"
            >
              <Download className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
              Export Summary
            </Button>

            <Button
              onClick={() => handleStartWithArchetype()}
              size="sm"
              className="h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-all"
            >
              <Plus className="mr-2 h-4 w-4 stroke-[2.5]" />
              Start New Project
            </Button>
          </div>
        </div>
      ) : (
        featuredProject && (
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowWelcomeGuide(false)}
              className="text-sm font-semibold text-blue-600 dark:text-indigo-400 hover:text-blue-700 dark:hover:text-indigo-300 flex items-center gap-2 transition-colors"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              <span>Back to My Projects Dashboard</span>
            </button>
            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">Scoping Methodology &amp; Templates</span>
          </div>
        )
      )}

      {isLoading ? (
        <div className="space-y-8">
          <div className="h-96 animate-pulse rounded-3xl bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-slate-800" />
          <div className="grid gap-7 sm:grid-cols-2">
            <div className="h-56 animate-pulse rounded-3xl bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-slate-800" />
            <div className="h-56 animate-pulse rounded-3xl bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-slate-800" />
          </div>
        </div>
      ) : isLandingView || !featuredProject ? (
        <ClientWelcomeLanding
          userName={user?.name || undefined}
          activeProjectsCount={projects?.length || 0}
          readyEstimatesCount={projects?.filter(p => p.status === "ESTIMATED" || p.status === "COMPLETED").length || 0}
          activeProject={featuredProject}
          onStartProject={handleStartWithArchetype}
          onScheduleReview={() => setIsScheduleModalOpen(true)}
          onContactArchitect={() => setIsMessageLeadOpen(true)}
        />
      ) : (
        <div className="space-y-14">

          {/* 2. FEATURED CURRENT PROJECT CARD (Large Dominant Hero Card) */}
          {(() => {
            if (!featuredProject) return null
            const stage = getClientProjectStage(featuredProject)
            const estimate = featuredProject.estimates?.[0]
            const totalHours = estimate?.totalHours ?? 0
            const estBudgetMin = totalHours > 0 ? totalHours * 50 : 0
            const estBudgetMax = totalHours > 0 ? totalHours * 65 : 0
            const estSprints = totalHours > 0 ? Math.max(1, Math.ceil(totalHours / 80)) : 0
            const estWeeks = totalHours > 0 ? Math.max(1, Math.ceil(totalHours / 40)) : 0
            const checklist = getDynamicChecklist(stage, featuredProject)
            const req = featuredProject.requirements?.[0]
            const completeness = req?.completenessScore ?? (stage.stageIndex >= 4 ? 92 : stage.stageIndex === 3 ? 65 : 30)
            const projectCode = `#PRJ-${featuredProject.id.slice(-4).toUpperCase()}`

            return (
              <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-6 sm:p-8 lg:p-9 shadow-sm transition-all">
                
                {/* Top Metadata Strip */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={cn(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-[13px] font-medium",
                      stage.statusType === "ready" 
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50" 
                        : stage.statusType === "clarification"
                        ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50"
                        : "bg-blue-50 dark:bg-indigo-950/60 text-blue-700 dark:text-indigo-300 border border-blue-200 dark:border-indigo-800/50"
                    )}>
                      <span className={cn(
                        "h-2 w-2 rounded-full",
                        stage.statusType === "ready" ? "bg-emerald-500" : stage.statusType === "clarification" ? "bg-purple-500" : "bg-blue-500 dark:bg-indigo-400"
                      )} />
                      {stage.statusLabel}
                    </span>

                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {projectCode}
                    </span>

                    <span className="text-slate-300 dark:text-slate-700">•</span>

                    <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-normal">
                      <Clock className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <span>Updated {formatRelativeTime(featuredProject.updatedAt || featuredProject.createdAt)}</span>
                    </div>
                  </div>

                  {/* Top Right Card Actions */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.href)
                          swalToast.success("Project workspace link copied to clipboard!")
                        }
                      }}
                      className="h-9 px-3.5 text-xs sm:text-[13px] font-medium text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-[#151b2c]"
                    >
                      <Share2 className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                      Share
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/client/projects/${featuredProject.id}?tab=reports`)}
                      className="h-9 px-3.5 text-xs sm:text-[13px] font-medium text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-[#151b2c]"
                    >
                      <FileCode className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                      {stage.stageIndex >= 5 ? "Scope PDF" : "Workspace"}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl"
                        >
                          <MoreVertical className="h-4.5 w-4.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="dark:bg-[#0e1322] dark:border-slate-800">
                        <DropdownMenuItem onClick={() => router.push(`/client/projects/${featuredProject.id}?tab=${stage.tab}`)} className="dark:text-slate-200 dark:hover:bg-slate-800">
                          <ExternalLink className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                          Open Workspace
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleEditOpen(e, featuredProject)} className="dark:text-slate-200 dark:hover:bg-slate-800">
                          <Edit2 className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleDeleteOpen(e, featuredProject)} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:hover:bg-red-950/40">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Project Title & Description */}
                <div className="space-y-1.5 mt-4">
                  <h2 
                    onClick={() => router.push(`/client/projects/${featuredProject.id}?tab=${stage.tab}`)}
                    className="text-[18px] sm:text-[20px] lg:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-indigo-400 transition-colors cursor-pointer leading-[1.25]"
                  >
                    {featuredProject.name}
                  </h2>
                  <p className="text-[14px] sm:text-[15px] text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed font-normal">
                    {featuredProject.description || "Comprehensive software requirement analysis, architectural specifications, and sprint estimation scope."}
                  </p>
                </div>

                {/* PROJECT LIFECYCLE STAGE Box */}
                <div className="mt-7 rounded-2xl border border-blue-100 dark:border-slate-800 bg-[#f0f7ff]/75 dark:bg-[#0b0f19] p-5 sm:p-7">
                  <div className="flex items-center justify-between text-xs sm:text-[13px] mb-5">
                    <span className="font-medium tracking-wider text-[11px] uppercase text-slate-500 dark:text-slate-400">
                      PROJECT LIFECYCLE STAGE
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-blue-600 dark:text-indigo-400">
                      <Sparkles className="h-4 w-4" />
                      {stage.phaseTitle}
                    </span>
                  </div>

                  {/* 5-Stage Stepper Component with connected line */}
                  <div className="relative w-full">
                    {/* Desktop & Tablet Stepper Grid (md+) */}
                    <div className="hidden md:grid md:grid-cols-5 w-full relative">
                      {WORKFLOW_STAGES.map((st, idx) => {
                        const isPast = st.step < stage.stageIndex
                        const isCurrent = st.step === stage.stageIndex
                        const isLast = idx === WORKFLOW_STAGES.length - 1

                        return (
                          <div
                            key={st.step}
                            onClick={() => router.push(`/client/projects/${featuredProject.id}?tab=${st.step === 1 ? 'requirements' : st.step === 2 ? 'analysis' : st.step === 3 ? 'gaps' : st.step === 4 ? 'estimation' : 'reports'}`)}
                            className="relative flex flex-col items-center text-center cursor-pointer group px-2"
                          >
                            {/* Circle and Connecting Line */}
                            <div className="relative flex items-center justify-center w-full mb-3">
                              {/* Track line connecting to next step center (none after step 5) */}
                              {!isLast && (
                                <div className={cn(
                                  "absolute top-1/2 left-1/2 w-full h-0.5 -translate-y-1/2 transition-colors",
                                  st.step < stage.stageIndex ? "bg-[#0f172a] dark:bg-indigo-500" : "bg-slate-200 dark:bg-slate-800"
                                )} />
                              )}

                              {/* Circle Node */}
                              <span className={cn(
                                "relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-all shadow-2xs group-hover:scale-105",
                                isPast
                                  ? "bg-[#0f172a] dark:bg-indigo-600 text-white ring-4 ring-[#f0f7ff] dark:ring-[#0b0f19]"
                                  : isCurrent
                                  ? "bg-blue-600 dark:bg-indigo-600 text-white ring-4 ring-blue-100 dark:ring-indigo-950"
                                  : "border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111625] text-slate-400 dark:text-slate-500 ring-4 ring-[#f0f7ff] dark:ring-[#0b0f19]"
                              )}>
                                {isPast ? (
                                  <Check className="h-4 w-4 stroke-[3]" />
                                ) : isCurrent ? (
                                  <FileText className="h-4.5 w-4.5" />
                                ) : (
                                  st.step
                                )}
                              </span>
                            </div>

                            {/* Centered Labels below each Circle */}
                            <div className="flex flex-col items-center text-center w-full">
                              <span className={cn(
                                "text-sm font-medium transition-colors leading-tight",
                                isCurrent ? "text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-indigo-400" : isPast ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"
                              )}>
                                {st.name}
                              </span>

                              <span className={cn(
                                "text-xs sm:text-[13px] font-medium mt-1",
                                isCurrent ? "text-blue-600 dark:text-indigo-400" : isPast ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"
                              )}>
                                {isCurrent ? `Stage ${st.step} of 5` : isPast ? "Completed" : "Upcoming"}
                              </span>

                              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug font-normal">
                                {st.subtitle}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Responsive compact view on mobile & small tablet (< md) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 md:hidden">
                      {WORKFLOW_STAGES.map((st) => {
                        const isPast = st.step < stage.stageIndex
                        const isCurrent = st.step === stage.stageIndex

                        return (
                          <div 
                            key={st.step} 
                            onClick={() => router.push(`/client/projects/${featuredProject.id}?tab=${st.step === 1 ? 'requirements' : st.step === 2 ? 'analysis' : st.step === 3 ? 'gaps' : st.step === 4 ? 'estimation' : 'reports'}`)}
                            className="flex items-start gap-3 p-3 rounded-xl bg-white/60 dark:bg-[#111625] border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-[#161c2e] transition-colors cursor-pointer"
                          >
                            <span className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all shadow-2xs",
                              isPast
                                ? "bg-[#0f172a] dark:bg-indigo-600 text-white"
                                : isCurrent
                                ? "bg-blue-600 dark:bg-indigo-600 text-white ring-2 ring-blue-100 dark:ring-indigo-950"
                                : "border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111625] text-slate-400 dark:text-slate-500"
                            )}>
                              {isPast ? (
                                <Check className="h-4 w-4 stroke-[3]" />
                              ) : isCurrent ? (
                                <FileText className="h-4 w-4" />
                              ) : (
                                st.step
                              )}
                            </span>

                            <div className="flex flex-col min-w-0">
                              <span className={cn(
                                "text-sm font-medium transition-colors leading-tight",
                                isCurrent ? "text-slate-900 dark:text-white" : isPast ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"
                              )}>
                                {st.name}
                              </span>
                              <span className={cn(
                                "text-xs font-medium mt-0.5",
                                isCurrent ? "text-blue-600 dark:text-indigo-400" : isPast ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"
                              )}>
                                {isCurrent ? `Stage ${st.step} of 5` : isPast ? "Completed" : "Upcoming"}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                                {st.subtitle}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Split Action & Metrics Area */}
                <div className="mt-7 grid grid-cols-1 lg:grid-cols-12 gap-7">
                  
                  {/* Left Column: What Happens Next */}
                  <div className="lg:col-span-5 rounded-2xl border border-blue-100 dark:border-slate-800 bg-[#f8fbff] dark:bg-[#0b0f19] p-5 sm:p-6 flex flex-col justify-between space-y-5">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-[15px] sm:text-base">
                        <Compass className="h-5 w-5 text-blue-600 dark:text-indigo-400" />
                        <span>What Happens Next</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                        {stage.attentionText}
                      </p>

                      <div className="space-y-2 pt-1">
                        {checklist.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                            <CheckCircle2 className="h-4.5 w-4.5 text-blue-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                            <span>{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 pt-2">
                      <Button
                        size="sm"
                        onClick={() => router.push(`/client/projects/${featuredProject.id}?tab=${stage.tab}`)}
                        className="h-10 sm:h-11 px-5 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl shadow-xs flex-1 sm:flex-initial"
                      >
                        <span>{stage.actionLabel}</span>
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsMessageLeadOpen(true)
                        }}
                        className="h-10 sm:h-11 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2c] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
                      >
                        Request Changes
                      </Button>
                    </div>
                  </div>

                  {/* Right Column: 3 Metric Cards + Lead Architect Box */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                    
                    {/* 3 Metric Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      {/* Metric 1 */}
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#111625] p-4 sm:p-4.5 relative space-y-1">
                        <span className="absolute top-3.5 right-3 text-[11px] font-medium px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          SPECS
                        </span>
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-indigo-400 mb-1">
                          <FileCode className="h-4 w-4" />
                          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">DOCUMENT</span>
                        </div>
                        <p className="text-sm sm:text-[15px] font-semibold text-slate-900 dark:text-white leading-tight">Requirements Scope</p>
                        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
                          {completeness}% completeness score
                        </p>
                      </div>

                      {/* Metric 2 */}
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#111625] p-4 sm:p-4.5 relative space-y-1">
                        <span className="absolute top-3.5 right-3 text-[11px] font-medium px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {estSprints > 0 ? `${estSprints} Sprints` : "TIMELINE"}
                        </span>
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-indigo-400 mb-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">TIMELINE</span>
                        </div>
                        <p className="text-sm sm:text-[15px] font-semibold text-slate-900 dark:text-white leading-tight">Sprint Roadmap</p>
                        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
                          {totalHours > 0 ? `${estWeeks} weeks execution (${totalHours}h)` : "Ready after estimation"}
                        </p>
                      </div>

                      {/* Metric 3 */}
                      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#111625] p-4 sm:p-4.5 relative space-y-1">
                        <span className={cn(
                          "absolute top-3.5 right-3 text-[11px] font-medium px-2 py-0.5 rounded",
                          totalHours > 0 ? "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300" : "bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}>
                          {totalHours > 0 ? "Fixed Model" : "Pending"}
                        </span>
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-indigo-400 mb-1">
                          <Layers className="h-4 w-4" />
                          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">BUDGET MODEL</span>
                        </div>
                        <p className="text-sm sm:text-[15px] font-semibold text-slate-900 dark:text-white leading-tight">Pod Allocation</p>
                        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
                          {totalHours > 0 ? `$${Math.round(estBudgetMin / 1000)}k - $${Math.round(estBudgetMax / 1000)}k range` : "Sizing computed at Stage 4"}
                        </p>
                      </div>
                    </div>

                    {/* Assigned Solutions Architect Card */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0b0f19] p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-blue-600 dark:bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          <Code2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-[15px] font-semibold text-slate-900 dark:text-white">AI Estimator Technical Desk</span>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-indigo-950/60 text-blue-600 dark:text-indigo-300 border border-blue-100 dark:border-indigo-800/50">
                              Solutions Team
                            </span>
                          </div>
                          <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                            Dedicated Technical Architecture &amp; Estimation Support
                          </p>
                          <div className="flex items-center gap-1.5 text-xs sm:text-[13px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span>Available today for debrief</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsMessageLeadOpen(true)}
                        className="h-10 px-4 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 dark:bg-[#151b2c] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 self-start sm:self-auto"
                      >
                        <MessageSquare className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                        Message Team
                      </Button>
                    </div>

                  </div>
                </div>

              </div>
            )
          })()}

          {/* 3. OTHER PROJECTS SECTION (Max 3-Column Layout with Balanced Padding) */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[18px] sm:text-[20px] lg:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.25]">Other Projects</h2>
                <p className="text-[13px] sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                  Previous and in-progress project scopes across your organization
                </p>
              </div>
              <span className="text-xs sm:text-sm font-mono font-medium text-slate-400 dark:text-slate-500">
                {secondaryProjects.length} Active workspaces
              </span>
            </div>

            {secondaryProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No other projects in this view.
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {secondaryProjects.map((project) => {
                  const stage = getClientProjectStage(project)
                  const pEstimate = project.estimates?.[0]
                  const pHours = pEstimate?.totalHours ?? 0

                  return (
                    <div
                      key={project.id}
                      className="group rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-5 sm:p-6 shadow-2xs hover:shadow-md hover:border-blue-300 dark:hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-5"
                    >
                      <div className="space-y-3.5">
                        {/* Status Badge & Timestamp */}
                        <div className="flex items-center justify-between gap-2 text-xs sm:text-[13px]">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-[12px] font-medium shrink-0",
                            stage.statusType === "ready"
                              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50"
                              : stage.statusType === "clarification"
                              ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50"
                              : "bg-blue-50 dark:bg-indigo-950/60 text-blue-700 dark:text-indigo-300 border border-blue-200 dark:border-indigo-800/50"
                          )}>
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full shrink-0",
                              stage.statusType === "ready" ? "bg-emerald-500" : stage.statusType === "clarification" ? "bg-purple-500" : "bg-blue-500 dark:bg-indigo-400"
                            )} />
                            {stage.statusLabel}
                          </span>

                          <span className="text-[13px] text-slate-400 dark:text-slate-500 font-normal shrink-0">
                            {formatRelativeTime(project.updatedAt || project.createdAt)}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h3 
                            onClick={() => router.push(`/client/projects/${project.id}?tab=${stage.tab}`)}
                            className="text-[16px] sm:text-[17px] md:text-[18px] font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer leading-[1.3] break-words"
                          >
                            {project.name}
                          </h3>
                          <p className="text-[14px] font-normal text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 leading-[1.5] min-h-[42px] break-words">
                            {project.description || (pHours > 0 ? `Estimated at ${pHours} total engineering hours.` : "Project scoping and requirements calibration in progress.")}
                          </p>
                        </div>

                        {/* Progress Bar with Stage Label */}
                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex items-center justify-between text-[13px] sm:text-[14px] font-medium text-slate-700 dark:text-slate-300 leading-[1.4]">
                            <span>Stage {stage.stageIndex} of 5: {stage.stageName}</span>
                            <span className="font-mono text-slate-500 dark:text-slate-400">{stage.progressPercent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                              style={{ width: `${stage.progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Notice Box */}
                        <div className="rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-[#111625] p-3 text-[13px] sm:text-[14px] font-normal text-slate-600 dark:text-slate-300 flex items-start gap-2 leading-[1.5]">
                          <AlertCircle className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
                          <span className="break-words">{stage.attentionText}</span>
                        </div>
                      </div>

                      {/* Footer link */}
                      <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button
                          onClick={() => router.push(`/client/projects/${project.id}?tab=${stage.tab}`)}
                          className="text-[14px] font-medium text-blue-600 dark:text-indigo-400 hover:text-blue-700 dark:hover:text-indigo-300 flex items-center gap-2 group-hover:gap-2.5 transition-all"
                        >
                          <span>Open Project Workspace</span>
                          <ArrowRight className="h-4 w-4 shrink-0" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 4. BOTTOM BANNER */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-indigo-950/60 text-blue-600 dark:text-indigo-400 border border-blue-100 dark:border-indigo-800/50">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-[17px] sm:text-[18px] font-semibold text-slate-900 dark:text-white">
                  Have questions about your project estimates?
                </h3>
                <p className="text-[13px] sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                  Our technical solutions team is available for direct 1-on-1 walkthroughs and custom SLA consultations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMessageLeadOpen(true)}
                className="h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2c] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
              >
                <Compass className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                Contact Architect
              </Button>

              <Button
                size="sm"
                onClick={() => setIsScheduleModalOpen(true)}
                className="h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl shadow-xs"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule 15-min Review
              </Button>
            </div>
          </div>

        </div>
      )}

      {/* MODAL 1: Create Project Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg p-6 sm:p-7 rounded-2xl dark:bg-[#0e1322] dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-[17px] sm:text-[18px] font-semibold text-slate-900 dark:text-white">Start New Project</DialogTitle>
            <DialogDescription className="text-[13px] text-slate-500 dark:text-slate-400">
              Start with a project name and short description to begin scoping.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="create-name" className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Project Name</Label>
              <Input
                id="create-name"
                placeholder="e.g. Healthcare Telehealth Platform"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                required
                autoFocus
                className="h-11 text-sm rounded-xl dark:bg-[#111625] dark:border-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description" className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Short Description (Optional)</Label>
              <Textarea
                id="create-description"
                placeholder="Brief summary of your project vision, target users, and key features"
                value={createDescription}
                onChange={e => setCreateDescription(e.target.value)}
                className="min-h-[90px] text-sm rounded-xl dark:bg-[#111625] dark:border-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="h-10 sm:h-11 text-sm font-medium rounded-xl dark:bg-[#151b2c] dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || !createName.trim()} className="h-10 sm:h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl">
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Edit Project Modal */}
      <Dialog open={!!editingProject} onOpenChange={(open: boolean) => !open && setEditingProject(null)}>
        <DialogContent className="sm:max-w-lg p-6 sm:p-7 rounded-2xl dark:bg-[#0e1322] dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-[17px] sm:text-[18px] font-semibold text-slate-900 dark:text-white">Edit Project Details</DialogTitle>
            <DialogDescription className="text-[13px] text-slate-500 dark:text-slate-400">Update your project title or description below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Name</Label>
              <Input id="edit-name" value={editName} onChange={e => setEditName(e.target.value)} required className="h-11 text-sm rounded-xl dark:bg-[#111625] dark:border-slate-800 dark:text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Description</Label>
              <Textarea id="edit-description" value={editDescription} onChange={e => setEditDescription(e.target.value)} className="min-h-[90px] text-sm rounded-xl dark:bg-[#111625] dark:border-slate-800 dark:text-white" />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingProject(null)} className="h-10 sm:h-11 text-sm font-medium rounded-xl dark:bg-[#151b2c] dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending} className="h-10 sm:h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl">
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Schedule Review Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-lg p-6 sm:p-7 rounded-2xl dark:bg-[#0e1322] dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-[17px] sm:text-[18px] font-semibold text-slate-900 dark:text-white">Schedule Architecture Review</DialogTitle>
            <DialogDescription className="text-[13px] text-slate-500 dark:text-slate-400">
              Book a 15-minute 1-on-1 debrief with our Technical Solutions Architect to review your project scope and deliverables.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-[#111625] border border-blue-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
              <p className="font-medium text-blue-900 dark:text-indigo-400 mb-1">Available Windows Today:</p>
              <p>• 2:00 PM – 2:15 PM EST</p>
              <p>• 4:30 PM – 4:45 PM EST</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Meeting Agenda or Questions (Optional)</Label>
              <Input id="notes" placeholder="e.g. Discuss tech stack add-ons, timeline adjustment" className="h-11 text-sm rounded-xl dark:bg-[#111625] dark:border-slate-800 dark:text-white dark:placeholder:text-slate-500" />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsScheduleModalOpen(false)} className="h-10 sm:h-11 text-sm font-medium rounded-xl dark:bg-[#151b2c] dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</Button>
            <Button 
              onClick={() => {
                setIsScheduleModalOpen(false)
                swalToast.success("Review meeting invitation sent to your email!")
              }} 
              className="h-10 sm:h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl"
            >
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Message Solutions Architect Modal */}
      <Dialog open={isMessageLeadOpen} onOpenChange={setIsMessageLeadOpen}>
        <DialogContent className="sm:max-w-lg p-6 sm:p-7 rounded-2xl dark:bg-[#0e1322] dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-[17px] sm:text-[18px] font-semibold text-slate-900 dark:text-white">Message Solutions Architect</DialogTitle>
            <DialogDescription className="text-[13px] text-slate-500 dark:text-slate-400">
              Send a direct query or note regarding your technical estimates and architectural requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Textarea
              placeholder="Type your question regarding architecture, estimates, or scope..."
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className="min-h-[120px] text-sm rounded-xl dark:bg-[#111625] dark:border-slate-800 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsMessageLeadOpen(false)} className="h-10 sm:h-11 text-sm font-medium rounded-xl dark:bg-[#151b2c] dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</Button>
            <Button 
              disabled={!messageText.trim()}
              onClick={() => {
                setIsMessageLeadOpen(false)
                setMessageText("")
                swalToast.success("Message sent to our technical solutions team. An architect will review and respond shortly.")
              }} 
              className="h-10 sm:h-11 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl"
            >
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
