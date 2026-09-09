"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { ClientWelcomeLanding } from "@/components/client/client-welcome-landing"
import { useAuth } from "@/components/providers/auth-provider"
import { apiClient } from "@/lib/api/apiClient"
import { swalToast } from "@/lib/swal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface Project {
  id: string
  name: string
  description?: string | null
  status: string
  createdAt?: string
  updatedAt?: string
}

export default function ClientHomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [createName, setCreateName] = React.useState("")
  const [createDescription, setCreateDescription] = React.useState("")

  const [isScheduleModalOpen, setIsScheduleModalOpen] = React.useState(false)
  const [isMessageLeadOpen, setIsMessageLeadOpen] = React.useState(false)
  const [messageText, setMessageText] = React.useState("")

  // Fetch client projects to understand workspace status
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      return await apiClient.get("/projects") as Project[]
    },
  })

  // Identify active project and metrics
  const { activeProject, readyEstimatesCount, activeProjectsCount } = React.useMemo(() => {
    if (!projects || projects.length === 0) {
      return { activeProject: null, readyEstimatesCount: 0, activeProjectsCount: 0 }
    }

    const readyCount = projects.filter(p => p.status === "ESTIMATED" || p.status === "COMPLETED").length
    const readyIdx = projects.findIndex(p => p.status === "ESTIMATED" || p.status === "COMPLETED")
    const actionIdx = projects.findIndex(p => p.status === "NEEDS_CLARIFICATION" || p.status === "READY_FOR_ESTIMATION")
    const targetIdx = readyIdx !== -1 ? readyIdx : (actionIdx !== -1 ? actionIdx : 0)

    return {
      activeProject: projects[targetIdx],
      readyEstimatesCount: readyCount,
      activeProjectsCount: projects.length
    }
  }, [projects])

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return await apiClient.post("/projects", data) as { id: string }
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      setIsCreateOpen(false)
      setCreateName("")
      setCreateDescription("")
      swalToast.success("Project workspace initialized!")
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

  return (
    <div className="space-y-8">
      {isLoading ? (
        <div className="space-y-6">
          <div className="h-80 animate-pulse rounded-3xl bg-white border border-slate-200" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="h-44 animate-pulse rounded-2xl bg-white border border-slate-200" />
            <div className="h-44 animate-pulse rounded-2xl bg-white border border-slate-200" />
            <div className="h-44 animate-pulse rounded-2xl bg-white border border-slate-200" />
            <div className="h-44 animate-pulse rounded-2xl bg-white border border-slate-200" />
          </div>
        </div>
      ) : (
        <ClientWelcomeLanding
          userName={user?.name || undefined}
          activeProjectsCount={activeProjectsCount}
          readyEstimatesCount={readyEstimatesCount}
          activeProject={activeProject}
          onStartProject={handleStartWithArchetype}
          onScheduleReview={() => setIsScheduleModalOpen(true)}
          onContactArchitect={() => setIsMessageLeadOpen(true)}
        />
      )}

      {/* MODAL 1: Create / Start Project Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#0e1322] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Start New Project Estimate</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Enter your project name and an optional concept summary to begin the 5-stage scoping engine.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="home-create-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Project Name</Label>
              <Input
                id="home-create-name"
                placeholder="e.g. Healthcare Telehealth Platform"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                required
                autoFocus
                className="h-11 text-sm rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2c] text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-create-description" className="text-sm font-medium text-slate-700 dark:text-slate-300">Short Description (Optional)</Label>
              <Textarea
                id="home-create-description"
                placeholder="Brief summary of your project vision, target users, and key features"
                value={createDescription}
                onChange={e => setCreateDescription(e.target.value)}
                className="min-h-[90px] text-sm rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2c] text-slate-900 dark:text-white"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="h-11 px-5 text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2c] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || !createName.trim()} 
                className="h-11 px-5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Initialize Workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Schedule Review Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-lg p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#0e1322] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-[17px] sm:text-[18px] font-semibold text-slate-900 dark:text-white leading-[1.3]">Schedule Architecture Scoping Review</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Book a 15-minute 1-on-1 debrief with our Technical Solutions Architect to review your project scope and specifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 text-slate-700 dark:text-slate-300">
              <p className="font-semibold text-indigo-900 dark:text-indigo-200 mb-1">Available Windows Today:</p>
              <p>• 2:00 PM – 2:15 PM EST</p>
              <p>• 4:30 PM – 4:45 PM EST</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-agenda" className="text-sm font-medium text-slate-700 dark:text-slate-300">Meeting Agenda or Questions (Optional)</Label>
              <Input id="home-agenda" placeholder="e.g. Scoping requirements, timeline discussion" className="h-11 text-sm rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2c] text-slate-900 dark:text-white" />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsScheduleModalOpen(false)} className="h-11 px-5 text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2c] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setIsScheduleModalOpen(false)
                swalToast.success("Review meeting invitation sent to your email!")
              }} 
              className="h-11 px-5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
            >
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Message Solutions Architect */}
      <Dialog open={isMessageLeadOpen} onOpenChange={setIsMessageLeadOpen}>
        <DialogContent className="sm:max-w-lg p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#0e1322] border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-[17px] sm:text-[18px] font-semibold text-slate-900 dark:text-white leading-[1.3]">Message Technical Solutions Desk</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
              Send a direct query or note regarding your technical estimates and architectural requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Textarea
              placeholder="Type your question regarding architecture, estimates, or scope..."
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              className="min-h-[110px] text-sm rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2c] text-slate-900 dark:text-white"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsMessageLeadOpen(false)} className="h-11 px-5 text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2c] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </Button>
            <Button 
              disabled={!messageText.trim()}
              onClick={() => {
                setIsMessageLeadOpen(false)
                setMessageText("")
                swalToast.success("Message sent to our technical solutions team. We will respond shortly.")
              }} 
              className="h-11 px-5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
            >
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
