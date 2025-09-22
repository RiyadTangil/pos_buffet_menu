"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  User, 
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react"
import { toast } from "sonner"
import { UserRole } from "@/types/auth"
import ProfileInfoForm from "@/components/profile/ProfileInfoForm"
import PasswordChangeForm from "@/components/profile/PasswordChangeForm"

interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string
  department?: string
  position?: string
  bio?: string
  avatar?: string
  location?: string
  timezone?: string
  language?: string
  createdAt: string
  lastLogin?: string
}

interface ProfileFieldProps {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  editable?: boolean
  type?: string
  onEdit?: (value: string) => void
}

interface ActivityItem {
  id: string
  type: 'login' | 'profile_update' | 'password_change' | 'role_change'
  description: string
  timestamp: string
  ip?: string
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

function ActivityCard({ activity }: { activity: ActivityItem }) {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'login':
        return <User className="w-4 h-4 text-blue-600" />
      case 'profile_update':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'password_change':
        return <AlertCircle className="w-4 h-4 text-orange-600" />
      case 'role_change':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'login':
        return 'bg-blue-50 border-blue-200'
      case 'profile_update':
        return 'bg-green-50 border-green-200'
      case 'password_change':
        return 'bg-orange-50 border-orange-200'
      case 'role_change':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className={`p-3 rounded-lg border ${getActivityColor(activity.type)}`}>
      <div className="flex items-start space-x-3">
        <div className="p-1 rounded-full bg-white">
          {getActivityIcon(activity.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {activity.description}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500">
              {new Date(activity.timestamp).toLocaleString()}
            </p>
            {activity.ip && (
              <span className="text-xs text-gray-400">• {activity.ip}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/profile')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch profile')
        }

        setProfile(data.data)
      } catch (error) {
        console.error('Error fetching profile:', error)
        setError(error instanceof Error ? error.message : 'Failed to load profile')
        toast.error('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchProfile()
    }
  }, [session])

  // Handle profile update
  const handleProfileUpdate = async (field: string, value: string) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: value }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setProfile(data.data)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
      toast.error(errorMessage)
      throw error
    }
  }

  // Handle password change
  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    try {
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      toast.success('Password changed successfully')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setIsChangingPassword(false)
    } catch (error) {
      console.error('Error changing password:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to change password'
      toast.error(errorMessage)
    }
  }

  // Mock recent activities data
  const recentActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'login',
      description: 'Logged in to the system',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      ip: '192.168.1.100'
    },
    {
      id: '2',
      type: 'profile_update',
      description: 'Updated profile information',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      type: 'password_change',
      description: 'Changed account password',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Profile</h3>
          <p className="text-gray-600 mb-4">{error || 'Unable to load profile data'}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="personal" className="space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback className="text-lg">
                    {profile.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">{profile.name}</h2>
                  <p className="text-gray-600">{profile.email}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="secondary" className="capitalize">
                      {profile.role}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Member since {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information Form */}
          <ProfileInfoForm
            profile={profile}
            onUpdate={handleProfileUpdate}
          />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <PasswordChangeForm
            onPasswordChange={handlePasswordChange}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="w-5 h-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}