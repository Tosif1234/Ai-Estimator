"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/apiClient"
import { Card } from "@/components/ui/card"
import { 
  FolderKanban, 
  Clock, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Loader2, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  User as UserIcon
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { swalToast, swalConfirm } from "@/lib/swal"
import { AdminPagination } from "@/components/admin/admin-pagination"

interface ProjectWithUser {
  id: string
  name: string
  description?: string
  status: string
  createdAt?: string
  updatedAt?: string
  user?: {
    name: string | null
    email: string
  }
}

export default function AdminProjectsPage() {
  const queryClient = useQueryClient()
  
  const [editingProject, setEditingProject] = React.useState<ProjectWithUser | null>(null)

  const [editName, setEditName] = React.useState("")
  const [editDescription, setEditDescription] = React.useState("")
  const [editStatus, setEditStatus] = React.useState("")

  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [sortBy, setSortBy] = React.useState("createdAt")
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc")

  const [currentPage, setCurrentPage] = React.useState(1)
  const PAGE_SIZE = 10

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  // Reset pagination to page 1 whenever search, filter, or sort criteria change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, sortBy, sortOrder])

  const { data: projects, isLoading } = useQuery({
    queryKey: ["admin", "projects", debouncedSearch, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (sortBy) params.set("sortBy", sortBy)
      if (sortOrder) params.set("sortOrder", sortOrder)
      const qs = params.toString() ? `?${params.toString()}` : ""
      return await apiClient.get(`/projects${qs}`) as ProjectWithUser[]
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: Record<string, unknown> }) => {
      return await apiClient.patch(`/projects/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] })
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
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] })
      swalToast.success("Project deleted successfully")
    },
    onError: (err: Error) => {
      swalToast.error(err.message || "Failed to delete project")
    }
  })

  const handleDeleteProject = async (project: ProjectWithUser) => {
    const confirmed = await swalConfirm({
      title: "Delete Project",
      text: `Are you sure you want to permanently delete "${project.name}" and all of its generated data? This action cannot be undone.`,
      confirmText: "Delete Project",
      isDestructive: true
    })
    if (confirmed) {
      deleteMutation.mutate(project.id)
    }
  }

  const handleEditOpen = (project: ProjectWithUser) => {
    setEditingProject(project)
    setEditName(project.name)
    setEditDescription(project.description || "")
    setEditStatus(project.status)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return
    updateMutation.mutate({
      id: editingProject.id,
      data: { name: editName, description: editDescription, status: editStatus }
    })
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 group-hover:opacity-100" />
    }
    return sortOrder === "asc"
      ? <ArrowUp className="ml-1 h-3 w-3 text-primary" />
      : <ArrowDown className="ml-1 h-3 w-3 text-primary" />
  }

  const totalProjects = projects?.length ?? 0
  const totalPages = Math.ceil(totalProjects / PAGE_SIZE)

  React.useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const paginatedProjects = React.useMemo(() => {
    if (!projects) return []
    const start = (currentPage - 1) * PAGE_SIZE
    return projects.slice(start, start + PAGE_SIZE)
  }, [projects, currentPage])

  return (
    <div className="space-y-8">
      <div className="border-b border-border/60 pb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-[26px] lg:text-[28px] font-semibold leading-tight tracking-tight text-foreground">
            All Projects
          </h1>
          <p className="mt-1.5 text-sm sm:text-[15px] text-muted-foreground">
            Manage and view all client projects across the platform{projects ? ` (${projects.length} total)` : ""}.
          </p>
        </div>
      </div>

      {/* Server-Side Search and Sorting Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search projects or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 text-sm rounded-xl w-full"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          <span className="text-xs sm:text-[13px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px] sm:w-[160px] h-11 text-sm font-medium rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date Created</SelectItem>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
              <SelectItem value="name">Project Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-11 px-3.5 sm:px-4 text-sm font-semibold rounded-xl flex items-center gap-1.5"
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            title={sortOrder === "asc" ? "Ascending order" : "Descending order"}
          >
            {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            {sortOrder === "asc" ? "Asc" : "Desc"}
          </Button>
        </div>
      </div>

      {/* Projects Table Card */}
      <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden bg-card">
        {/* DESKTOP & TABLET TABLE VIEW (Hidden on Mobile) */}
        <div className="hidden md:block w-full overflow-hidden">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="w-[36%] px-5 py-3.5 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="flex items-center group uppercase font-semibold text-xs text-muted-foreground hover:text-foreground"
                  >
                    Project Name
                    {renderSortIndicator("name")}
                  </button>
                </th>
                <th className="w-[26%] px-4 py-3.5 font-semibold">
                  Client Owner
                </th>
                <th className="w-[18%] px-4 py-3.5 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className="flex items-center group uppercase font-semibold text-xs text-muted-foreground hover:text-foreground"
                  >
                    Status
                    {renderSortIndicator("status")}
                  </button>
                </th>
                <th className="w-[12%] px-4 py-3.5 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("createdAt")}
                    className="flex items-center group uppercase font-semibold text-xs text-muted-foreground hover:text-foreground"
                  >
                    Created
                    {renderSortIndicator("createdAt")}
                  </button>
                </th>
                <th className="w-[8%] px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading projects...</span>
                  </td>
                </tr>
              ) : projects?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    {debouncedSearch.trim() ? "No projects match your search query." : "No projects created yet."}
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary mt-0.5 shrink-0">
                          <FolderKanban className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-sm sm:text-[15px] text-foreground block truncate" title={project.name}>
                            {project.name}
                          </span>
                          {project.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-sm mt-0.5">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 text-xs font-semibold">
                          {(project.user?.name || project.user?.email || "U")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-foreground truncate">
                            {project.user?.name || "Unnamed Client"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {project.user?.email || "No email"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={project.status || "DRAFT"} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground truncate">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 opacity-60 shrink-0" />
                        <span>
                          {project.createdAt 
                            ? new Date(project.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                            : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" aria-label="Project actions">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditOpen(project)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit Project
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteProject(project)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LIST VIEW (< 768px) */}
        <div className="block md:hidden divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              <span>Loading projects...</span>
            </div>
          ) : projects?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              {debouncedSearch.trim() ? "No projects match your search query." : "No projects created yet."}
            </div>
          ) : (
            paginatedProjects.map((project) => (
              <div key={project.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[15px] text-foreground leading-snug break-words">
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0" aria-label="Project actions">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditOpen(project)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit Project
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteProject(project)} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40 gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 text-[10px] font-semibold">
                      {(project.user?.name || project.user?.email || "U")[0].toUpperCase()}
                    </div>
                    <span className="text-muted-foreground truncate max-w-[140px]">
                      {project.user?.name || project.user?.email || "Unnamed Client"}
                    </span>
                  </div>
                  <StatusBadge status={project.status || "DRAFT"} />
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                  <Clock className="h-3 w-3 opacity-60 shrink-0" />
                  <span>
                    Created: {project.createdAt 
                      ? new Date(project.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                      : "—"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Integrated Pagination Controls */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={totalProjects}
          itemsPerPage={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemName="projects"
        />
      </Card>

      <Dialog open={!!editingProject} onOpenChange={(open: boolean) => !open && setEditingProject(null)}>
        <DialogContent className="p-5 sm:p-6 rounded-2xl w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-semibold">Edit Project</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">Modify the project details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} required className="h-11 text-sm rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Description</Label>
              <Input value={editDescription} onChange={e => setEditDescription(e.target.value)} className="h-11 text-sm rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={editStatus} onValueChange={val => setEditStatus(val)}>
                <SelectTrigger className="h-11 text-sm rounded-xl">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="NEEDS_CLARIFICATION">Needs Clarification</SelectItem>
                  <SelectItem value="READY_FOR_ESTIMATION">Ready for Estimation</SelectItem>
                  <SelectItem value="ESTIMATED">Estimated</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingProject(null)} className="h-11 px-5 text-sm font-medium rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="h-11 px-5 text-sm font-semibold rounded-xl">
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
