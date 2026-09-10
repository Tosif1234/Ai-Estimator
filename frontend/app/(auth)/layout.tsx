"use client"

import * as React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Brain, Layers, Key, Sparkles } from "lucide-react"
import { AuthTransitionWrapper } from "@/components/auth/AuthTransitionWrapper"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-100/80 dark:bg-[#060913] p-4 sm:p-6 lg:p-8 font-sans overflow-hidden transition-colors duration-300">
      
      {/* Modern Background: Grid Dots Pattern */}
      <div 
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-30" 
      />

      {/* Atmospheric Ambient Lighting Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Center-Top Radial Aura */}
        <div className="absolute top-[-15%] left-[20%] w-[60%] h-[50%] rounded-full bg-gradient-to-b from-blue-400/15 via-indigo-400/10 to-transparent dark:from-blue-600/15 dark:via-indigo-600/10 blur-3xl" />
        {/* Bottom-Right Radial Glow */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-blue-600/15 blur-3xl" />
        {/* Top-Left Accent Glow */}
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-sky-400/10 dark:bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Main Glass/Card Container */}
      <div className="relative flex w-full max-w-[1150px] h-[90vh] min-h-[560px] max-h-[730px] flex-col lg:flex-row overflow-hidden rounded-[2rem] bg-white dark:bg-[#0f1422] shadow-[0_20px_50px_rgba(0,0,0,0.07)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] border border-slate-200/90 dark:border-[#1c2438] transition-colors duration-300">
        
        {/* Left Form Content */}
        <div className="relative flex flex-1 flex-col bg-white dark:bg-[#0f1422] overflow-hidden transition-colors duration-300">
          
          {/* Top Brand Link */}
          <div className="px-6 sm:px-10 lg:px-14 pt-6 pb-0 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center space-x-2 text-foreground group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#3d65f5] to-[#6c8cff] flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-gray-900 dark:text-white">
                AI <span className="text-[#3d65f5] dark:text-[#5e88ff]">Estimator</span>
              </span>
            </Link>
          </div>

          <div className="relative z-10 flex h-full w-full justify-center px-6 sm:px-10 lg:px-14 py-4 overflow-y-auto no-scrollbar">
            <div className="w-full max-w-[420px] my-auto flex flex-col justify-center">
              <AuthTransitionWrapper>
                {children}
              </AuthTransitionWrapper>
            </div>
          </div>
        </div>

        {/* Right Showcase Panel (Desktop) */}
        <div className="relative hidden lg:block lg:w-[46%] overflow-hidden text-left bg-[#2554e8] dark:bg-[#0e172e] transition-colors duration-300 select-none">
          
          {/* Smooth Organic Layered Wave Background */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 500 700"
            preserveAspectRatio="none"
            fill="none"
          >
            <defs>
              {/* Light Mode Gradients */}
              <linearGradient id="waveGradTopLight" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1a3cb8" />
                <stop offset="100%" stopColor="#2554e8" />
              </linearGradient>
              <linearGradient id="waveGradMidLight" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2e5ef4" />
                <stop offset="100%" stopColor="#3d6dfa" />
              </linearGradient>
              <linearGradient id="waveGradBotLight" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4576ff" />
                <stop offset="100%" stopColor="#5c87ff" />
              </linearGradient>

              {/* Dark Mode Gradients */}
              <linearGradient id="waveGradTopDark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0b1124" />
                <stop offset="100%" stopColor="#111c3a" />
              </linearGradient>
              <linearGradient id="waveGradMidDark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#142145" />
                <stop offset="100%" stopColor="#192b57" />
              </linearGradient>
              <linearGradient id="waveGradBotDark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1a2f64" />
                <stop offset="100%" stopColor="#223b7a" />
              </linearGradient>
            </defs>

            {/* Base Background Fill */}
            <rect width="500" height="700" className="fill-[#1f4cdb] dark:fill-[#0c1429] transition-colors duration-300" />

            {/* Top Wave Layer */}
            <path
              d="M -50 -50 
                 L 550 -50 
                 L 550 240 
                 C 380 280, 220 160, -50 200 
                 Z"
              className="fill-[url(#waveGradTopLight)] dark:fill-[url(#waveGradTopDark)] transition-colors duration-300 opacity-90"
            />

            {/* Middle Wave Layer */}
            <path
              d="M -50 180 
                 C 150 260, 320 200, 550 360 
                 L 550 560 
                 C 340 440, 180 540, -50 460 
                 Z"
              className="fill-[url(#waveGradMidLight)] dark:fill-[url(#waveGradMidDark)] transition-colors duration-300 opacity-70"
            />

            {/* Bottom-to-Right Swooping Wave */}
            <path
              d="M -50 420 
                 C 140 500, 310 420, 550 530 
                 L 550 750 
                 L -50 750 
                 Z"
              className="fill-[url(#waveGradBotLight)] dark:fill-[url(#waveGradBotDark)] transition-colors duration-300 opacity-80"
            />
          </svg>

          {/* Floating Cards Container */}
          <div className="relative h-full flex flex-col justify-center items-center p-8 xl:p-12 space-y-9 z-10">
            
            {/* Top Floating Card (Active Projects) */}
            <motion.div 
              className="relative w-full max-w-[290px] bg-white dark:bg-[#141b2e] rounded-[26px] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/60 dark:border-white/10 mr-12 transition-all duration-300"
              initial={{ y: 0 }}
              animate={{ y: -10 }}
              transition={{ duration: 4.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            >
              {/* Card Title */}
              <h3 className="text-[#f28e2c] dark:text-[#fba34b] font-bold text-[13px] tracking-wide mb-1">
                Active Projects
              </h3>
              
              {/* Main Metric */}
              <div className="text-[34px] font-black text-gray-900 dark:text-white tracking-tight mb-5 leading-none">
                176,18
              </div>
              
              {/* Dual Wave Graph */}
              <div className="relative w-full h-12">
                <svg viewBox="0 0 200 45" className="w-full h-full overflow-visible">
                  {/* Orange Curved Line */}
                  <path 
                    d="M 5,28 Q 28,12 50,28 T 90,26 T 130,12 T 160,38 T 195,18" 
                    fill="none" 
                    stroke="#f28e2c" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                  />
                  {/* Blue Curved Line */}
                  <path 
                    d="M 5,34 Q 35,46 65,24 T 115,36 T 155,8 T 195,30" 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="dark:stroke-[#5e88ff]"
                  />
                </svg>

                {/* Floating Tooltip Dot (Black pill with 45) */}
                <div className="absolute top-1 left-[45%] w-6 h-6 bg-[#111115] dark:bg-black text-white text-[10px] font-extrabold flex items-center justify-center rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-lg border border-white/20">
                  45
                </div>
              </div>

              {/* Floating Satellite Badges */}
              <motion.div 
                className="absolute top-3 -right-10 w-11 h-11 bg-white dark:bg-[#1a233c] border border-white/80 dark:border-white/10 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.4)] text-[#f28e2c] dark:text-[#fba34b]"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              >
                <Brain className="w-5 h-5" strokeWidth={2.2} />
              </motion.div>
              
              <motion.div 
                className="absolute bottom-3 -right-14 w-11 h-11 bg-white dark:bg-[#1a233c] border border-white/80 dark:border-white/10 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_25px_rgba(0,0,0,0.4)] text-[#3b82f6] dark:text-[#5e88ff]"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
              >
                <Layers className="w-5 h-5" strokeWidth={2.2} />
              </motion.div>
            </motion.div>

            {/* Bottom Floating Card (Your data, your rules) */}
            <motion.div 
              className="relative w-full max-w-[340px] bg-white dark:bg-[#141b2e] rounded-[26px] p-7 shadow-[0_18px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/60 dark:border-white/10 ml-8 transition-all duration-300"
              initial={{ y: 0 }}
              animate={{ y: 10 }}
              transition={{ duration: 5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
            >
              {/* Header with bars and Key icon */}
              <div className="flex justify-between items-start mb-5">
                <div className="space-y-2">
                  <div className="w-12 h-2 bg-[#3b82f6] dark:bg-[#5e88ff] rounded-full"></div>
                  <div className="w-20 h-2 bg-gray-200 dark:bg-white/15 rounded-full"></div>
                  <div className="w-14 h-2 bg-gray-200 dark:bg-white/15 rounded-full"></div>
                </div>
                <div className="text-[#f28e2c] dark:text-[#fba34b]">
                  <Key className="w-7 h-7" strokeWidth={2.2} />
                </div>
              </div>

              {/* Title */}
              <h3 className="text-[19px] font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                Your data, your rules
              </h3>

              {/* Description */}
              <p className="text-[13px] text-gray-400 dark:text-zinc-400 font-medium leading-relaxed">
                Your data belongs to you, and our encryption ensures that your scopes and estimates remain completely secure.
              </p>
            </motion.div>

          </div>

        </div>

      </div>
    </div>
  )
}
