"use client"

import * as React from "react"
import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import { 
  Sparkles, 
  Plus, 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  Layers, 
  Smartphone, 
  Cpu, 
  ShoppingCart, 
  FileSpreadsheet, 
  ShieldCheck, 
  Clock, 
  Headphones, 
  Check, 
  FolderKanban,
  MessageSquare,
  TrendingUp,
  Zap,
  Lock
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ClientWelcomeLandingProps {
  userName?: string
  activeProjectsCount?: number
  readyEstimatesCount?: number
  activeProject?: { id: string; name: string; status: string; description?: string | null } | null
  onStartProject: (initialData?: { name: string; description?: string }) => void
  onScheduleReview: () => void
  onContactArchitect: () => void
}

const PROJECT_TEMPLATES = [
  {
    id: "saas",
    title: "Enterprise SaaS Platform",
    category: "Web Application",
    tag: "Popular",
    icon: Lock,
    iconColor: "bg-blue-50/80 dark:bg-slate-800/80 text-blue-600 dark:text-blue-400 border border-blue-100/90 dark:border-blue-900/50",
    tagColor: "bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/50",
    linkColor: "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-500/50",
    description: "Multi-tenant cloud architecture with role-based access control, Stripe subscription billing, audit logs, and analytics dashboard.",
    defaultName: "Enterprise Cloud SaaS Platform",
    defaultDesc: "Multi-tenant cloud SaaS with organization workspace hierarchy, role-based security, billing integration, and real-time dashboard analytics."
  },
  {
    id: "ai",
    title: "AI & Vector Search Platform",
    category: "AI / ML Pipeline",
    tag: "Trending",
    icon: Cpu,
    iconColor: "bg-purple-50/80 dark:bg-slate-800/80 text-purple-600 dark:text-purple-400 border border-purple-100/90 dark:border-purple-900/50",
    tagColor: "bg-purple-50 text-purple-600 border border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/50",
    linkColor: "text-purple-600 hover:text-purple-700 dark:text-purple-400",
    hoverBorder: "hover:border-purple-300 dark:hover:border-purple-500/50",
    description: "Retrieval-Augmented Generation (RAG) system with vector embeddings, LLM orchestration, semantic search, and conversational UI.",
    defaultName: "AI-Powered Knowledge & Search Platform",
    defaultDesc: "Intelligent document processing and conversational agent with vector database indexing, semantic search, and secure LLM connectors."
  },
  {
    id: "mobile",
    title: "Cross-Platform Mobile App",
    category: "iOS & Android",
    tag: "Mobile",
    icon: Smartphone,
    iconColor: "bg-cyan-50/80 dark:bg-slate-800/80 text-cyan-600 dark:text-cyan-400 border border-cyan-100/90 dark:border-cyan-900/50",
    tagColor: "bg-cyan-50 text-cyan-700 border border-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/50",
    linkColor: "text-cyan-600 hover:text-cyan-700 dark:text-cyan-400",
    hoverBorder: "hover:border-cyan-300 dark:hover:border-cyan-500/50",
    description: "Cross-platform mobile application with offline-first synchronization, push notifications, biometric auth, and camera integration.",
    defaultName: "On-Demand Mobile Application",
    defaultDesc: "Cross-platform mobile app for iOS and Android featuring offline data sync, real-time push notifications, geolocation, and secure payments."
  },
  {
    id: "commerce",
    title: "Multi-Vendor Marketplace",
    category: "E-Commerce",
    tag: "Marketplace",
    icon: ShoppingCart,
    iconColor: "bg-emerald-50/80 dark:bg-slate-800/80 text-emerald-600 dark:text-emerald-400 border border-emerald-100/90 dark:border-emerald-900/50",
    tagColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50",
    linkColor: "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/50",
    description: "Digital marketplace with vendor storefronts, escrow checkout, automated inventory synchronization, and courier tracking.",
    defaultName: "B2B Multi-Vendor Marketplace",
    defaultDesc: "E-commerce marketplace platform supporting multiple vendor catalogs, order fulfillment, payout splits, and buyer dashboards."
  }
]

const WORKFLOW_STEPS = [
  {
    step: "01",
    name: "Requirements Brief",
    summary: "Upload PRD/SRS document or enter software features. AI parses modules, user personas, and acceptance criteria.",
    badge: "Input Stage",
    badgeColor: "bg-blue-50 text-blue-600 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/50",
    hoverBorder: "hover:border-blue-300 dark:hover:border-blue-500/50"
  },
  {
    step: "02",
    name: "AI Architecture Analysis",
    summary: "AI selects optimal tech stacks, databases, cloud services, and generates requirement completeness score.",
    badge: "Auto-Scanned",
    badgeColor: "bg-purple-50 text-purple-600 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/50",
    hoverBorder: "hover:border-purple-300 dark:hover:border-purple-500/50"
  },
  {
    step: "03",
    name: "Gaps & Clarifications",
    summary: "Interactive architectural Q&A resolves missing specifications to eliminate budget and timeline creep.",
    badge: "Scope Locking",
    badgeColor: "bg-amber-50 text-amber-600 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-500/50"
  },
  {
    step: "04",
    name: "Estimation & Pod Sizing",
    summary: "Calculates developer hours, sprint velocity, pod sizing, and contingency buffers across every epic.",
    badge: "Sprint Modeling",
    badgeColor: "bg-indigo-50 text-indigo-600 border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/50",
    hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-500/50"
  },
  {
    step: "05",
    name: "Production Deliverables",
    summary: "Generates structured 2-sheet Excel estimation workbook (Base Web + Optional Add-ons) & executive scope.",
    badge: "Executive Ready",
    badgeColor: "bg-emerald-50 text-emerald-600 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-500/50"
  }
]

// Container & child animation variants
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } 
  }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
}

export function ClientWelcomeLanding({
  userName,
  activeProjectsCount = 0,
  readyEstimatesCount = 0,
  activeProject,
  onStartProject,
  onScheduleReview,
  onContactArchitect
}: ClientWelcomeLandingProps) {
  const displayName = userName?.trim() || "Partner"

  return (
    <div className="w-full space-y-10 sm:space-y-12 pb-8">
      
      {/* 1. HERO WELCOME BANNER (With smooth entrance, animated ambient orbs, and interactive cards) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-gradient-to-br dark:from-[#0c101d] dark:via-[#0c101d] dark:to-[#080c15] p-6 sm:p-8 lg:p-10 shadow-xs transition-shadow duration-300 hover:shadow-md"
      >
        
        {/* Continuous Floating Ambient Orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.15, 1], 
            x: [0, 15, 0],
            y: [0, -12, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-indigo-300/10 dark:bg-indigo-600/10 blur-3xl pointer-events-none" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1], 
            x: [0, -18, 0],
            y: [0, 15, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute right-1/3 -bottom-16 h-64 w-64 rounded-full bg-purple-300/10 dark:bg-purple-600/10 blur-3xl pointer-events-none" 
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* LEFT COLUMN: Welcome Context, Subtitle, Actions, Micro-badges */}
          <div className="lg:col-span-7 space-y-5">
            {/* Eyebrow badge with gentle hover shine */}
            <motion.div 
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60 cursor-default"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span>AI Estimation &amp; Architecture Workspace</span>
            </motion.div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[38px] font-bold tracking-tight text-slate-900 dark:text-white leading-[1.18]">
              Welcome, {displayName}. <br />
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Turn Your Software Vision
              </span> Into An Executive Blueprint.
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl font-normal">
              Upload your specifications or select an architectural template to automatically generate sprint timelines, developer pod sizing, and a complete 2-sheet Excel estimation workbook in minutes.
            </p>

            {/* Primary Action Buttons with hover micro-animations */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="lg"
                  onClick={() => onStartProject()}
                  className="h-11 sm:h-12 px-6 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl shadow-xs hover:shadow-md transition-all group"
                >
                  <Plus className="mr-2 h-4 w-4 stroke-[3] group-hover:rotate-90 transition-transform duration-200" />
                  Start New Project Estimate
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </motion.div>

              {activeProjectsCount > 0 ? (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-11 sm:h-12 px-5 text-sm font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2c] hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl shadow-2xs transition-all"
                  >
                    <Link href="/client/projects">
                      <FolderKanban className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                      View All Projects ({activeProjectsCount})
                    </Link>
                  </Button>
                </motion.div>
              ) : (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={onScheduleReview}
                    className="h-11 sm:h-12 px-5 text-sm font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2c] hover:bg-slate-50 dark:hover:bg-slate-800/80 rounded-xl shadow-2xs transition-all"
                  >
                    <Calendar className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400" />
                    Schedule 1-on-1 Scoping Call
                  </Button>
                </motion.div>
              )}
            </div>

            {/* Value Micro-badges with hover pulse */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 pt-2 text-xs sm:text-[13px] font-medium text-slate-500 dark:text-slate-400">
              <motion.div whileHover={{ scale: 1.04 }} className="flex items-center gap-1.5 cursor-default transition-colors hover:text-slate-700 dark:hover:text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>5-Stage AI Scoping</span>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} className="flex items-center gap-1.5 cursor-default transition-colors hover:text-slate-700 dark:hover:text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>2-Sheet Production Excel</span>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} className="flex items-center gap-1.5 cursor-default transition-colors hover:text-slate-700 dark:hover:text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Enterprise SOC2 Security</span>
              </motion.div>
            </div>
          </div>

          {/* RIGHT COLUMN: Active Workspace Card or Instant Getting-Started Guide */}
          <div className="lg:col-span-5">
            {activeProjectsCount > 0 && activeProject ? (
              /* Active Workspace Card with hover lift */
              <motion.div 
                whileHover={{ y: -4, boxShadow: "0 14px 30px -8px rgba(79, 70, 229, 0.12)" }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0b0e1a] backdrop-blur-sm p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">CURRENT PROJECT WORKSPACE</span>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                    Active Scope
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-[17px] sm:text-[18px] font-semibold text-slate-900 dark:text-white leading-snug truncate">
                    {activeProject.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-normal">
                    {activeProject.description || "Active software estimation workspace with requirements decomposition, architecture specifications, and pod sizing."}
                  </p>
                </div>

                {/* Status metrics with subtle hover */}
                <div className="grid grid-cols-2 gap-3 py-1">
                  <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl bg-slate-50 dark:bg-[#111625] border border-slate-100 dark:border-slate-800 p-3 transition-colors hover:border-slate-200 dark:hover:border-slate-700">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Workspaces</p>
                    <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                      {activeProjectsCount} Project{activeProjectsCount === 1 ? '' : 's'}
                    </p>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} className="rounded-xl bg-slate-50 dark:bg-[#111625] border border-slate-100 dark:border-slate-800 p-3 transition-colors hover:border-emerald-200 dark:hover:border-slate-700">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Executive Scope</p>
                    <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {readyEstimatesCount} Ready
                    </p>
                  </motion.div>
                </div>

                {/* Direct Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                    <Button
                      asChild
                      className="w-full h-11 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl shadow-xs group"
                    >
                      <Link href={`/client/projects/${activeProject.id}`}>
                        <span>Open Workspace</span>
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </Link>
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151b2c] rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Link href="/client/projects">All Projects</Link>
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              /* Getting Started Quick-Guide Card (For new users) */
              <motion.div 
                whileHover={{ y: -4, boxShadow: "0 14px 30px -8px rgba(79, 70, 229, 0.12)" }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0b0e1a] backdrop-blur-sm p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">GET STARTED</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60">
                    Instant Scoping
                  </span>
                </div>

                <div>
                  <h3 className="text-[17px] sm:text-[18px] font-semibold text-slate-900 dark:text-white leading-snug">
                    How to Scope Your Software
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Follow 3 simple steps to generate an audit-ready sprint estimation:
                  </p>
                </div>

                <div className="space-y-3 text-xs sm:text-[13px] text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">1</span>
                    <span>Select an archetype below or enter your software features</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">2</span>
                    <span>Review AI architecture specs and clarify any open scope gaps</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px]">3</span>
                    <span>Export your 2-sheet Excel estimation workbook &amp; sprint roadmap</span>
                  </div>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={() => onStartProject()} 
                    className="w-full h-11 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl shadow-xs group"
                  >
                    <span>Launch Scoping Engine</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </div>

        </div>

      </motion.div>

      {/* 2. 1-CLICK QUICK-START PROJECT TEMPLATES (Scroll reveal + Card floating hover) */}
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        variants={fadeInUp}
        className="space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-[18px] sm:text-[20px] lg:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.25]">
              Quick-Start Project Archetypes
            </h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-0.5">
              Choose an architectural blueprint to immediately generate your project workspace:
            </p>
          </div>
          <span className="text-xs sm:text-sm font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#111625] border dark:border-slate-800 px-3 py-1 rounded-full w-fit">
            Instant 1-Click Launch
          </span>
        </div>

        <motion.div 
          variants={staggerContainer}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PROJECT_TEMPLATES.map((tpl) => {
            const Icon = tpl.icon
            return (
              <motion.div
                key={tpl.id}
                variants={fadeInUp}
                whileHover={{ 
                  y: -6, 
                  scale: 1.015,
                  boxShadow: "0 18px 35px -10px rgba(79, 70, 229, 0.12)"
                }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onStartProject({ name: tpl.defaultName, description: tpl.defaultDesc })}
                className={cn(
                  "group relative rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-6 shadow-xs transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4",
                  tpl.hoverBorder
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl group-hover:scale-110 transition-all duration-300 shadow-2xs", tpl.iconColor)}>
                      <Icon className="h-5.5 w-5.5 transition-transform duration-300" />
                    </div>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md", tpl.tagColor)}>
                      {tpl.tag}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      {tpl.category}
                    </span>
                    <h3 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-white transition-colors mt-0.5 leading-[1.3]">
                      {tpl.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 font-normal">
                    {tpl.description}
                  </p>
                </div>

                <div className={cn("pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm font-semibold transition-colors", tpl.linkColor)}>
                  <span>Use This Archetype</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1.5 transition-transform duration-200" />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </motion.div>

      {/* 3. THE 5-STAGE ESTIMATION LIFECYCLE (Interactive Walkthrough + Hover lift) */}
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={fadeInUp}
        className="rounded-3xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-7 sm:p-9 shadow-xs space-y-6 hover:shadow-md transition-shadow duration-300"
      >
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-indigo-600 dark:text-indigo-400 mb-1">
            <span>METHODOLOGY</span>
            <span>•</span>
            <span>END-TO-END WORKFLOW</span>
          </div>
          <h2 className="text-[18px] sm:text-[20px] lg:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.25]">
            How The 5-Stage Scoping Process Works
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
            Our structured approach guarantees accurate scope estimation and eliminates budget creep before development starts:
          </p>
        </div>

        <motion.div 
          variants={staggerContainer}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          {WORKFLOW_STEPS.map((st, idx) => (
            <motion.div 
              key={st.step}
              variants={fadeInUp}
              whileHover={{ 
                y: -5, 
                scale: 1.02,
                boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.08)"
              }}
              transition={{ duration: 0.2 }}
              className={cn(
                "group relative rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0b0f19] p-5 flex flex-col justify-between space-y-3.5 transition-colors",
                st.hoverBorder
              )}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-2xs">
                    {st.step}
                  </span>
                  <span className={cn("text-[10px] font-semibold border px-2.5 py-0.5 rounded-md", st.badgeColor)}>
                    {st.badge}
                  </span>
                </div>
                <h3 className="text-[15px] sm:text-[16px] font-semibold text-slate-900 dark:text-white leading-[1.3] transition-colors">
                  {st.name}
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  {st.summary}
                </p>
              </div>

              <div className="pt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1 border-t border-slate-200/60 dark:border-slate-800/60">
                <span>Stage {idx + 1} of 5</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* 4. SAMPLE DELIVERABLE SHOWCASE CARD (Scroll entrance + Interactive Stat Tiles) */}
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={fadeInUp}
        className="rounded-3xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-7 sm:p-10 shadow-xs hover:shadow-md transition-shadow duration-300"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          <div className="lg:col-span-7 space-y-4">
            <motion.div 
              whileHover={{ scale: 1.03 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 cursor-default"
            >
              <FileSpreadsheet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Production Deliverable Sample</span>
            </motion.div>

            <h2 className="text-[18px] sm:text-[20px] lg:text-[22px] font-semibold tracking-tight text-slate-900 dark:text-white leading-[1.25]">
              What You Receive Upon Project Completion
            </h2>

            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
              When your project estimation is complete, you receive a full architectural scope blueprint along with an executive 2-sheet Excel estimation workbook:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <motion.div 
                whileHover={{ scale: 1.025 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0b0f19]/80 p-4 space-y-1.5 transition-colors cursor-default shadow-2xs"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4 stroke-[3] text-emerald-600 dark:text-emerald-400" />
                  <span>Sheet 1: Web Estimation</span>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Complete base production scope with foundational architecture, security, auth, backend, UI, and QA.
                </p>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.025 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0b0f19]/80 p-4 space-y-1.5 transition-colors cursor-default shadow-2xs"
              >
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-4 w-4 stroke-[3] text-emerald-600 dark:text-emerald-400" />
                  <span>Sheet 2: Optional Add-Ons</span>
                </div>
                <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Prioritized optional features, premium modules, and roadmap enhancements priced independently.
                </p>
              </motion.div>
            </div>

            <div className="pt-2">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={() => onStartProject()}
                  className="h-11 px-6 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl shadow-xs transition-all group"
                >
                  <Plus className="mr-2 h-4 w-4 stroke-[3] group-hover:rotate-90 transition-transform duration-200" />
                  Start My Project Scope Now
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Right Preview Card with hover depth */}
          <motion.div 
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
            className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0b0f19]/90 p-6 space-y-4 shadow-xs"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold tracking-wider text-[11px] text-slate-400 uppercase">
                SAMPLE BLUEPRINT PREVIEW
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                100% Ready
              </span>
            </div>

            <div>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold">#PRJ-DEMO</p>
              <h3 className="text-[17px] sm:text-[18px] font-bold text-slate-900 dark:text-white mt-1 leading-[1.3]">
                AI Creator &amp; Brand Matchmaking Platform
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 text-center">
              <motion.div whileHover={{ scale: 1.03 }} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111625] border border-slate-100 dark:border-slate-800 transition-colors">
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">1,171 h</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Total Dev</p>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} className="p-3 rounded-xl bg-slate-50 dark:bg-[#111625] border border-slate-100 dark:border-slate-800 transition-colors">
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">7 Sprints</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">14 Weeks</p>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} className="p-3 rounded-xl bg-emerald-50/70 dark:bg-[#111625] border border-emerald-200/80 dark:border-emerald-500/30">
                <p className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-300">Fixed Pod</p>
                <p className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400 uppercase tracking-wider mt-0.5">Budget Model</p>
              </motion.div>
            </div>

            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Executive Summary &amp; Milestone Timeline</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>2-Sheet Production Excel Workbook Included</span>
              </div>
            </div>
          </motion.div>

        </div>
      </motion.div>

      {/* 5. ENTERPRISE GUARANTEES (Scroll entrance + Card lift with icon spin) */}
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        variants={staggerContainer}
        className="grid gap-5 sm:grid-cols-3"
      >
        <motion.div 
          variants={fadeInUp}
          whileHover={{ 
            y: -6, 
            scale: 1.015,
            boxShadow: "0 14px 30px -8px rgba(79, 70, 229, 0.12)" 
          }}
          transition={{ duration: 0.2 }}
          className="group rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-6 sm:p-7 shadow-xs space-y-2.5 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors cursor-default"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-2xs">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-[1.3]">Zero Scope Ambiguity</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Stage 3 architectural clarification prevents budget surprises and scope creep before you commit to development.
          </p>
        </motion.div>

        <motion.div 
          variants={fadeInUp}
          whileHover={{ 
            y: -6, 
            scale: 1.015,
            boxShadow: "0 14px 30px -8px rgba(79, 70, 229, 0.12)" 
          }}
          transition={{ duration: 0.2 }}
          className="group rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-6 sm:p-7 shadow-xs space-y-2.5 hover:border-cyan-300 dark:hover:border-cyan-500/50 transition-colors cursor-default"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 dark:bg-slate-800/80 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300 shadow-2xs">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <h3 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors leading-[1.3]">Production Excel Workbooks</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Formatted specifically with Sheet 1 (Web Estimation) and Sheet 2 (Optional Add-Ons) for direct CFO and board presentation.
          </p>
        </motion.div>

        <motion.div 
          variants={fadeInUp}
          whileHover={{ 
            y: -6, 
            scale: 1.015,
            boxShadow: "0 14px 30px -8px rgba(79, 70, 229, 0.12)" 
          }}
          transition={{ duration: 0.2 }}
          className="group rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-6 sm:p-7 shadow-xs space-y-2.5 hover:border-purple-300 dark:hover:border-purple-500/50 transition-colors cursor-default"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 dark:bg-slate-800/80 text-purple-600 dark:text-purple-400 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-2xs">
            <Clock className="h-6 w-6" />
          </div>
          <h3 className="text-[16px] sm:text-[17px] font-semibold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-[1.3]">10-Minute Scoping Velocity</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            What typically takes weeks of manual agency back-and-forth is synthesized and benchmarked in minutes with AI precision.
          </p>
        </motion.div>
      </motion.div>

      {/* 6. BOTTOM CONSULTATION BAR (Scroll entrance + Interactive CTA buttons) */}
      <motion.div 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-40px" }}
        variants={fadeInUp}
        className="rounded-3xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0e1322] p-7 sm:p-9 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6 hover:shadow-md transition-shadow duration-300"
      >
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-slate-800/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700/60 shadow-2xs">
            <Headphones className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-[17px] sm:text-[18px] lg:text-[20px] font-semibold text-slate-900 dark:text-white leading-[1.25]">
              Need assistance drafting your requirements?
            </h3>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-0.5">
              Our technical solutions team is available for a direct 1-on-1 walkthrough to help articulate your software specifications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 shrink-0">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={onContactArchitect}
              className="h-11 px-5 text-sm font-semibold text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-[#151b2c] dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <MessageSquare className="mr-2 h-4.5 w-4.5 text-slate-500 dark:text-slate-400" />
              Ask A Question
            </Button>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              size="sm"
              onClick={onScheduleReview}
              className="h-11 px-5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl shadow-xs hover:shadow-md transition-all"
            >
              <Calendar className="mr-2 h-4.5 w-4.5" />
              Schedule 15-min Review
            </Button>
          </motion.div>
        </div>
      </motion.div>

    </div>
  )
}
