"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { FolderPlus, Loader2, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/apiClient"
import { swalToast } from "@/lib/swal"

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required."),
  description: z.string().optional(),
})

type CreateProjectValues = z.infer<typeof createProjectSchema>

export default function NewProjectPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = React.useState<string | null>(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectValues>({
    resolver: zodResolver(createProjectSchema),
  })

  const onSubmit = async (data: CreateProjectValues) => {
    setError(null)
    try {
      const project = await apiClient.post("/projects", {
        name: data.name,
        description: data.description,
      }) as { id: string }

      await queryClient.invalidateQueries({ queryKey: ["projects"] })
      swalToast.success("Project workspace created successfully!")
      router.push(`/client/projects/${project.id}?tab=requirements`)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? (err.message || "Failed to create project.") : "Failed to create project."
      setError(errMsg)
      swalToast.error(errMsg)
    }
  }

  return (
    <div className="max-w-2xl space-y-7">
      <div className="flex items-center gap-2 text-xs sm:text-[13px] text-slate-500 dark:text-slate-400">
        <Link href="/client/projects" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 font-medium">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to My Projects</span>
        </Link>
      </div>

      <div>
        <h1 className="text-[22px] sm:text-[26px] lg:text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.2]">Start New Project</h1>
        <p className="mt-1.5 text-xs sm:text-[14px] md:text-[15px] text-slate-500 dark:text-slate-400 font-normal">
          Enter a project name to begin automated scoping, requirements analysis, and estimation.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-5 sm:p-7 shadow-xs">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-[17px] sm:text-[18px] font-semibold text-slate-900 dark:text-white leading-[1.3]">Project Information</h2>
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
              You can adjust these details later from your project settings.
            </p>
          </div>

          <div className="space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 p-3.5 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Project Name</Label>
              <Input
                id="name"
                placeholder="e.g. Healthcare Mobile App, E-commerce Store"
                className="h-11 text-sm rounded-xl border-slate-200 dark:border-slate-800 dark:bg-[#111625] dark:text-white dark:placeholder:text-slate-500 focus-visible:ring-indigo-500"
                autoFocus
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Short Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Brief summary of your project vision or target audience"
                className="h-11 text-sm rounded-xl border-slate-200 dark:border-slate-800 dark:bg-[#111625] dark:text-white dark:placeholder:text-slate-500 focus-visible:ring-indigo-500"
                {...register("description")}
              />
            </div>

            <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/client/projects")}
                className="h-11 px-5 text-sm font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 dark:bg-[#151b2c] hover:bg-slate-50 dark:hover:bg-slate-800 w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 px-6 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white shadow-xs w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  <>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Start Project
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
