"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Clock, 
  Camera,
  Loader2,
  Key
} from "lucide-react"
import { PinField } from "./PinField"
import { toast } from "sonner"

export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  status: string
  pin?: string
  createdAt: string
  lastLogin?: string
  avatar?: string
  address?: string
  emergencyContact?: string
  employeeId?: string
  department?: string
  shift?: string
}

interface ProfileInfoFormProps {
  profile: UserProfile
  onUpdate: (field: string, value: string) => Promise<void>
  onAvatarUpdate?: (file: File) => Promise<void>
  isLoading?: boolean
}

interface ProfileFieldProps {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  editable?: boolean
  type?: string
  onEdit?: (value: string) => Promise<void>
  isLoading?: boolean
}

function ProfileField({ 
  label, 
  value, 
  icon: Icon, 
  editable = false, 
  type = "text", 
  onEdit,
  isLoading = false
}: ProfileFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!onEdit || editValue === value) {
      setIsEditing(false)
      return
    }

    try {
      setSaving(true)
      await onEdit(editValue)
      setIsEditing(false)
      toast.success(`${label} updated successfully`)
    } catch (error) {
      toast.error(`Failed to update ${label.toLowerCase()}`)
      setEditValue(value) // Reset to original value
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center space-x-3 flex-1">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {isEditing ? (
            <Input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyPress}
              className="mt-1 h-8"
              autoFocus
              disabled={saving || isLoading}
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
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleSave}
                disabled={saving || isLoading}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleCancel}
                disabled={saving || isLoading}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsEditing(true)}
              disabled={isLoading}
            >
              Edit
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProfileInfoForm({ 
  profile, 
  onUpdate, 
  onAvatarUpdate,
  isLoading = false 
}: ProfileInfoFormProps) {
  const [avatarUploading, setAvatarUploading] = useState(false)

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !onAvatarUpdate) return

    try {
      setAvatarUploading(true)
      await onAvatarUpdate(file)
      toast.success("Avatar updated successfully")
    } catch (error) {
      toast.error("Failed to update avatar")
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <div className="space-y-6">
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
              {onAvatarUpdate && (
                <div className="absolute -bottom-2 -right-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    id="avatar-upload"
                    disabled={avatarUploading || isLoading}
                  />
                  <label htmlFor="avatar-upload">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full w-8 h-8 p-0 cursor-pointer"
                      disabled={avatarUploading || isLoading}
                      asChild
                    >
                      <span>
                        {avatarUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </span>
                    </Button>
                  </label>
                </div>
              )}
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
            onEdit={(value) => onUpdate('name', value)}
            isLoading={isLoading}
          />
          <ProfileField
            label="Email Address"
            value={profile.email}
            icon={Mail}
            editable
            type="email"
            onEdit={(value) => onUpdate('email', value)}
            isLoading={isLoading}
          />
          <ProfileField
            label="Phone Number"
            value={profile.phone || ''}
            icon={Phone}
            editable
            type="tel"
            onEdit={(value) => onUpdate('phone', value)}
            isLoading={isLoading}
          />
          <ProfileField
            label="Address"
            value={profile.address || ''}
            icon={MapPin}
            editable
            onEdit={(value) => onUpdate('address', value)}
            isLoading={isLoading}
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
            isLoading={isLoading}
          />
          <ProfileField
            label="Department"
            value={profile.department || ''}
            icon={User}
            isLoading={isLoading}
          />
          <ProfileField
            label="Shift"
            value={profile.shift || ''}
            icon={Clock}
            isLoading={isLoading}
          />
          <ProfileField
            label="Emergency Contact"
            value={profile.emergencyContact || ''}
            icon={Phone}
            editable
            type="tel"
            onEdit={(value) => onUpdate('emergencyContact', value)}
            isLoading={isLoading}
          />
          {profile.role === 'waiter' && (
            <PinField
              value={profile.pin || ''}
              userId={profile.id}
              onUpdate={onUpdate}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}