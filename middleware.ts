import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { RBACManager } from "@/lib/rbac"

export default withAuth(
  function middleware(req) {
    // Check if user is trying to access admin routes
    if (req.nextUrl.pathname.startsWith("/admin")) {
      // Allow access to login page
      if (req.nextUrl.pathname === "/auth/admin/login") {
        return NextResponse.next()
      }
      
      // Check if user has valid role for admin panel
      const userRole = req.nextauth.token?.role as string
      if (!['admin', 'waiter', 'stall_manager'].includes(userRole)) {
        return NextResponse.redirect(new URL("/auth/admin/login", req.url))
      }
      
      // Check if user can access the specific route
      if (!RBACManager.canAccessRoute(userRole as any, req.nextUrl.pathname)) {
        // Redirect to dashboard if user doesn't have permission for this route
        return NextResponse.redirect(new URL("/admin/dashboard", req.url))
      }
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to login page without token
        if (req.nextUrl.pathname === "/auth/admin/login") {
          return true
        }
        
        // For admin routes, require token and valid role
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return !!token && ['admin', 'waiter', 'stall_manager'].includes(token.role as string)
        }
        
        // Allow all other routes
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/admin/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}