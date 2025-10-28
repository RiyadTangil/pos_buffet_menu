'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  LayoutDashboard, 
  User, 
  Settings, 
  LogOut, 
  ChevronDown 
} from 'lucide-react'
import { RBACManager, UserRole } from '@/lib/rbac'

interface AdminHeaderProps {
  userRole: UserRole
  userName: string
  navigationItems: any[]
  onToggleSidebar: () => void
  onLogout: () => void
}

export function AdminHeader({ 
  userRole, 
  userName, 
  navigationItems, 
  onToggleSidebar, 
  onLogout 
}: AdminHeaderProps) {
  const pathname = usePathname()

  const getRoleInfo = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return { name: 'Super Admin', color: 'text-red-700', bgColor: 'bg-red-100' }
      case 'admin':
        return { name: 'Administrator', color: 'text-blue-700', bgColor: 'bg-blue-100' }
      case 'manager':
        return { name: 'Manager', color: 'text-green-700', bgColor: 'bg-green-100' }
      case 'staff':
        return { name: 'Staff', color: 'text-gray-700', bgColor: 'bg-gray-100' }
      default:
        return { name: 'User', color: 'text-gray-700', bgColor: 'bg-gray-100' }
    }
  }

  const roleInfo = getRoleInfo(userRole)

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="p-2"
          >
            <LayoutDashboard className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold text-gray-900">
              {navigationItems.find(item => item.href === pathname)?.name || 'Dashboard'}
            </h1>
            <span className={`text-xs px-2 py-1 rounded-full ${roleInfo.bgColor} ${roleInfo.color} font-medium`}>
              {roleInfo.name}
            </span>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${roleInfo.bgColor}`}>
                <User className={`w-4 h-4 ${roleInfo.color}`} />
              </div>
              <span className="font-medium">{userName}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {RBACManager.hasPermission(userRole, 'profile.view') && (
              <DropdownMenuItem asChild>
                <Link href="/admin/profile" className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
            )}
            {RBACManager.hasPermission(userRole, 'settings.view') && (
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="flex items-center">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={onLogout}
              className="flex items-center text-red-600 hover:bg-red-50 focus:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}