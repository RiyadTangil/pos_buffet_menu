"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Users, 
  Shield, 
  Eye, 
  EyeOff, 
  Save, 
  RotateCcw,
  Plus,
  Trash2,
  Edit3
} from "lucide-react"
import { toast } from "sonner"
import { UserRole, NavigationItem, RoleConfig, RBACManager } from "@/lib/rbac"
import { withRouteProtection } from "@/components/admin/route-protection"

interface RolePermissionConfig {
  role: UserRole
  permissions: string[]
  navigationItems: string[]
  customConfig?: Record<string, any>
}

interface NavigationItemConfig {
  id: string
  name: string
  href: string
  icon: string
  enabled: boolean
  roles: UserRole[]
}

function RolePermissionCard({ 
  role, 
  config, 
  onUpdate 
}: { 
  role: UserRole
  config: RolePermissionConfig
  onUpdate: (role: UserRole, config: RolePermissionConfig) => void 
}) {
  const [localConfig, setLocalConfig] = useState(config)
  const [isEditing, setIsEditing] = useState(false)

  const availablePermissions = [
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'orders.view', 'orders.create', 'orders.edit', 'orders.delete',
    'payments.view', 'payments.process', 'payments.refund',
    'tables.view', 'tables.manage',
    'categories.view', 'categories.manage',
    'settings.view', 'settings.edit',
    'reports.view', 'reports.export'
  ]

  const availableNavItems = [
    'dashboard', 'users', 'tables', 'categories', 'products', 
    'order-management', 'payments', 'settings', 'profile'
  ]

  const handlePermissionToggle = (permission: string) => {
    const newPermissions = localConfig.permissions.includes(permission)
      ? localConfig.permissions.filter(p => p !== permission)
      : [...localConfig.permissions, permission]
    
    setLocalConfig(prev => ({ ...prev, permissions: newPermissions }))
  }

  const handleNavItemToggle = (navItem: string) => {
    const newNavItems = localConfig.navigationItems.includes(navItem)
      ? localConfig.navigationItems.filter(n => n !== navItem)
      : [...localConfig.navigationItems, navItem]
    
    setLocalConfig(prev => ({ ...prev, navigationItems: newNavItems }))
  }

  const handleSave = () => {
    onUpdate(role, localConfig)
    setIsEditing(false)
    toast.success(`${role} configuration updated successfully`)
  }

  const handleReset = () => {
    setLocalConfig(config)
    setIsEditing(false)
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin': return 'bg-red-50 text-red-700 border-red-200'
      case 'waiter': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'stall_manager': return 'bg-green-50 text-green-700 border-green-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge className={getRoleColor(role)}>
              {role.replace('_', ' ').toUpperCase()}
            </Badge>
            <CardTitle className="text-lg">{role.replace('_', ' ')} Configuration</CardTitle>
          </div>
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button size="sm" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                {/* <Button size="sm" variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button> */}
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permissions Section */}
        {/* <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Permissions
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availablePermissions.map(permission => (
              <div key={permission} className="flex items-center space-x-2">
                <Switch
                  id={`${role}-${permission}`}
                  checked={localConfig.permissions.includes(permission)}
                  onCheckedChange={() => handlePermissionToggle(permission)}
                  disabled={!isEditing}
                />
                <Label 
                  htmlFor={`${role}-${permission}`} 
                  className="text-sm cursor-pointer"
                >
                  {permission}
                </Label>
              </div>
            ))}
          </div>
        </div> */}

        <Separator />

        {/* Navigation Items Section */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <Eye className="w-4 h-4 mr-2" />
            Visible Navigation Items
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableNavItems.map(navItem => (
              <div key={navItem} className="flex items-center space-x-2">
                <Switch
                  id={`${role}-nav-${navItem}`}
                  checked={localConfig.navigationItems.includes(navItem)}
                  onCheckedChange={() => handleNavItemToggle(navItem)}
                  disabled={!isEditing}
                />
                <Label 
                  htmlFor={`${role}-nav-${navItem}`} 
                  className="text-sm cursor-pointer"
                >
                  {navItem.replace('-', ' ')}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Permissions:</span>
              <span className="ml-2 text-gray-600">{localConfig.permissions.length}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Navigation Items:</span>
              <span className="ml-2 text-gray-600">{localConfig.navigationItems.length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RoleManagementPage() {
  const [roleConfigs, setRoleConfigs] = useState<Record<UserRole, RolePermissionConfig>>({})
  
  const [loading, setLoading] = useState(false)

  // Load role configurations from the database on component mount
  useEffect(() => {
    console.log('🔄 Role Management: useEffect triggered - loading configurations...')
    
    const loadRoleConfigurations = async () => {
      try {
        setLoading(true)
        console.log('📡 Role Management: Making API call to /api/rbac/public')
        
        const response = await fetch('/api/rbac/public')
        console.log('📡 Role Management: API response status:', response.status)
        
        if (response.ok) {
          const result = await response.json()
          console.log('📡 Role Management: API response data:', result)
          
          if (result.success && result.data) {
            console.log('✅ Role Management: Setting role configs:', result.data)
            setRoleConfigs(result.data)
          } else {
            console.warn('⚠️ Role Management: API response missing success/data:', result)
          }
        } else {
          console.error('❌ Role Management: Failed to load role configurations:', response.statusText)
          // Fallback to authenticated endpoint
          console.log('🔄 Role Management: Trying authenticated endpoint...')
          const authResponse = await fetch('/api/rbac')
          if (authResponse.ok) {
            const authResult = await authResponse.json()
            console.log('📡 Role Management: Auth API response data:', authResult)
            if (authResult.success && authResult.data) {
              console.log('✅ Role Management: Setting role configs from auth endpoint:', authResult.data)
              setRoleConfigs(authResult.data)
            }
          }
        }
      } catch (error) {
        console.error('❌ Role Management: Error loading role configurations:', error)
      } finally {
        setLoading(false)
        console.log('🏁 Role Management: Loading completed')
      }
    }

    loadRoleConfigurations()
  }, [])

  const handleRoleUpdate = async (role: UserRole, config: RolePermissionConfig) => {
    setLoading(true)
    try {
      // Update local state
      setRoleConfigs(prev => ({ ...prev, [role]: config }))
      
      // Save to backend via RBAC API
      const response = await fetch('/api/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role, 
          config: {
            role,
            permissions: config.permissions,
            navigationItems: config.navigationItems
          }
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update role configuration')
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to update role configuration')
      }
      
      toast.success(`${role} configuration updated successfully`)
      console.log('Updated role configuration:', { role, config })
      
    } catch (error) {
      toast.error('Failed to update role configuration')
      console.error('Error updating role:', error)
      // Revert local state on error
      setRoleConfigs(prev => {
        const reverted = { ...prev }
        // You might want to fetch the original config here
        return reverted
      })
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-600">Configure permissions and navigation for different user roles</p>
        </div>

      </div>

      {/* Loading State */}
      {loading && Object.keys(roleConfigs).length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading role configurations...</p>
          </div>
        </div>
      )}

      {/* Role Configuration Cards */}
      {!loading || Object.keys(roleConfigs).length > 0 ? (
        <div className="space-y-6">
          {(Object.keys(roleConfigs) as UserRole[])
            .filter(role => role !== 'admin') // Exclude admin from configuration
            .map(role => (
            <RolePermissionCard
              key={role}
              role={role}
              config={roleConfigs[role]}
              onUpdate={handleRoleUpdate}
            />
          ))}
        </div>
      ) : null}

      {/* Admin Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Administrator Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Administrator Role:</p>
                <p className="text-sm">Administrators have full access to all system features and cannot be restricted. Admin permissions are managed at the system level and do not require configuration.</p>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Important Notes:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Changes to role configurations take effect immediately for new sessions</li>
                  <li>Users may need to log out and log back in to see navigation changes</li>
                  <li>Admin role should always have access to this configuration page</li>
                  <li>Removing critical permissions may prevent users from performing their duties</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

export default withRouteProtection(RoleManagementPage, {
  allowedRoles: ['admin'],
  fallbackPath: '/admin/dashboard'
})