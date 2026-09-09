"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/apiClient"
import { useAuth } from "@/components/providers/auth-provider"
import { swalToast, swalModal, swalConfirm } from "@/lib/swal"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Mail, Plus, Edit, Trash2, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, Shield } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { AdminPagination } from "@/components/admin/admin-pagination"

interface User {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<User | null>(null)
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

  // Reset pagination to page 1 on search or sort change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, sortBy, sortOrder])

  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "CLIENT"
  })

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "users", { search: debouncedSearch, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (sortBy) params.set("sortBy", sortBy)
      if (sortOrder) params.set("sortOrder", sortOrder)
      const qs = params.toString() ? `?${params.toString()}` : ""
      return await apiClient.get(`/admin/users${qs}`) as User[]
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => await apiClient.post("/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      setIsAddOpen(false)
      setFormData({ name: "", email: "", password: "", role: "CLIENT" })
      swalToast.success("User created successfully")
    },
    onError: (err: Error) => swalToast.error(err.message || "Failed to create user")
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => await apiClient.put(`/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      setIsEditOpen(false)
      setEditingUser(null)
      swalToast.success("User updated successfully")
    },
    onError: (err: Error) => swalToast.error(err.message || "Failed to update user")
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await apiClient.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      swalToast.success("User deleted successfully")
    },
    onError: (err: Error) => {
      swalToast.error(err.message || "Failed to delete user")
    }
  })

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData as Record<string, unknown>)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    const payload: Record<string, unknown> = { name: formData.name, email: formData.email, role: formData.role }
    if (formData.password) payload.password = formData.password
    updateMutation.mutate({ id: editingUser.id, data: payload })
  }

  const isUserSelf = (targetUser: User) => {
    return Boolean(
      currentUser && (
        (currentUser.id && currentUser.id === targetUser.id) ||
        (currentUser.email && currentUser.email.toLowerCase() === targetUser.email.toLowerCase())
      )
    )
  }

  const openEdit = (user: User) => {
    if (isUserSelf(user)) {
      swalModal.warning("Action Not Allowed", "You cannot edit your own admin account from the users list.")
      return
    }
    setEditingUser(user)
    setFormData({ name: user.name || "", email: user.email, password: "", role: user.role })
    setIsEditOpen(true)
  }

  const confirmDelete = async (user: User) => {
    if (isUserSelf(user)) {
      swalModal.warning("Action Not Allowed", "You cannot delete your own admin account.")
      return
    }
    const confirmed = await swalConfirm({
      title: "Delete User",
      text: `Are you sure you want to delete user "${user.name || user.email}"? All associated data will be permanently removed.`,
      confirmText: "Delete User",
      isDestructive: true
    })
    if (confirmed) {
      deleteMutation.mutate(user.id)
    }
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

  const totalUsers = users?.length ?? 0
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE)

  React.useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const paginatedUsers = React.useMemo(() => {
    if (!users) return []
    const start = (currentPage - 1) * PAGE_SIZE
    return users.slice(start, start + PAGE_SIZE)
  }, [users, currentPage])

  return (
    <div className="space-y-8">
      <div className="border-b border-border/60 pb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-[26px] lg:text-[28px] font-semibold leading-tight tracking-tight text-foreground">
            Users
          </h1>
          <p className="mt-1.5 text-sm sm:text-[15px] text-muted-foreground">
            Manage all users on the platform{users ? ` (${users.length} total)` : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 px-5 rounded-xl font-semibold shadow-xs flex items-center gap-2 text-sm">
                <Plus className="h-4 w-4" /> Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="p-6 rounded-2xl">
              <form onSubmit={handleAddSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl font-semibold">Add New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Name</Label>
                    <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-11 text-sm rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Email</Label>
                    <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="h-11 text-sm rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Password</Label>
                    <Input type="password" required minLength={6} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="h-11 text-sm rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Role</Label>
                    <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                      <SelectTrigger className="h-11 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLIENT">Client</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="h-11 px-5 text-sm font-medium rounded-xl">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} className="h-11 px-5 text-sm font-semibold rounded-xl">
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {createMutation.isPending ? "Creating..." : "Create User"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center max-w-md flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 text-sm rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <span className="text-xs sm:text-[13px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-11 text-sm font-medium rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Joined Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="role">Role</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-11 px-4 text-sm font-semibold rounded-xl flex items-center gap-2"
            onClick={() => setSortOrder(prev => prev === "asc" ? "desc" : "asc")}
            title={sortOrder === "asc" ? "Ascending order" : "Descending order"}
          >
            {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            {sortOrder === "asc" ? "Asc" : "Desc"}
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="rounded-2xl border-border/80 shadow-xs overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs sm:text-[13px] uppercase bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="px-5 sm:px-6 py-4 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("name")}
                    className="flex items-center group uppercase font-semibold text-xs sm:text-[13px] text-muted-foreground hover:text-foreground"
                  >
                    User
                    {renderSortIndicator("name")}
                  </button>
                </th>
                <th className="px-5 sm:px-6 py-4 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("email")}
                    className="flex items-center group uppercase font-semibold text-xs sm:text-[13px] text-muted-foreground hover:text-foreground"
                  >
                    Email
                    {renderSortIndicator("email")}
                  </button>
                </th>
                <th className="px-5 sm:px-6 py-4 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("role")}
                    className="flex items-center group uppercase font-semibold text-xs sm:text-[13px] text-muted-foreground hover:text-foreground"
                  >
                    Role
                    {renderSortIndicator("role")}
                  </button>
                </th>
                <th className="px-5 sm:px-6 py-4 font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("createdAt")}
                    className="flex items-center group uppercase font-semibold text-xs sm:text-[13px] text-muted-foreground hover:text-foreground"
                  >
                    Joined Date
                    {renderSortIndicator("createdAt")}
                  </button>
                </th>
                <th className="px-5 sm:px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading users...</span>
                  </td>
                </tr>
              ) : users?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    {debouncedSearch.trim() ? "No users match your search query." : "No users found on the platform."}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isSelf = isUserSelf(user)
                  return (
                    <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-5 sm:px-6 py-4 font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                            {user.name ? user.name.slice(0, 2).toUpperCase() : <Users className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold text-sm sm:text-[15px]">{user.name || "Unnamed User"}</span>
                              {isSelf && (
                                <Badge className="text-xs px-2.5 py-0.5 bg-primary/15 hover:bg-primary/20 text-primary font-bold border border-primary/30 tracking-wide rounded-full">
                                  You
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 sm:px-6 py-4 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate text-sm">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-5 sm:px-6 py-4">
                        <Badge
                          variant={user.role === "ADMIN" ? "default" : "secondary"}
                          className={user.role === "ADMIN" ? "bg-indigo-600 hover:bg-indigo-600 text-white font-medium text-xs px-3 py-1 rounded-full" : "font-normal text-xs px-3 py-1 rounded-full"}
                        >
                          {user.role === "ADMIN" ? "Admin" : "Client"}
                        </Badge>
                      </td>
                      <td className="px-5 sm:px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-5 sm:px-6 py-4 text-right whitespace-nowrap">
                        {isSelf ? (
                          <div className="flex items-center justify-end">
                            <span 
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted/60 px-3 py-1 rounded-xl border border-border/60 select-none"
                              title="Current account cannot be edited or deleted here"
                            >
                              <Shield className="h-3.5 w-3.5 text-primary" />
                              <span>You (Protected)</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                              onClick={() => openEdit(user)}
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit user</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
                              onClick={() => confirmDelete(user)}
                              title="Delete User"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete user</span>
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Integrated Pagination Controls */}
        <AdminPagination
          currentPage={currentPage}
          totalItems={totalUsers}
          itemsPerPage={PAGE_SIZE}
          onPageChange={setCurrentPage}
          itemName="users"
        />
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="p-6 rounded-2xl">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-semibold">Edit User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Name</Label>
                <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="h-11 text-sm rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Email</Label>
                <Input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="h-11 text-sm rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Password (Leave blank to keep current)</Label>
                <Input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="h-11 text-sm rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Role</Label>
                <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                  <SelectTrigger className="h-11 text-sm rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT">Client</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="h-11 px-5 text-sm font-medium rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="h-11 px-5 text-sm font-semibold rounded-xl">
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {updateMutation.isPending ? "Updating..." : "Update User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
