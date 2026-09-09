"use client"

import * as React from "react"
import Link from "next/link"
import { 
  FolderKanban, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  FileText, 
  ArrowRight,
  ShieldCheck,
  Calculator,
  Compass,
  Headphones
} from "lucide-react"
import { Button } from "@/components/ui/button"

const STAGES = [
  {
    step: "1",
    title: "Requirements",
    description: "Provide your software scope and functional expectations in natural language or upload existing requirement documents (.pdf, .txt). Saved text forms the authoritative baseline specification for architectural scoping."
  },
  {
    step: "2",
    title: "AI Analysis",
    description: "The AI engine analyzes your requirement text to identify the optimal tech stack, database models, cloud services, modular epics, and integration touchpoints, generating an automated completeness score."
  },
  {
    step: "3",
    title: "Gaps & Clarifications",
    description: "To eliminate technical assumptions, the system detects architecture gaps and presents targeted clarification questions. You can choose recommended options or type custom answers to lock down scope and eliminate budget creep."
  },
  {
    step: "4",
    title: "Estimation & Pod Modeling",
    description: "Once clarifications are resolved, engineering effort is calculated with sprint velocity and pod sizing. Tasks are calibrated across frontend, backend, security, database, and QA with contingency buffers."
  },
  {
    step: "5",
    title: "Reports & Deliverables",
    description: "Access your final deliverables, including the boardroom-ready 2-Sheet Excel Estimation Workbook (.xlsx) with core production scope and optional add-ons, plus calibrated architecture blueprints."
  }
]

const FAQS = [
  {
    q: "What format are estimation reports exported in?",
    a: "Reports are exported in an executive-ready Excel workbook format (.xlsx), structured specifically into Sheet 1 (Web Estimation: foundational architecture and core production scope) and Sheet 2 (Optional Add-Ons: prioritized premium enhancements priced independently)."
  },
  {
    q: "What happens when I answer clarification questions in Stage 3?",
    a: "When you submit answers, the architectural baseline is calibrated with your decisions. This eliminates scope ambiguity and protects against timeline creep before sprint planning begins."
  },
  {
    q: "Can I update my project requirements after creating them?",
    a: "Yes. You can edit requirements in Stage 1 at any time. If you make major changes, re-running analysis and clarification will calibrate an updated version of your estimate."
  },
  {
    q: "How are developer hours and team pod sizing calculated?",
    a: "Our estimation model factors in epic complexity, technology stack multipliers, security standards, test coverage, and regression buffers based on enterprise benchmarks."
  }
]

export default function ClientHelpPage() {
  return (
    <div className="space-y-8 sm:space-y-10 pb-8">
      
      {/* Page Header */}
      <div className="flex flex-col gap-1.5 sm:gap-2 pb-5 sm:pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold tracking-wider uppercase text-blue-600 dark:text-indigo-400 mb-0.5">
          <Compass className="h-4 w-4 text-blue-600 dark:text-indigo-400" />
          <span>Knowledge Base &amp; Workspace Guide</span>
        </div>
        <h1 className="text-[24px] sm:text-[26px] lg:text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.2]">
          Help &amp; Workspace Guide
        </h1>
        <p className="text-[14px] sm:text-[15px] font-normal text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
          Learn how our 5-stage project scoping lifecycle turns your software requirements into accurate sprint timelines, pod sizing, and production deliverables.
        </p>
      </div>

      {/* The 5-Stage Estimation Journey */}
      <section className="space-y-5">
        <div>
          <h2 className="text-[18px] sm:text-[20px] lg:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.25]">
            The 5-Stage Scoping Lifecycle
          </h2>
          <p className="text-[13px] sm:text-[14px] font-normal text-slate-500 dark:text-slate-400 mt-1">
            Every project in your workspace follows this step-by-step technical scoping process:
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STAGES.map((st) => (
            <div
              key={st.step}
              className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-5 shadow-xs hover:shadow-sm hover:border-blue-200 dark:hover:border-indigo-500/50 transition-all flex flex-col justify-start space-y-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 dark:bg-indigo-600 text-white text-xs font-mono font-semibold shadow-2xs">
                  0{st.step}
                </span>
                <h3 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-white leading-[1.3]">
                  {st.title}
                </h3>
              </div>
              <p className="text-[13px] sm:text-[13.5px] font-normal text-slate-600 dark:text-slate-400 leading-relaxed">
                {st.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="space-y-5 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-[18px] sm:text-[20px] lg:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.25]">
            Common Questions
          </h2>
          <p className="text-[13px] sm:text-[14px] font-normal text-slate-500 dark:text-slate-400 mt-1">
            Quick guidance on managing your project specifications and deliverables:
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {FAQS.map((faq, idx) => (
            <div 
              key={idx} 
              className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-5 space-y-2 shadow-xs hover:shadow-sm transition-all"
            >
              <h3 className="text-[15px] sm:text-[16px] font-semibold text-slate-900 dark:text-white leading-[1.3]">
                {faq.q}
              </h3>
              <p className="text-[13.5px] sm:text-[14px] font-normal text-slate-600 dark:text-slate-400 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Need Direct Help Banner */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-slate-800/80 text-blue-600 dark:text-indigo-400 border border-blue-100 dark:border-slate-700/60">
            <Headphones className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[17px] sm:text-[18px] font-semibold text-slate-900 dark:text-white leading-[1.25]">
              Need assistance with your requirements?
            </h3>
            <p className="text-[13px] sm:text-[14px] font-normal text-slate-500 dark:text-slate-400 mt-0.5">
              Our technical solutions team is available for a 1-on-1 review call.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <Button
            asChild
            className="w-full sm:w-auto h-11 px-5 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl shadow-xs justify-center"
          >
            <Link href="/client/projects">
              <span>Go to My Projects</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

    </div>
  )
}
