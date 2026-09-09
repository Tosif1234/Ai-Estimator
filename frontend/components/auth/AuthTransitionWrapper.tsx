"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

export function AuthTransitionWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Only animate transitions between login and signup.
  // For other routes (like forgot-password), we can just render the children, 
  // or apply the same transition. The key is to provide a smooth cross-fade/slide.
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ 
          duration: 0.35, 
          ease: [0.22, 1, 0.36, 1] // Custom smooth spring-like easing
        }}
        className="w-full h-full flex flex-col justify-center"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
