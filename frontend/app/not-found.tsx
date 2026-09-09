import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-4">
      <h1 className="text-9xl font-extrabold text-primary/20 mb-4 tracking-tighter">404</h1>
      <h2 className="text-2xl md:text-3xl font-bold mb-4">Page not found</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <Button asChild size="lg">
        <Link href="/">
          Return Home
        </Link>
      </Button>
    </div>
  )
}
