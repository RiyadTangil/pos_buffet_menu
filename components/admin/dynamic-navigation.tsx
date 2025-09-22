"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  Table,
  ClipboardList,
  CreditCard
} from "lucide-react"
import { NavigationItem, UserRole } from "@/lib/rbac"

// Icon mapping for dynamic icon rendering
const ICON_MAP = {
  LayoutDashboard,
  Users,
  User,
  Table,
  Package,
  ShoppingCart,
  ClipboardList,
  CreditCard,
  Settings,
  Calendar,
  Image,
  Tag,
  LogOut,
  ChevronDown
} as const

interface DynamicNavigationProps {
  userRole: UserRole
  userId: string
  userName: string
  navigationItems: NavigationItem[]
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  onLogout: () => void
}

export function DynamicNavigation({ 
  userRole, 
  userId, 
  userName, 
  navigationItems,
  sidebarOpen, 
  setSidebarOpen, 
  onLogout 
}: DynamicNavigationProps) {
  const pathname = usePathname()
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const renderIcon = (iconName: string, className: string = "w-5 h-5") => {
    const IconComponent = ICON_MAP[iconName as keyof typeof ICON_MAP]
    return IconComponent ? <IconComponent className={className} /> : <Package className={className} />
  }

  const getRoleDisplayInfo = (role: UserRole) => {
    const roleInfo = {
      admin: { name: "Administrator", color: "text-purple-600", bgColor: "bg-purple-100" },
      waiter: { name: "Waiter", color: "text-blue-600", bgColor: "bg-blue-100" },
      stall_manager: { name: "Stall Manager", color: "text-green-600", bgColor: "bg-green-100" }
    }
    return roleInfo[role]
  }

  const roleInfo = getRoleDisplayInfo(userRole)

  return (
    <div className={`fixed left-0 top-0 h-full z-30 ${sidebarOpen ? 'w-64' : 'w-16'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
      <div className="p-6">
        <div className={`flex items-center transition-all duration-300 ${
          sidebarOpen ? "space-x-3" : "justify-center"
        }`}>
          <img 
            src="/images/logo.png" 
            alt="KALA Systems Logo" 
            className="h-12 w-auto"
          />
          {/* {sidebarOpen && (
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
              <span className={`text-xs px-2 py-1 rounded-full ${roleInfo.bgColor} ${roleInfo.color} font-medium`}>
                {roleInfo.name}
              </span>
            </div>
          )} */}
        </div>
      </div>
      
      <nav className="flex-1 space-y-2 px-4">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href
          
          return (
            <div key={item.id} className="transition-all duration-300 ease-in-out">
              {item.children ? (
                <DropdownMenu onOpenChange={(open) => setOpenDropdown(open ? item.id : null)}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`w-full flex items-center px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      } ${
                        sidebarOpen ? 'justify-between' : 'justify-center'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {renderIcon(item.icon)}
                        {sidebarOpen && (
                          <span className="font-medium">{item.name}</span>
                        )}
                      </div>
                      {sidebarOpen && (
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                          openDropdown === item.id ? 'rotate-180' : ''
                        }`} />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side={sidebarOpen ? "bottom" : "right"} className="w-48">
                    {item.children.map((child) => (
                      <DropdownMenuItem key={child.id} asChild>
                        <Link href={child.href} className="flex items-center">
                          {renderIcon(child.icon, "w-4 h-4 mr-2")}
                          {child.name}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                  } ${
                    sidebarOpen ? 'space-x-3' : 'justify-center'
                  }`}
                >
                  {renderIcon(item.icon)}
                  {sidebarOpen && (
                    <span className="font-medium">{item.name}</span>
                  )}
                </Link>
              )}
            </div>
          )
        })}
      </nav>

      {/* User info at bottom of sidebar */}
      {sidebarOpen && (
        <div className="p-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${roleInfo.bgColor}`}>
                <User className={`w-4 h-4 ${roleInfo.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                <p className={`text-xs ${roleInfo.color} truncate`}>{roleInfo.name}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}