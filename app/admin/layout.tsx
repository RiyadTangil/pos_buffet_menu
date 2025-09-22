"use client"

import { useSession, signOut } from "next-auth/react"
import { redirect } from "next/navigation"
import { useEffect, useState } from "react"
import { DynamicNavigation } from "@/components/admin/dynamic-navigation"
import { Loader2 } from "lucide-react"
import { useSimpleRBAC } from "@/hooks/use-simple-rbac"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Use the simplified RBAC hook
  const { userRole, userId, userName, navigationItems, loading } = useSimpleRBAC()

  useEffect(() => {
    if (status === "loading" || loading) return

    if (status === "unauthenticated") {
      redirect("/auth/admin/login")
      return
    }

    if (session?.user) {
      setIsLoading(false)
    }
  }, [session, status, loading])

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/admin/login" })
  }

  if (status === "loading" || isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!session?.user) {
    redirect("/auth/admin/login")
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DynamicNavigation 
        userRole={userRole}
        userId={userId}
        userName={userName}
        navigationItems={navigationItems}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={handleLogout}
      />
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-0' : 'ml-0'}`}>
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}