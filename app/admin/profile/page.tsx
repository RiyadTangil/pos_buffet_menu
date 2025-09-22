"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Shield, 
  Clock, 
  Edit3, 
  Save, 
  X,
  Camera,
  Key,
  Activity
} from "lucide-react"
import { toast } from "sonner"
import { UserRole } from "@/lib/rbac"

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  status: string
  createdAt: string
  lastLogin?: string
  avatar?: string
  address?: string
  emergencyContact?: string
  employeeId?: string
  department?: string
  shift?: string
}

interface ProfileFieldProps {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  editable?: boolean
  type?: string
  onEdit?: (value: string) => void
}

function ProfileField({ label, value, icon: Icon, editable = false, type = "text", onEdit }: ProfileFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)

  const handleSave = () => {
    if (onEdit) {
      onEdit(editValue)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {isEditing ? (
            <Input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="mt-1 h-8"
              autoFocus
            />
          ) : (
            <p className="text-sm text-gray-900">{value || "Not provided"}</p>
          )}
        </div>
      </div>
      {editable && (
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" onClick={handleSave}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

function ActivityCard({ title, description, time, type }: {
  title: string
  description: string
  time: string
  type: 'login' | 'order' | 'payment' | 'system'
}) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'login': return 'bg-green-50 text-green-700 border-green-200'
      case 'order': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'payment': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'system': return 'bg-gray-50 text-gray-700 border-gray-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="flex items-start space-x-3 p-3 border rounded-lg">
      <div className={`p-2 rounded-full ${getTypeColor(type)}`}>
        <Activity className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
        <p className="text-xs text-gray-400 mt-1">{time}</p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      // Mock data for now - replace with actual API call
      const mockProfile: UserProfile = {
        id: session?.user?.id || '1',
        name: session?.user?.name || 'John Doe',
        email: session?.user?.email || 'john@example.com',
        phone: '+1 (555) 123-4567',
        role: (session?.user?.role as UserRole) || 'waiter',
        status: 'active',
        createdAt: '2024-01-15',
        lastLogin: '2024-01-20 10:30 AM',
        avatar: session?.user?.image,
        address: '123 Main St, City, State 12345',
        emergencyContact: '+1 (555) 987-6543',
        employeeId: 'EMP001',
        department: 'Food Service',
        shift: 'Morning (8 AM - 4 PM)'
      }
      setProfile(mockProfile)
    } catch (error) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (field: string, value: string) => {
    try {
      // Mock API call - replace with actual implementation
      setProfile(prev => prev ? { ...prev, [field]: value } : null)
      toast.success('Profile updated successfully')
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    try {
      // Mock API call - replace with actual implementation
      toast.success('Password changed successfully')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setIsChangingPassword(false)
    } catch (error) {
      toast.error('Failed to change password')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <Alert>
        <AlertDescription>Failed to load profile information.</AlertDescription>
      </Alert>
    )
  }

  const recentActivities = [
    {
      title: 'Logged in',
      description: 'Successfully logged into the system',
      time: '2 hours ago',
      type: 'login' as const
    },
    {
      title: 'Order processed',
      description: 'Processed order #12345 for table 8',
      time: '3 hours ago',
      type: 'order' as const
    },
    {
      title: 'Payment received',
      description: 'Payment of $45.50 received for table 3',
      time: '4 hours ago',
      type: 'payment' as const
    }
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={profile.avatar} alt={profile.name} />
                    <AvatarFallback className="text-lg">
                      {profile.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
                  <p className="text-gray-600">{profile.email}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge variant={profile.status === 'active' ? 'default' : 'secondary'}>
                      {profile.status}
                    </Badge>
                    <Badge variant="outline">
                      {profile.role}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProfileField
                label="Full Name"
                value={profile.name}
                icon={User}
                editable
                onEdit={(value) => handleProfileUpdate('name', value)}
              />
              <ProfileField
                label="Email Address"
                value={profile.email}
                icon={Mail}
                editable
                type="email"
                onEdit={(value) => handleProfileUpdate('email', value)}
              />
              <ProfileField
                label="Phone Number"
                value={profile.phone || ''}
                icon={Phone}
                editable
                type="tel"
                onEdit={(value) => handleProfileUpdate('phone', value)}
              />
              <ProfileField
                label="Address"
                value={profile.address || ''}
                icon={MapPin}
                editable
                onEdit={(value) => handleProfileUpdate('address', value)}
              />
            </CardContent>
          </Card>

          {/* Work Information */}
          <Card>
            <CardHeader>
              <CardTitle>Work Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProfileField
                label="Employee ID"
                value={profile.employeeId || ''}
                icon={Shield}
              />
              <ProfileField
                label="Department"
                value={profile.department || ''}
                icon={User}
              />
              <ProfileField
                label="Shift"
                value={profile.shift || ''}
                icon={Clock}
              />
              <ProfileField
                label="Emergency Contact"
                value={profile.emergencyContact || ''}
                icon={Phone}
                editable
                type="tel"
                onEdit={(value) => handleProfileUpdate('emergencyContact', value)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Key className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Password</p>
                    <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                >
                  Change Password
                </Button>
              </div>

              {isChangingPassword && (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button onClick={handlePasswordChange}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setIsChangingPassword(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.map((activity, index) => (
                <ActivityCard key={index} {...activity} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}