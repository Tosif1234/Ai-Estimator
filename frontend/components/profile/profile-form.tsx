"use client"

import * as React from "react"
import { useAuth, User, getWorkspaceLabel } from "@/components/providers/auth-provider"
import { apiClient } from "@/lib/api/apiClient"
import { getAvatarUrl, getInitials, cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  Loader2,
  Camera,
  Trash2,
  CheckCircle2,
  Mail,
  Calendar,
  ShieldCheck,
  Activity,
  UserCheck,
  Lock,
  Sparkles,
} from "lucide-react"
import { swalToast } from "@/lib/swal"

export function ProfileForm() {
  const { user, updateUser } = useAuth()
  const [name, setName] = React.useState(user?.name || "")
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [localPreview, setLocalPreview] = React.useState<string | null>(null)
  const [pendingAvatarRemove, setPendingAvatarRemove] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Sync local name state with auth user
  React.useEffect(() => {
    if (user?.name !== undefined) {
      setName(user.name || "")
    }
  }, [user?.name])

  // Clean up object URL on unmount or change
  React.useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview)
      }
    }
  }, [localPreview])

  if (!user) return null

  const initials = getInitials(user.name)
  const displayName = user.name?.trim() || "User"
  const persistedAvatarUrl = getAvatarUrl(user.avatarUrl)

  // What avatar to show in the preview circle
  const displayAvatarUrl = pendingAvatarRemove
    ? null
    : (localPreview || persistedAvatarUrl)

  const hasNameChanges = name.trim() !== (user.name || "")
  const hasAvatarChanges = selectedFile !== null || pendingAvatarRemove
  const hasChanges = hasNameChanges || hasAvatarChanges

  const formattedMemberSince = (() => {
    if (!user.createdAt) return "Active member"
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(user.createdAt))
    } catch {
      return "Active member"
    }
  })()

  // File selection: creates local preview ONLY, does NOT upload to DB yet!
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ""

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      swalToast.error("Invalid file type. Only JPG, PNG, and WEBP images are allowed.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      swalToast.error("File size exceeds 5 MB limit.")
      return
    }

    if (localPreview) {
      URL.revokeObjectURL(localPreview)
    }

    const previewUrl = URL.createObjectURL(file)
    setLocalPreview(previewUrl)
    setSelectedFile(file)
    setPendingAvatarRemove(false)
    swalToast.info("Photo selected. Click Save Changes to apply.")
  }

  // Stage avatar removal (shows initials preview, persists only when Save Changes is clicked)
  const handleRemovePhoto = () => {
    if (localPreview) {
      URL.revokeObjectURL(localPreview)
      setLocalPreview(null)
    }
    setSelectedFile(null)
    if (user.avatarUrl) {
      setPendingAvatarRemove(true)
    }
    swalToast.info("Photo removed. Click Save Changes to apply.")
  }

  // Cancel all pending changes (reverts preview & name)
  const handleCancel = () => {
    setName(user.name || "")
    if (localPreview) {
      URL.revokeObjectURL(localPreview)
      setLocalPreview(null)
    }
    setSelectedFile(null)
    setPendingAvatarRemove(false)
    swalToast.info("Changes canceled.")
  }

  // Save Changes: only now do we upload image or delete old avatar or update name!
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      swalToast.error("Full name is required.")
      return
    }

    if (trimmedName.length < 2 || trimmedName.length > 50) {
      swalToast.error("Full name must be between 2 and 50 characters.")
      return
    }

    setIsSaving(true)
    try {
      let updatedAvatarUrl = user.avatarUrl
      let updatedName = user.name

      // 1. Upload avatar if user picked a new file
      if (selectedFile) {
        const formData = new FormData()
        formData.append("file", selectedFile)
        const uploadRes = (await apiClient.post("/auth/me/avatar", formData)) as User
        updatedAvatarUrl = uploadRes.avatarUrl
      } else if (pendingAvatarRemove) {
        // 2. Remove avatar if user requested removal
        await apiClient.delete("/auth/me/avatar")
        updatedAvatarUrl = null
      }

      // 3. Update full name if modified
      if (hasNameChanges) {
        const nameRes = (await apiClient.patch("/auth/me", { name: trimmedName })) as User
        updatedName = nameRes.name
      }

      // 4. Update global AuthProvider context
      updateUser({
        name: updatedName,
        avatarUrl: updatedAvatarUrl,
      })

      // Clean up staged preview state
      if (localPreview) {
        URL.revokeObjectURL(localPreview)
        setLocalPreview(null)
      }
      setSelectedFile(null)
      setPendingAvatarRemove(false)

      swalToast.success("Profile updated successfully.")
    } catch (err: any) {
      swalToast.error(err?.message || "Failed to update profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-5 w-full max-w-[1400px] mx-auto">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <h1 className="text-[24px] sm:text-[26px] lg:text-[28px] font-semibold tracking-tight text-foreground leading-[1.2]">
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1 text-[14px] sm:text-[15px] font-normal">
            Manage your personal credentials, profile picture, and account settings.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start sm:self-auto px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{getWorkspaceLabel(user.role)}</span>
        </div>
      </div>

      {/* Pure 2-Card Layout (Desktop 2-columns, Mobile 1-column) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* CARD 1: Edit Profile */}
        <Card className="rounded-2xl border-border/80 shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="p-5 pb-3 border-b border-border/60 bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-[17px] sm:text-[18px] font-semibold text-foreground">Edit Profile</CardTitle>
                  <CardDescription className="text-[13px] text-muted-foreground mt-0.5">
                    Update your public display name and avatar photo.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {/* Profile Photo Studio */}
              <div>
                <Label className="text-[13px] font-medium text-foreground block mb-2">
                  Profile Photo
                </Label>
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 p-3.5 rounded-xl border border-border/70 bg-muted/20">
                  {/* Avatar Frame with Online Dot */}
                  <div className="relative flex h-20 w-20 shrink-0">
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground text-2xl font-bold shadow-md overflow-hidden ring-4 ring-card">
                      {displayAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayAvatarUrl}
                          alt={displayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                    {/* Active pulsing green dot */}
                    <span className="absolute bottom-0 right-0 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 ring-2 ring-card" />
                    </span>
                  </div>

                  {/* Photo Action Buttons */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={isSaving}
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSaving}
                        className="h-9 px-3.5 text-xs font-medium rounded-lg shadow-xs"
                      >
                        <Camera className="mr-1.5 h-3.5 w-3.5" />
                        Change Photo
                      </Button>

                      {(displayAvatarUrl || user.avatarUrl) && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={handleRemovePhoto}
                          disabled={isSaving || pendingAvatarRemove}
                          className="h-9 px-3 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-normal">
                      JPG, PNG or WEBP • Max 5 MB {selectedFile && <span className="text-primary font-medium block sm:inline sm:ml-1">• Ready to save</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Full Name Edit Field */}
              <form id="profile-edit-form" onSubmit={handleSave} className="space-y-2">
                <Label htmlFor="fullName" className="text-[13px] font-medium text-foreground">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving}
                  placeholder="Enter your full name"
                  className="h-11 text-sm rounded-xl"
                />
                <p className="text-[12px] text-muted-foreground">
                  This is the display name shown across your workspace and reports.
                </p>
              </form>
            </CardContent>
          </div>

          {/* Form Actions Footer */}
          <CardFooter className="p-4 px-5 border-t border-border/60 bg-muted/10 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={!hasChanges || isSaving}
              className="h-10 px-4 text-sm font-medium rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="profile-edit-form"
              size="sm"
              disabled={!hasChanges || isSaving}
              className="h-10 px-5 text-sm font-medium rounded-xl shadow-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* CARD 2: Account Information */}
        <Card className="rounded-2xl border-border/80 shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <CardHeader className="p-5 pb-3 border-b border-border/60 bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-[17px] sm:text-[18px] font-semibold text-foreground">Account Information</CardTitle>
                  <CardDescription className="text-[13px] text-muted-foreground mt-0.5">
                    Your current account status, role, and system credentials.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-3">
              {/* Email Address Tile */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Email Address
                    </p>
                    <p className="text-sm font-medium text-foreground truncate mt-0.5">
                      {user.email}
                    </p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified
                </span>
              </div>

              {/* Account Role Tile */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Account Role
                    </p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {getWorkspaceLabel(user.role)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                  {user.role}
                </span>
              </div>

              {/* Account Status Tile */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Account Status
                    </p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      Active & Protected
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>

              {/* Member Since Tile */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Member Since
                    </p>
                    <p className="text-sm font-medium text-foreground mt-0.5">
                      {formattedMemberSince}
                    </p>
                  </div>
                </div>
                <span className="text-[12px] font-normal text-muted-foreground hidden sm:block">
                  Standard Account
                </span>
              </div>
            </CardContent>
          </div>

          {/* Security & Access Callout Footer */}
          <CardFooter className="p-4 px-5 border-t border-border/60 bg-muted/10">
            <div className="flex items-start gap-2.5 text-xs text-muted-foreground">
              <Lock className="h-4 w-4 text-muted-foreground/80 shrink-0 mt-0.5" />
              <span className="font-normal">
                Account credentials and system permissions are strictly read-only and governed by enterprise access controls.
              </span>
            </div>
          </CardFooter>
        </Card>

      </div>
    </div>
  )
}
