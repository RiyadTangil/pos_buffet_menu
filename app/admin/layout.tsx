"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { 
  Users, 
  Package, 
  Calendar, 
  Image, 
  Tag, 
  ShoppingCart, 
  Settings, 
  LayoutDashboard,
  LogOut,
  ChevronDown,
  User,
  Table
} from "lucide-react"

const sidebarItems = [
  { id: 'dashboard', name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, hasDropdown: false },
  { id: 'users', name: "Users", href: "/admin/users", icon: Users, hasDropdown: true },
  { id: 'tables', name: "Tables", href: "/admin/tables", icon: Table, hasDropdown: true },
  { id: 'categories', name: "Categories", href: "/admin/categories", icon: Package, hasDropdown: true },
  { id: 'products', name: "Products", href: "/admin/products", icon: ShoppingCart, hasDropdown: true },
  { id: 'orders', name: "Orders", href: "/admin/orders", icon: ShoppingCart, hasDropdown: true },
  { id: 'bookings', name: "Bookings", href: "/admin/bookings", icon: Calendar, hasDropdown: true },
  { id: 'banners', name: "Banners", href: "/admin/banners", icon: Image, hasDropdown: true },
  { id: 'coupons', name: "Coupons", href: "/admin/coupons", icon: Tag, hasDropdown: true },
  { id: 'settings', name: "Settings", href: "/admin/settings", icon: Settings, hasDropdown: false },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const handleLogout = () => {
    // Implement logout logic here
    window.location.href = "/admin/login"
  }

  // If on login page, render without admin layout
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300`}>
        <div className="p-6">
          <div className={`flex items-center  transition-all duration-300 ${
            sidebarOpen ? "space-x-3" : "justify-center"
          }`}>
            <img 
              src="/images/logo.png" 
              alt="KALA Systems Logo" 
              className="h-12 w-auto"
            />
            {/* {sidebarOpen && (
              <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            )} */}
          </div>
        </div>
        
        <nav className="space-y-2 px-4">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <div key={item.id} className="transition-all duration-300 ease-in-out">
                {item.hasDropdown ? (
                  <DropdownMenu onOpenChange={(open) => setOpenDropdown(open ? item.id : null)}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                          sidebarOpen ? "space-x-3" : "justify-center"
                        } ${
                          isActive
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {sidebarOpen && (
                          <>
                            <span className="font-medium flex-1">{item.name}</span>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ease-in-out ${
                              openDropdown === item.id ? "rotate-180" : ""
                            }`} />
                          </>
                        )}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="bottom" align="start" className="w-48 ml-0 animate-in slide-in-from-top-2 duration-200">
                      <DropdownMenuItem asChild>
                        <Link href={item.href} className="transition-colors duration-150 hover:bg-gray-100">
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          List {item.name}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={item.href} className="transition-colors duration-150 hover:bg-gray-100">
                          <Package className="h-4 w-4 mr-2" />
                          Add {item.name.slice(0, -1)}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link href={item.href}>
                    <button
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                        sidebarOpen ? "space-x-3" : "justify-center"
                      } ${
                        isActive
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {sidebarOpen && (
                        <span className="font-medium">{item.name}</span>
                      )}
                    </button>
                  </Link>
                )}
                {/* Add smooth spacing when dropdown is open */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  openDropdown === item.id && sidebarOpen ? "h-20 opacity-100" : "h-0 opacity-0"
                }`}></div>
              </div>
            )
          })}
        </nav>
        
      
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2"
              >
                <LayoutDashboard className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-3">
                
                <h1 className="text-xl font-semibold text-gray-900">Admin Dashboard</h1>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium">Admin</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center text-red-600 hover:bg-red-50 focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto">
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}