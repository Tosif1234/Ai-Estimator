"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { AlertCircle, ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ChevronDown, ChevronUp, Download, Edit2, FileQuestion, FileSpreadsheet, FileText, Loader2, MoreVertical, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react"

import { AnalysisPanel, AnalysisData } from "@/components/projects/analysis-panel"
import { EstimateBreakdownList, EstimateExecutiveCard, EstimateItem, EstimateSummary } from "@/components/projects/estimate-summary"
import { Gap, GapCard } from "@/components/projects/gap-card"
import { QuestionCard } from "@/components/projects/question-card"
import { Question } from "@/components/projects/question-card"
import { ReadinessCard } from "@/components/projects/readiness-card"
import { WorkflowStepper } from "@/components/projects/workflow-stepper"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ApiError, apiClient } from "@/lib/api/apiClient"
import { cn } from "@/lib/utils"
import { swalToast, swalConfirm } from "@/lib/swal"

interface Project {
  id: string
  name: string
  description?: string | null
  status: string
  createdAt?: string
  updatedAt?: string
}

interface Requirement {
  id: string
  projectId: string
  rawText: string
  analysis: AnalysisData | null
  completenessScore: number
  createdAt: string
  updatedAt: string
}

interface Readiness {
  requirementId?: string
  completenessScore: number
  readyForEstimation?: boolean
  openCriticalGaps?: number
  openHighGaps?: number
  openQuestions?: number
  status: "READY_FOR_ESTIMATION" | "NEEDS_CLARIFICATION" | "ESTIMATED" | "NOT_STARTED"
}

interface EstimateHistoryItem {
  id: string
  projectId: string
  version: number
  totalHours: number
  createdAt: string
  updatedAt: string
}

interface EstimateDetail extends EstimateHistoryItem {
  items: EstimateItem[]
  unmatchedFeatures?: { moduleName: string; featureName: string }[]
  moduleSummary?: { moduleName: string; totalHours: number }[]
}

interface EstimateComparison {
  fromVersion: number
  toVersion: number
  fromTotalHours: number
  toTotalHours: number
  differenceHours: number
  addedFeatures: { moduleName: string; featureName: string; hours: number }[]
  removedFeatures: { moduleName: string; featureName: string; hours: number }[]
  changedFeatures: { moduleName: string; featureName: string; fromHours: number; toHours: number; differenceHours: number }[]
}

const queryKeys = {
  projects: ["projects"] as const,
  project: (projectId: string) => ["project", projectId] as const,
  requirements: (projectId: string) => ["requirements", projectId] as const,
  gaps: (projectId: string) => ["gaps", projectId] as const,
  questions: (projectId: string) => ["questions", projectId] as const,
  readiness: (projectId: string) => ["readiness", projectId] as const,
  estimates: (projectId: string) => ["estimates", projectId] as const,
  estimate: (projectId: string, version: number) => ["estimate", projectId, version] as const,
  comparison: (projectId: string, from: number, to: number) => ["estimate-comparison", projectId, from, to] as const,
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 403) return "You don't have access to this project."
    if (error.status === 404) return "Project not found."
    return error.message || fallback
  }
  if (error instanceof Error) return error.message || fallback
  return fallback
}

function isNotFound(error: unknown) {
  return error instanceof ApiError && error.status === 404
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not available"
}

// groupQuestionsByPriority removed in favor of status-based filtering in the component

export default function ProjectWorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const queryClient = useQueryClient()

  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  const [activeTab, setActiveTab] = React.useState(() => {
    return tabParam || "requirements"
  })

  const hasAutoNavigatedRef = React.useRef(Boolean(tabParam))

  // Sync tab with URL param if changed
  React.useEffect(() => {
    if (tabParam) {
      hasAutoNavigatedRef.current = true
      setActiveTab(tabParam)
    }
  }, [tabParam])
  const [requirementDraft, setRequirementDraft] = React.useState("")
  const [requirementDraftId, setRequirementDraftId] = React.useState<string | null>(null)
  const [isAiDraftActive, setIsAiDraftActive] = React.useState(false)
  const [originalRoughInput, setOriginalRoughInput] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editDescription, setEditDescription] = React.useState("")
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = React.useState<number | null>(null)
  const [compareFrom, setCompareFrom] = React.useState("")
  const [compareTo, setCompareTo] = React.useState("")
  const [questionFilter, setQuestionFilter] = React.useState<"ALL" | "PENDING" | "ANSWERED" | "SKIPPED">("ALL")

  const showToast = React.useCallback((message: string) => {
    if (message.toLowerCase().includes("fail") || message.toLowerCase().includes("unable") || message.toLowerCase().includes("error")) {
      swalToast.error(message)
    } else {
      swalToast.success(message)
    }
  }, [])

  const projectQuery = useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: async () => await apiClient.get(`/projects/${projectId}`) as Project,
    enabled: Boolean(projectId),
  })

  const requirementsQuery = useQuery({
    queryKey: queryKeys.requirements(projectId),
    queryFn: async () => await apiClient.get(`/projects/${projectId}/requirements`) as Requirement[],
    enabled: Boolean(projectId),
  })


  const requirement = requirementsQuery.data?.[0] ?? null

  const requirementText = requirementDraftId === (requirement?.id ?? "new")
    ? requirementDraft
    : requirement?.rawText ?? ""

  const gapsQuery = useQuery({
    queryKey: queryKeys.gaps(projectId),
    queryFn: async () => await apiClient.get(`/projects/${projectId}/gap-analysis`) as Gap[],
    enabled: Boolean(requirement),
    retry: (failureCount, error) => !isNotFound(error) && failureCount < 2,
  })

  const questionsQuery = useQuery({
    queryKey: queryKeys.questions(projectId),
    queryFn: async () => await apiClient.get(`/projects/${projectId}/questions`) as Question[],
    enabled: Boolean(requirement),
    retry: (failureCount, error) => !isNotFound(error) && failureCount < 2,
  })

  const readinessQuery = useQuery({
    queryKey: queryKeys.readiness(projectId),
    queryFn: async () => await apiClient.get(`/projects/${projectId}/gap-analysis/readiness`) as Readiness,
    enabled: Boolean(requirement),
    retry: (failureCount, error) => !isNotFound(error) && failureCount < 2,
  })

  const estimatesQuery = useQuery({
    queryKey: queryKeys.estimates(projectId),
    queryFn: async () => await apiClient.get(`/projects/${projectId}/estimates`) as EstimateHistoryItem[],
    enabled: Boolean(projectId),
  })

  const activeEstimateVersion = selectedVersion ?? estimatesQuery.data?.[0]?.version ?? null

  const estimateQuery = useQuery({
    queryKey: activeEstimateVersion ? queryKeys.estimate(projectId, activeEstimateVersion) : ["estimate", projectId, "none"],
    queryFn: async () => await apiClient.get(`/projects/${projectId}/estimates/${activeEstimateVersion}`) as EstimateDetail,
    enabled: Boolean(projectId && activeEstimateVersion),
  })

  const fromVersion = Number(compareFrom)
  const toVersion = Number(compareTo)
  const canCompare = Number.isInteger(fromVersion) && Number.isInteger(toVersion) && fromVersion > 0 && toVersion > 0 && fromVersion !== toVersion

  const comparisonQuery = useQuery({
    queryKey: canCompare ? queryKeys.comparison(projectId, fromVersion, toVersion) : ["estimate-comparison", projectId, "none"],
    queryFn: async () => await apiClient.get(`/projects/${projectId}/estimates/compare?from=${fromVersion}&to=${toVersion}`) as EstimateComparison,
    enabled: false,
  })

  const invalidateWorkspace = async (keys: Array<readonly unknown[]>) => {
    await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  }

  const updateProjectMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => await apiClient.patch(`/projects/${projectId}`, data),
    onSuccess: async () => {
      await invalidateWorkspace([queryKeys.project(projectId), queryKeys.projects])
      setIsEditDialogOpen(false)
      showToast("Project updated.")
    },
  })

  const deleteProjectMutation = useMutation({
    mutationFn: async () => await apiClient.delete(`/projects/${projectId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      swalToast.success("Project deleted successfully.")
      router.push("/client/projects")
    },
    onError: (error) => {
      showToast(getErrorMessage(error, "Failed to delete project."))
    }
  })

  const handleDeleteProject = async () => {
    const confirmed = await swalConfirm({
      title: "Delete Project",
      text: `Are you sure you want to permanently delete "${project?.name}" and all of its generated data? This action cannot be undone.`,
      confirmText: "Delete Project",
      isDestructive: true
    })
    if (confirmed) {
      deleteProjectMutation.mutate()
    }
  }

  const saveRequirementMutation = useMutation({
    mutationFn: async () => {
      const rawText = requirementText.trim()
      if (!rawText) throw new Error("Requirement text is required.")
      if (requirement) return await apiClient.patch(`/projects/${projectId}/requirements/${requirement.id}`, { rawText })
      return await apiClient.post(`/projects/${projectId}/requirements`, { rawText })
    },
    onSuccess: async () => {
      setRequirementDraftId(null)
      setIsAiDraftActive(false)
      await invalidateWorkspace([queryKeys.requirements(projectId), queryKeys.project(projectId), queryKeys.gaps(projectId), queryKeys.questions(projectId), queryKeys.readiness(projectId)])
      showToast("Requirement saved.")
    },
  })

  const generateDraftMutation = useMutation({
    mutationFn: async (roughText: string) => {
      const text = roughText.trim()
      if (!text) throw new Error("Please enter your project idea before generating with AI.")
      return await apiClient.post(`/projects/${projectId}/requirements/generate-draft`, { roughText: text }) as { draft: string }
    },
    onSuccess: (data) => {
      setRequirementDraftId(requirement?.id ?? "new")
      setRequirementDraft(data.draft)
      setIsAiDraftActive(true)
      showToast("✨ AI generated requirement draft. Review and edit before saving.")
    },
  })


  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append("file", file)
      return await apiClient.post(`/projects/${projectId}/requirements/upload`, formData) as { text: string }
    },
    onSuccess: (data) => {
      setRequirementDraftId(requirement?.id ?? "new")
      setRequirementDraft(data.text)
      setIsAiDraftActive(true)
      showToast("File parsed successfully. Review the extracted text and save.")
    },
    onError: (error) => {
      showToast(getErrorMessage(error, "Failed to upload or parse the file."))
    }
  })

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const rawText = requirementText.trim()
      if (!rawText) throw new Error("Requirement text is required.")
      if (requirement) {
        await apiClient.patch(`/projects/${projectId}/requirements/${requirement.id}`, { rawText })
      } else {
        await apiClient.post(`/projects/${projectId}/requirements`, { rawText })
      }
      return await apiClient.post(`/projects/${projectId}/requirements/analyze`)
    },
    onSuccess: async () => {
      setRequirementDraftId(null)
      setIsAiDraftActive(false)
      await invalidateWorkspace([
        queryKeys.requirements(projectId),
        queryKeys.project(projectId),
        queryKeys.gaps(projectId),
        queryKeys.questions(projectId),
        queryKeys.readiness(projectId)
      ])
      setActiveTab("analysis")
      showToast("Requirement analyzed! Gaps identified and clarification questions generated automatically.")
    },
  })

  const gapAnalysisMutation = useMutation({
    mutationFn: async () => await apiClient.post(`/projects/${projectId}/gap-analysis`),
    onSuccess: async () => {
      await invalidateWorkspace([queryKeys.gaps(projectId), queryKeys.readiness(projectId), queryKeys.project(projectId)])
      showToast("Gap analysis updated.")
    },
  })

  const generateQuestionsMutation = useMutation({
    mutationFn: async () => await apiClient.post(`/projects/${projectId}/questions/generate`),
    onSuccess: async () => {
      await invalidateWorkspace([queryKeys.questions(projectId), queryKeys.readiness(projectId), queryKeys.gaps(projectId)])
      showToast("Clarification questions generated.")
    },
  })

  const answerMutation = useMutation({
    mutationFn: async ({ id, answer }: { id: string; answer: string }) => await apiClient.patch(`/projects/${projectId}/questions/${id}/answer`, { answer }),
    onSuccess: async () => {
      await invalidateWorkspace([queryKeys.questions(projectId), queryKeys.readiness(projectId), queryKeys.gaps(projectId)])
      showToast("Answer saved.")
    },
  })

  const skipMutation = useMutation({
    mutationFn: async (id: string) => await apiClient.patch(`/projects/${projectId}/questions/${id}/skip`),
    onSuccess: async () => {
      await invalidateWorkspace([queryKeys.questions(projectId), queryKeys.readiness(projectId), queryKeys.gaps(projectId)])
      showToast("Question skipped.")
    },
  })

  const applyAnswersMutation = useMutation({
    mutationFn: async () => await apiClient.post(`/projects/${projectId}/questions/apply-answers`),
    onSuccess: async () => {
      await invalidateWorkspace([queryKeys.requirements(projectId), queryKeys.gaps(projectId), queryKeys.questions(projectId), queryKeys.readiness(projectId), queryKeys.project(projectId)])
      showToast("Answers applied and requirements re-analyzed.")
    },
  })

  const estimateMutation = useMutation({
    mutationFn: async () => await apiClient.post(`/projects/${projectId}/estimate`) as EstimateDetail,
    onSuccess: async (estimate) => {
      await invalidateWorkspace([queryKeys.estimates(projectId), queryKeys.readiness(projectId), queryKeys.project(projectId)])
      setSelectedVersion(estimate.version)
      setActiveTab("reports")
      showToast("Estimate generated.")
    },
  })

  const project = projectQuery.data
  const gaps = gapsQuery.data ?? []
  const questions = questionsQuery.data ?? []
  const readiness = readinessQuery.data
  const estimateHistory = estimatesQuery.data ?? []
  const latestEstimate = estimateHistory[0] ?? null
  const openCriticalGaps = React.useMemo(() => gaps.filter((g) => g.priority === "CRITICAL" && g.status === "OPEN").length, [gaps])
  const openHighGaps = React.useMemo(() => gaps.filter((g) => g.priority === "HIGH" && g.status === "OPEN").length, [gaps])
  const pendingQuestions = questions.filter((question) => question.status === "PENDING")
  const answeredQuestions = questions.filter((question) => question.status === "ANSWERED")
  const skippedQuestions = questions.filter((question) => question.status === "SKIPPED")
  const openQuestions = pendingQuestions.length
  const totalActionable = answeredQuestions.length + pendingQuestions.length
  const clarificationProgress = totalActionable > 0 ? Math.round((answeredQuestions.length / totalActionable) * 100) : 0
  const effectiveReadiness = React.useMemo(() => {
    const fallbackStatus: 'NEEDS_CLARIFICATION' | 'NOT_STARTED' = requirement ? 'NEEDS_CLARIFICATION' : 'NOT_STARTED'
    if (!readinessQuery.data) {
      return {
        status: fallbackStatus,
        completenessScore: requirement?.completenessScore ?? 0,
        openCriticalGaps,
        openHighGaps,
        openQuestions,
      }
    }
    const base = {
      ...readinessQuery.data,
      openCriticalGaps: readinessQuery.data.openCriticalGaps ?? openCriticalGaps,
      openHighGaps: readinessQuery.data.openHighGaps ?? openHighGaps,
      openQuestions: readinessQuery.data.openQuestions ?? openQuestions,
    }
    if (base.status === 'READY_FOR_ESTIMATION' && requirement && latestEstimate) {
      const reqTime = new Date(requirement.updatedAt).getTime()
      const estTime = new Date(latestEstimate.createdAt).getTime()
      // If the requirement hasn't been updated since the last estimate, it's already estimated
      if (reqTime <= estTime) {
        return { ...base, status: 'ESTIMATED' as const }
      }
    }
    return base
  }, [readinessQuery.data, requirement, latestEstimate, openCriticalGaps, openHighGaps, openQuestions])

  const liveProjectStatus = React.useMemo(() => {
    if (project?.status === "COMPLETED") return "COMPLETED"
    if (latestEstimate) {
      if (!requirement || new Date(requirement.updatedAt).getTime() <= new Date(latestEstimate.createdAt).getTime()) {
        return "ESTIMATED"
      }
    }
    if (effectiveReadiness.status && effectiveReadiness.status !== "NOT_STARTED") {
      return effectiveReadiness.status
    }
    if (requirement) {
      return "NEEDS_CLARIFICATION"
    }
    return project?.status || "DRAFT"
  }, [project?.status, latestEstimate, requirement, effectiveReadiness.status])

  // Automatically open the currently pending workflow stage when entering workspace without ?tab=
  React.useEffect(() => {
    if (hasAutoNavigatedRef.current || tabParam) return

    const isGapsSettled = !requirement || gapsQuery.isSuccess || gapsQuery.isError
    const isQuestionsSettled = !requirement || questionsQuery.isSuccess || questionsQuery.isError
    const isEstimatesSettled = estimatesQuery.isSuccess || estimatesQuery.isError

    if (projectQuery.isSuccess && requirementsQuery.isSuccess && isGapsSettled && isQuestionsSettled && isEstimatesSettled) {
      hasAutoNavigatedRef.current = true

      // 1. If project has no requirement text saved yet
      if (!requirement || !requirement.rawText?.trim()) {
        setActiveTab("requirements")
        return
      }

      // 2. If requirement is saved but AI architectural analysis has not run yet
      if (!requirement.analysis) {
        setActiveTab("requirements")
        return
      }

      // 3. If there are pending clarification questions or unresolved gaps
      if (
        pendingQuestions.length > 0 ||
        openCriticalGaps > 0 ||
        liveProjectStatus === "NEEDS_CLARIFICATION" ||
        (gaps.length > 0 && !latestEstimate && effectiveReadiness.status !== "READY_FOR_ESTIMATION")
      ) {
        setActiveTab("gaps")
        return
      }

      // 4. If ready for estimation
      if (
        liveProjectStatus === "READY_FOR_ESTIMATION" ||
        (!latestEstimate && (effectiveReadiness.status === "READY_FOR_ESTIMATION" || effectiveReadiness.status === "ESTIMATED"))
      ) {
        setActiveTab("estimation")
        return
      }

      // 5. If estimate is already generated
      if (latestEstimate || liveProjectStatus === "ESTIMATED") {
        setActiveTab("estimation")
        return
      }

      // 6. If project is completed
      if (liveProjectStatus === "COMPLETED") {
        setActiveTab("reports")
        return
      }

      setActiveTab("requirements")
    }
  }, [
    projectQuery.isSuccess,
    requirementsQuery.isSuccess,
    gapsQuery.isSuccess,
    gapsQuery.isError,
    questionsQuery.isSuccess,
    questionsQuery.isError,
    estimatesQuery.isSuccess,
    estimatesQuery.isError,
    tabParam,
    requirement,
    pendingQuestions.length,
    openCriticalGaps,
    liveProjectStatus,
    gaps.length,
    latestEstimate,
    effectiveReadiness.status,
  ])

  const orphanedQuestions = questions.filter(q => !q.gapId || !gaps.some(g => g.id === q.gapId))

  const handleEditOpen = () => {
    if (!project) return
    setEditName(project.name)
    setEditDescription(project.description ?? "")
    setIsEditDialogOpen(true)
  }

  const handleEditSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    updateProjectMutation.mutate({ name: editName, description: editDescription })
  }

  const [downloadingFormats, setDownloadingFormats] = React.useState<Record<string, boolean>>({})
  const [reportVersion, setReportVersion] = React.useState<number | null>(null)
  const [isOrphanedQuestionsExpanded, setIsOrphanedQuestionsExpanded] = React.useState(false)
  const [isGapsExpanded, setIsGapsExpanded] = React.useState(false)

  const downloadReport = async (format: "excel" | "pdf" = "excel") => {
    if (downloadingFormats[format]) return;
    setDownloadingFormats(prev => ({ ...prev, [format]: true }));
    try {
      showToast(format === "pdf" ? "Generating SRS Document (.pdf)..." : "Generating Excel (.xlsx) report...");
      const version = reportVersion ?? estimatesQuery.data?.[0]?.version;
      const versionParam = version ? `?version=${version}` : "";
      const endpoint = format === "pdf" ? `/projects/${projectId}/reports/pdf${versionParam}` : `/projects/${projectId}/reports/excel${versionParam}`;
      const defaultFilename = format === "pdf" ? "SRS_Specification.pdf" : "estimate.xlsx";

      const { blob, filename } = await apiClient.download(endpoint);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename ?? defaultFilename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      showToast(format === "pdf" ? "SRS PDF downloaded successfully." : "Excel report downloaded successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message;
      showToast(msg || `Unable to download ${format === "pdf" ? "SRS PDF" : "Excel"} report.`);
    } finally {
      setDownloadingFormats(prev => ({ ...prev, [format]: false }));
    }
  }

  if (projectQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-lg bg-muted" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  if (projectQuery.isError || !project) {
    return <EmptyState icon={AlertCircle} title={getErrorMessage(projectQuery.error, "Unable to load project.")} description="The workspace could not be loaded from the backend." action={{ label: "Back to Projects", onClick: () => router.push("/client/projects") }} />
  }

  return (
    <div className="space-y-8">

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-500 dark:text-slate-400">
        <Link href="/client/projects" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 font-medium">
          <ArrowLeft className="h-4 w-4" />
          <span>My Projects</span>
        </Link>
        <span className="text-slate-300 dark:text-slate-700">/</span>
        <span className="text-slate-900 dark:text-white font-semibold truncate max-w-[160px] sm:max-w-xs md:max-w-md">{project.name}</span>
      </div>

      {/* Project Title & Global Action Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <h1 className="break-words text-[22px] sm:text-[26px] lg:text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.2]">
              {project.name}
            </h1>
            <StatusBadge status={liveProjectStatus} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-normal">
            <span>Created {formatDate(project.createdAt)}</span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span>Updated {formatDate(project.updatedAt)}</span>
            {project.description && (
              <>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">·</span>
                <span className="truncate max-w-md hidden sm:inline text-slate-600 dark:text-slate-400">{project.description}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {/* Contextual Primary Action Button */}
          {pendingQuestions.length > 0 && activeTab !== "gaps" ? (
            <Button
              size="sm"
              onClick={() => setActiveTab("gaps")}
              className="h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs"
            >
              <span>Review Questions</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : effectiveReadiness.status === "READY_FOR_ESTIMATION" && !latestEstimate && activeTab !== "estimation" ? (
            <Button
              size="sm"
              onClick={() => estimateMutation.mutate()}
              disabled={estimateMutation.isPending}
              className="h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs"
            >
              {estimateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <span>Generate Estimate</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : requirement && !requirement.analysis && activeTab !== "analysis" ? (
            <Button
              size="sm"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs"
            >
              {analyzeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <span>Run AI Analysis</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : activeTab !== "requirements" && activeTab !== "reports" && !latestEstimate ? (
            <Button
              size="sm"
              onClick={() => setActiveTab("requirements")}
              className="h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs"
            >
              <span>Edit Requirements</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : null}

          {/* Action Buttons: Update and Delete */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleEditOpen}
            className="h-10 sm:h-11 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-[#0e1322] shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Edit2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            <span>Update</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeleteProject}
            className="h-10 sm:h-11 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800 bg-white dark:bg-[#0e1322] shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </Button>
        </div>
      </div>

      {/* Guided Workflow Pipeline Stepper */}
      <WorkflowStepper
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        hasRequirement={Boolean(requirement?.rawText?.trim())}
        hasAnalysis={Boolean(requirement?.analysis)}
        totalGaps={gaps.length}
        openCriticalGaps={openCriticalGaps}
        totalQuestions={questions.length}
        pendingQuestions={pendingQuestions.length}
        answeredQuestions={answeredQuestions.length}
        isReadyForEstimation={Boolean(effectiveReadiness.status === "READY_FOR_ESTIMATION" || effectiveReadiness.status === "ESTIMATED")}
        hasEstimate={Boolean(latestEstimate)}
        estimateHours={latestEstimate?.totalHours}
        onRunAnalysis={() => analyzeMutation.mutate()}
        onRunGapAnalysis={() => gapAnalysisMutation.mutate()}
        onApplyAnswers={() => applyAnswersMutation.mutate()}
        onGenerateEstimate={() => estimateMutation.mutate()}
        isAnalyzing={analyzeMutation.isPending}
        isGeneratingEstimate={estimateMutation.isPending}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsContent value="requirements" className="space-y-6">

          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h2 className="text-[18px] sm:text-[20px] lg:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.25]">
                  {requirement ? "Requirement Specification" : "Add Software Requirement"}
                </h2>
                <p className="text-[13px] sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                  Enter your requirements in natural language. Saved requirements form the source of truth for architectural analysis.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.txt,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      uploadFileMutation.mutate(file)
                    }
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadFileMutation.isPending}
                  className="h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-[#111625] hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {uploadFileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4 text-slate-400" />
                      Upload Document
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!requirementText.trim()) return
                    setOriginalRoughInput(requirementText)
                    generateDraftMutation.mutate(requirementText)
                  }}
                  disabled={generateDraftMutation.isPending || !requirementText.trim()}
                  className="h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-[#111625] hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {generateDraftMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Draft...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Generate with AI
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {requirementsQuery.isError && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
                  {getErrorMessage(requirementsQuery.error, "Unable to load requirements.")}
                </div>
              )}

              {/* AI Draft Review & Actions Callout */}
              {isAiDraftActive && (
                <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 sm:p-5 space-y-3.5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>AI-Generated Requirement Draft</span>
                      </div>
                      <p className="text-xs sm:text-[13px] text-muted-foreground font-normal">
                        Review or edit the specification below. Nothing is saved until confirmed.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          saveRequirementMutation.mutate()
                          setIsAiDraftActive(false)
                        }}
                        disabled={saveRequirementMutation.isPending || !requirementText.trim()}
                        className="h-9 px-3.5 text-xs sm:text-[13px] font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs"
                      >
                        {saveRequirementMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        Use Draft
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const promptToUse = originalRoughInput || requirementText
                          generateDraftMutation.mutate(promptToUse)
                        }}
                        disabled={generateDraftMutation.isPending}
                        className="h-9 px-3.5 text-xs sm:text-[13px] font-medium rounded-xl border-slate-200 dark:border-slate-800 text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
                      >
                        {generateDraftMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Regenerate
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          textareaRef.current?.focus()
                          showToast("You can edit the requirement directly in the text editor below.")
                        }}
                        className="h-9 px-3.5 text-xs sm:text-[13px] font-medium rounded-xl border-slate-200 dark:border-slate-800 text-foreground hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900"
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      {originalRoughInput && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRequirementDraft(originalRoughInput)
                            setIsAiDraftActive(false)
                            showToast("Restored your original rough idea.")
                          }}
                          className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl"
                        >
                          Revert
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Draft Generating State */}
              {generateDraftMutation.isPending && (
                <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 text-sm text-foreground flex items-center gap-3 font-normal">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Converting rough concepts into a structured software requirement specification...</span>
                </div>
              )}

              {generateDraftMutation.isError && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400 font-normal">
                  {getErrorMessage(generateDraftMutation.error, "Failed to generate requirement draft with AI.")}
                </div>
              )}

              <Textarea
                ref={textareaRef}
                value={requirementText}
                onChange={(event) => {
                  setRequirementDraftId(requirement?.id ?? "new")
                  setRequirementDraft(event.target.value)
                }}
                placeholder="Describe your software idea in natural language. Include user roles, features, platforms, integrations, business rules, and technical constraints."
                className="min-h-[320px] resize-y p-4 text-sm font-mono rounded-xl border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-relaxed focus-visible:ring-1 focus-visible:ring-indigo-500 shadow-2xs"
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono font-normal">{requirementText.trim().length} characters</p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => saveRequirementMutation.mutate()} 
                    disabled={saveRequirementMutation.isPending || !requirementText.trim()} 
                    className="h-10 sm:h-11 px-4 sm:px-5 text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-[#111625] hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto"
                  >
                    {saveRequirementMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    Save Requirement
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => analyzeMutation.mutate()} 
                    disabled={analyzeMutation.isPending || !requirementText.trim()} 
                    className="h-10 sm:h-11 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs w-full sm:w-auto"
                  >
                    {analyzeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Analyze Requirement
                  </Button>
                </div>
              </div>

              {(saveRequirementMutation.isError || analyzeMutation.isError) && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
                  {getErrorMessage(saveRequirementMutation.error || analyzeMutation.error, "Unable to save or analyze requirement.")}
                </div>
              )}
              {analyzeMutation.isPending && (
                <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 text-sm text-slate-800 dark:text-slate-200 flex items-center gap-3 font-normal">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Running architectural decomposition and entity extraction...</span>
                </div>
              )}
            </div>
          </div>

          {/* Requirements Stage Navigation Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3.5 px-4 sm:px-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] shadow-xs text-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Stage 1 of 5</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-slate-900 dark:text-white font-medium">Requirements Specification</span>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              <Button variant="outline" size="sm" asChild className="h-10 px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:bg-[#151b2c] hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto">
                <Link href="/client/projects">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  All Projects
                </Link>
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (requirement?.analysis) {
                    setActiveTab("analysis")
                  } else if (requirementText.trim()) {
                    await analyzeMutation.mutateAsync()
                  } else {
                    setActiveTab("analysis")
                  }
                }}
                disabled={!requirement && !requirementText.trim()}
                className="h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs w-full sm:w-auto"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <span>Continue to AI Analysis</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {!requirement ? (
            <EmptyState icon={FileText} title="No requirement added yet" description="Add a requirement before running AI analysis." action={{ label: "Add Requirement", onClick: () => setActiveTab("requirements") }} className="min-h-[260px] rounded-2xl" />
          ) : requirement.analysis ? (
            <>
              <AnalysisPanel analysis={requirement.analysis} onProceedToGaps={() => setActiveTab("gaps")} />
              {/* Analysis Stage Navigation Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3.5 px-4 sm:px-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] shadow-xs text-sm mt-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Stage 2 of 5</span>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="text-slate-900 dark:text-white font-medium">AI Architectural Decomposition</span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("requirements")}
                    className="h-10 px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:bg-[#151b2c] hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back: Requirements
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("gaps")}
                    className="h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs w-full sm:w-auto"
                  >
                    <span>Continue to Gaps &amp; Clarifications</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon={Sparkles} title="No AI analysis yet" description="Run analysis on the saved requirement to identify project type, actors, platforms, integrations, assumptions, modules, and features." action={{ label: "Analyze Requirement", onClick: () => analyzeMutation.mutate() }} className="min-h-[240px] rounded-2xl border border-slate-200/90" />
          )}
        </TabsContent>

        <TabsContent value="gaps" className="space-y-6">
          <section className="space-y-6">
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-[18px] sm:text-[20px] lg:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.25]">Clarification Questions &amp; Gap Analysis</h2>
                  <p className="text-xs sm:text-[13px] md:text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                    Resolve ambiguity in requirements before estimating development capacity.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => gapAnalysisMutation.mutate()} disabled={!requirement?.analysis || gapAnalysisMutation.isPending} variant="outline" size="sm" className="h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                    {gapAnalysisMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}Run Gap Analysis
                  </Button>
                  <Button onClick={() => generateQuestionsMutation.mutate()} disabled={!gaps.length || generateQuestionsMutation.isPending} variant="outline" size="sm" className="h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                    {generateQuestionsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileQuestion className="mr-2 h-4 w-4" />}Generate Questions
                  </Button>
                  {answeredQuestions.length > 0 && (
                    <Button onClick={() => applyAnswersMutation.mutate()} disabled={applyAnswersMutation.isPending} size="sm" className="h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold shadow-xs rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white">
                      {applyAnswersMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Apply Answers &amp; Re-analyze
                    </Button>
                  )}
                </div>
              </div>

              {totalActionable > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Clarification Progress</span>
                    <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{clarificationProgress}% ({answeredQuestions.length}/{totalActionable} answered)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 ease-in-out rounded-full" style={{ width: clarificationProgress + '%' }} />
                  </div>
                </div>
              )}

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {[
                  { key: "ALL", label: "All Questions", count: questions.length },
                  { key: "PENDING", label: "Pending", count: pendingQuestions.length },
                  { key: "ANSWERED", label: "Answered", count: answeredQuestions.length },
                  { key: "SKIPPED", label: "Skipped", count: skippedQuestions.length },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setQuestionFilter(key as any)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs sm:text-[13px] font-medium transition-colors border",
                      questionFilter === key
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 dark:bg-[#111625] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    <span>{label}</span>
                    <span className={cn(
                      "rounded-md px-1.5 py-0.5 text-[11px] font-mono font-medium",
                      questionFilter === key ? "bg-white/20 text-white" : "bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    )}>{count}</span>
                  </button>
                ))}
              </div>
            </div>

            {gapsQuery.isLoading ? (
              <div className="h-32 animate-pulse rounded-2xl bg-white dark:bg-[#0e1322] border border-slate-200 dark:border-slate-800" />
            ) : gaps.length ? (
              (() => {
                const sortedGaps = [...gaps].sort((a, b) => {
                  const order = { OPEN: 0, RESOLVED: 1 };
                  return order[a.status] - order[b.status];
                }).filter((gap) => {
                  if (questionFilter === "ALL") return true
                  const gapQuestions = questions.filter(q => q.gapId === gap.id && q.status === questionFilter)
                  return gapQuestions.length > 0
                })

                const visibleGaps = isGapsExpanded ? sortedGaps : sortedGaps.slice(0, 4)
                const hasMoreGaps = sortedGaps.length > 4

                if (sortedGaps.length === 0) {
                  return (
                    <EmptyState
                      icon={BarChart3}
                      title="No matching gaps found"
                      description={`No gaps found with status "${questionFilter.toLowerCase()}".`}
                      className="min-h-[200px] rounded-2xl border border-slate-200/90 dark:border-slate-800/80"
                    />
                  )
                }

                return (
                  <div className="space-y-5">
                    <div className="grid gap-5">
                      {visibleGaps.map((gap) => {
                        const gapQuestions = questions.filter(q => {
                          const matchGap = q.gapId === gap.id
                          const matchFilter = questionFilter === "ALL" || q.status === questionFilter
                          return matchGap && matchFilter
                        })

                        return (
                          <GapCard
                            key={gap.id}
                            gap={gap}
                            questions={gapQuestions}
                            onAnswer={async (id, answer) => { await answerMutation.mutateAsync({ id, answer }) }}
                            onSkip={async (id) => { await skipMutation.mutateAsync(id) }}
                          />
                        )
                      })}
                    </div>

                    {hasMoreGaps && (
                      <div className="pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsGapsExpanded(!isGapsExpanded)}
                          className="w-full h-11 px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 bg-white dark:bg-[#0e1322] flex items-center justify-center gap-2 shadow-2xs transition-colors"
                        >
                          {isGapsExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              <span>Show Less</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              <span>See More Gaps ({sortedGaps.length - 4} remaining)</span>
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })()
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No gaps generated yet"
                description={requirement?.analysis ? "Run gap analysis to identify missing details." : "Analyze the requirement before generating gaps."}
                className="min-h-[240px] rounded-2xl border border-slate-200/90 dark:border-slate-800/80"
              />
            )}
            
            {orphanedQuestions.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">Orphaned Questions (from previous analysis)</h3>
                <div className="space-y-4">
                  {(isOrphanedQuestionsExpanded ? [...orphanedQuestions] : [...orphanedQuestions].slice(0, 4)).sort((a, b) => {
                    const order: Record<string, number> = { PENDING: 0, SKIPPED: 1, ANSWERED: 2 };
                    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
                  }).map(q => (
                    <QuestionCard key={q.id} question={q} onAnswer={async (id: string, answer: string) => { await answerMutation.mutateAsync({ id, answer }) }} onSkip={async (id: string) => { await skipMutation.mutateAsync(id) }} />
                  ))}

                  {orphanedQuestions.length > 4 && (
                    <div className="pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsOrphanedQuestionsExpanded(!isOrphanedQuestionsExpanded)}
                        className="w-full h-10 px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 bg-white dark:bg-[#0e1322] flex items-center justify-center gap-2 shadow-2xs transition-colors"
                      >
                        {isOrphanedQuestionsExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            <span>Show Less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            <span>See More Questions ({orphanedQuestions.length - 4} remaining)</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {(gapAnalysisMutation.isError || generateQuestionsMutation.isError || applyAnswersMutation.isError || answerMutation.isError || skipMutation.isError) && (
              <div className="rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
                {getErrorMessage(gapAnalysisMutation.error || generateQuestionsMutation.error || applyAnswersMutation.error || answerMutation.error || skipMutation.error, "Unable to run gap analysis or update questions.")}
              </div>
            )}

            {/* Gaps & Questions Stage Navigation Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3.5 px-4 sm:px-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] shadow-xs text-sm mt-6">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Stage 3 of 5</span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-slate-900 dark:text-white font-medium">Gaps &amp; Clarifications</span>
                <span className="text-slate-500 dark:text-slate-400 hidden sm:inline font-normal">({answeredQuestions.length} of {totalActionable} answered)</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("analysis")}
                  className="h-10 px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:bg-[#151b2c] hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back: AI Analysis
                </Button>
                <Button
                  size="sm"
                  onClick={() => setActiveTab("estimation")}
                  className="h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs w-full sm:w-auto"
                >
                  <span>Continue to Estimation</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="estimation" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <ReadinessCard
              score={effectiveReadiness.completenessScore}
              status={effectiveReadiness.status}
              criticalGaps={openCriticalGaps}
              highGaps={openHighGaps}
              openQuestions={openQuestions}
              onGenerateEstimate={() => estimateMutation.mutate()}
              onViewReports={() => setActiveTab("reports")}
              isGenerating={estimateMutation.isPending}
            />

            {estimateQuery.data ? (
              <EstimateExecutiveCard
                version={estimateQuery.data.version}
                totalHours={estimateQuery.data.totalHours}
                items={estimateQuery.data.items ?? []}
                createdAt={estimateQuery.data.createdAt}
              />
            ) : latestEstimate ? (
              <div className="h-full min-h-[200px] animate-pulse rounded-lg bg-muted/30 border border-border" />
            ) : (
              <Card className="rounded-lg border border-dashed border-border bg-muted/10 p-5 flex flex-col items-center justify-center text-center h-full min-h-[200px]">
                <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">Estimate Deliverable Pending</h3>
                <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
                  When requirement readiness is complete, click &ldquo;Generate Engineering Estimate&rdquo; to compute detailed effort and module breakdown.
                </p>
              </Card>
            )}
          </div>

          {estimateMutation.isError && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              {getErrorMessage(estimateMutation.error, "Unable to generate estimate.")}
            </div>
          )}

          {/* Estimate History & Estimate Comparison (Side by Side Row Before Tasks) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Estimate History */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] shadow-xs p-5 sm:p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Estimate History</h3>
                  <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Switch between saved estimate versions from the database.</p>
                </div>
                <div className="space-y-2 pt-3">
                  {estimateHistory.length ? estimateHistory.map((estimate) => (
                    <button 
                      key={estimate.id} 
                      type="button" 
                      onClick={() => setSelectedVersion(estimate.version)} 
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border p-3 text-left transition-colors text-xs sm:text-sm",
                        activeEstimateVersion === estimate.version 
                          ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 ring-1 ring-indigo-600/30 text-slate-900 dark:text-white font-medium" 
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0b0f19]"
                      )}
                    >
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">Version {estimate.version}</span>
                        <span className="text-slate-500 dark:text-slate-400 ml-2 text-xs">Created {formatDate(estimate.createdAt)}</span>
                      </div>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-[#111625] px-2.5 py-1 rounded-lg text-xs border border-slate-200 dark:border-slate-800">
                        {estimate.totalHours} hrs
                      </span>
                    </button>
                  )) : <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">No estimate history recorded yet.</p>}
                </div>
              </div>
            </div>

            {/* Estimate Comparison */}
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] shadow-xs p-5 sm:p-6 space-y-4 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Estimate Comparison</h3>
                  <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Compare scope and effort differences between two versions.</p>
                </div>
                <div className="space-y-4 pt-3">
                  {estimateHistory.length < 2 ? (
                    <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 font-normal">Generate at least two estimate versions to compare differences.</p>
                  ) : (
                    <>
                      <div className="grid gap-2.5 sm:grid-cols-[1fr_1fr_auto]">
                        <select
                          className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111625] px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={compareFrom}
                          onChange={(e) => setCompareFrom(e.target.value)}
                        >
                          <option value="" disabled>Select Base Version...</option>
                          {estimateHistory.map((est) => (
                            <option key={est.id} value={est.version.toString()}>
                              Version {est.version} — {est.totalHours} hrs
                            </option>
                          ))}
                        </select>

                        <select
                          className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111625] px-3 py-1.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          value={compareTo}
                          onChange={(e) => setCompareTo(e.target.value)}
                        >
                          <option value="" disabled>Select Target Version...</option>
                          {estimateHistory.map((est) => (
                            <option key={est.id} value={est.version.toString()}>
                              Version {est.version} — {est.totalHours} hrs
                            </option>
                          ))}
                        </select>

                        <Button onClick={() => comparisonQuery.refetch()} disabled={!canCompare || comparisonQuery.isFetching} className="h-10 px-5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs">
                          {comparisonQuery.isFetching ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                          Compare
                        </Button>
                      </div>

                      {comparisonQuery.data && (
                        <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-[#0b0f19] text-xs sm:text-[13px]">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="p-3 rounded-xl bg-white dark:bg-[#111625] border border-slate-200 dark:border-slate-800">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Version {comparisonQuery.data.fromVersion}</p>
                              <p className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">{comparisonQuery.data.fromTotalHours} hrs</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-[#111625] border border-slate-200 dark:border-slate-800">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Version {comparisonQuery.data.toVersion}</p>
                              <p className="font-mono font-bold text-sm text-slate-900 dark:text-white mt-0.5">{comparisonQuery.data.toTotalHours} hrs</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white dark:bg-[#111625] border border-slate-200 dark:border-slate-800">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Delta</p>
                              <p className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 mt-0.5">{comparisonQuery.data.differenceHours > 0 ? `+${comparisonQuery.data.differenceHours}` : comparisonQuery.data.differenceHours} hrs</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">Work items changed: {comparisonQuery.data.addedFeatures.length + comparisonQuery.data.removedFeatures.length + comparisonQuery.data.changedFeatures.length}</p>
                        </div>
                      )}
                      {comparisonQuery.isError && <p className="text-xs text-red-600 dark:text-red-400">{getErrorMessage(comparisonQuery.error, "Unable to compare estimates.")}</p>}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Engineering Work Breakdown (Task List Below History & Comparison) */}
          {estimateQuery.data && (
            <EstimateBreakdownList
              items={estimateQuery.data.items ?? []}
              totalHours={estimateQuery.data.totalHours}
              projectId={projectId}
            />
          )}

          {/* Estimation Stage Navigation Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3.5 px-4 sm:px-5 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] shadow-xs text-sm mt-6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Stage 4 of 5</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-slate-900 dark:text-white font-medium">Engineering Estimation Deliverable</span>
              {latestEstimate && <span className="text-slate-500 dark:text-slate-400 hidden sm:inline font-normal">({latestEstimate.totalHours} hrs)</span>}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("gaps")}
                className="h-10 px-4 text-xs sm:text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:bg-[#151b2c] hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Back: Clarifications
              </Button>
              <Button
                size="sm"
                onClick={() => setActiveTab("reports")}
                className="h-10 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs w-full sm:w-auto"
              >
                <span>Continue to Reports</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="space-y-6">
            <Card className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] shadow-xs">
              <CardHeader className="p-4 sm:p-6 pb-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2 text-foreground">
                      <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Project Deliverables &amp; Estimation Reports
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Export structured engineering workbooks and project documentation.
                    </CardDescription>
                  </div>

                  {/* Version Selector Filter */}
                  {(estimatesQuery.data?.length ?? 0) > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 sm:mt-0">
                      <span className="text-xs text-muted-foreground font-medium">Version:</span>
                      <div className="flex flex-wrap gap-1">
                        {estimatesQuery.data?.map((est) => (
                          <button
                            key={est.version}
                            type="button"
                            onClick={() => setReportVersion(est.version)}
                            className={cn(
                              "h-7 px-2.5 text-xs font-mono rounded-lg border transition-colors",
                              (reportVersion ?? estimatesQuery.data?.[0]?.version) === est.version
                                ? "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs"
                                : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            v{est.version}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 pt-0">
                {latestEstimate ? (
                  <div className="space-y-4">
                    {/* Document Registry Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200/90 dark:border-slate-800/80">
                      <table className="w-full min-w-[580px] border-collapse text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/40 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <th className="py-2.5 px-4 font-semibold">Deliverable Document</th>
                            <th className="py-2.5 px-3 font-semibold w-24">Format</th>
                            <th className="py-2.5 px-3 font-semibold w-32">Scope Target</th>
                            <th className="py-2.5 px-3 font-semibold w-32">Updated</th>
                            <th className="py-2.5 px-4 font-semibold w-36 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                          {/* Deliverable 1: Excel Workbook */}
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-start gap-2.5">
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                                <div>
                                  <span className="font-semibold text-foreground text-xs sm:text-sm">Technical Estimation Workbook</span>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    Multi-sheet engineering model: Base Production Scope, Epics breakdown, architecture context &amp; optional add-ons.
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                .XLSX
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-muted-foreground">
                              Version {reportVersion ?? estimatesQuery.data?.[0]?.version} ({latestEstimate.totalHours}h)
                            </td>
                            <td className="py-3 px-3 text-muted-foreground">
                              {formatDate(latestEstimate.createdAt)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                size="sm"
                                onClick={() => downloadReport("excel")}
                                disabled={downloadingFormats["excel"]}
                                className="h-8 px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs"
                              >
                                {downloadingFormats["excel"] ? (
                                  <>
                                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                    Exporting...
                                  </>
                                ) : (
                                  <>
                                    <Download className="mr-1.5 h-3 w-3" />
                                    Download (.xlsx)
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>

                          {/* Deliverable 2: Requirements Specification Baseline */}
                          {requirement && (
                            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-start gap-2.5">
                                  <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="font-semibold text-foreground text-xs sm:text-sm">Software Requirement Specification (SRS)</span>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      Comprehensive engineering specification: scope, functional modules, actors, integrations &amp; quality calibration.
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="inline-flex items-center text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
                                  .PDF
                                </span>
                              </td>
                              <td className="py-3 px-3 text-muted-foreground">
                                Active Baseline
                              </td>
                              <td className="py-3 px-3 text-muted-foreground">
                                {formatDate(requirement.updatedAt)}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => downloadReport("pdf")}
                                    disabled={downloadingFormats["pdf"]}
                                    className="h-8 px-3 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs"
                                  >
                                    {downloadingFormats["pdf"] ? (
                                      <>
                                        <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                        Exporting...
                                      </>
                                    ) : (
                                      <>
                                        <Download className="mr-1.5 h-3 w-3" />
                                        Download (.pdf)
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-2">
                    <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                    <p className="font-semibold text-sm text-foreground">No estimate deliverables available</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Generate an engineering estimate from the Estimation stage to generate your Excel workbook.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stage 5 Terminal Navigation Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white/70 dark:bg-[#0e1322]/70 backdrop-blur-xs text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider shrink-0">Stage 5 of 5</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground font-medium truncate">Final Deliverables &amp; Reports</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("estimation")}
                  className="h-9 px-3.5 text-xs font-medium rounded-xl border-slate-200 dark:border-slate-800 text-muted-foreground hover:text-foreground w-full sm:w-auto"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  Back: Estimation
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg p-6 sm:p-7 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322]">
          <DialogHeader>
            <DialogTitle className="text-[17px] sm:text-[18px] font-semibold text-foreground">Edit Project</DialogTitle>
            <DialogDescription className="text-[13px] text-muted-foreground">Modify your project details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-foreground">Name</Label>
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                required
                className="h-11 text-sm rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px] font-medium text-foreground">Description</Label>
              <Input
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                className="h-11 text-sm rounded-xl border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-600"
              />
            </div>
            <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="h-10 sm:h-11 text-sm font-medium rounded-xl border-slate-200 dark:border-slate-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProjectMutation.isPending}
                className="h-10 sm:h-11 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl shadow-xs"
              >
                {updateProjectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
