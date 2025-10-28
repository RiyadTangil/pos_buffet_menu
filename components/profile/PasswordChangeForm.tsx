"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Key, 
  Eye, 
  EyeOff, 
  Loader2,
  Shield,
  CheckCircle,
  XCircle
} from "lucide-react"
import { toast } from "sonner"

interface PasswordChangeFormProps {
  onPasswordChange: (currentPassword: string, newPassword: string) => Promise<void>
  isLoading?: boolean
}

interface PasswordStrength {
  score: number
  feedback: string[]
  isValid: boolean
}

function getPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push("At least 8 characters")
  }

  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push("At least one lowercase letter")
  }

  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push("At least one uppercase letter")
  }

  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push("At least one number")
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1
  } else {
    feedback.push("At least one special character")
  }

  return {
    score,
    feedback,
    isValid: score >= 4
  }
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const strength = getPasswordStrength(password)
  
  const getStrengthColor = (score: number) => {
    if (score < 2) return "bg-red-500"
    if (score < 4) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getStrengthText = (score: number) => {
    if (score < 2) return "Weak"
    if (score < 4) return "Medium"
    return "Strong"
  }

  if (!password) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strength.score)}`}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-600">
          {getStrengthText(strength.score)}
        </span>
      </div>
      {strength.feedback.length > 0 && (
        <div className="text-xs text-gray-500 space-y-1">
          <p>Password should include:</p>
          <ul className="space-y-1">
            {strength.feedback.map((item, index) => (
              <li key={index} className="flex items-center space-x-2">
                <XCircle className="w-3 h-3 text-red-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {strength.isValid && (
        <div className="flex items-center space-x-2 text-xs text-green-600">
          <CheckCircle className="w-3 h-3" />
          <span>Password meets all requirements</span>
        </div>
      )}
    </div>
  )
}

export default function PasswordChangeForm({ 
  onPasswordChange, 
  isLoading = false 
}: PasswordChangeFormProps) {
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [saving, setSaving] = useState(false)

  const passwordStrength = getPasswordStrength(passwordData.newPassword)
  const passwordsMatch = passwordData.newPassword === passwordData.confirmPassword
  const isFormValid = 
    passwordData.currentPassword &&
    passwordStrength.isValid &&
    passwordsMatch &&
    passwordData.newPassword !== passwordData.currentPassword

  const handlePasswordChange = async () => {
    if (!isFormValid) {
      if (!passwordsMatch) {
        toast.error('New passwords do not match')
      } else if (!passwordStrength.isValid) {
        toast.error('Password does not meet requirements')
      } else if (passwordData.newPassword === passwordData.currentPassword) {
        toast.error('New password must be different from current password')
      }
      return
    }

    try {
      setSaving(true)
      await onPasswordChange(passwordData.currentPassword, passwordData.newPassword)
      toast.success('Password changed successfully')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setIsChangingPassword(false)
    } catch (error) {
      toast.error('Failed to change password')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setIsChangingPassword(false)
  }

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="w-5 h-5" />
          <span>Security Settings</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Key className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Password</p>
              <p className="text-sm text-gray-500">Keep your account secure</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            disabled={isLoading || saving}
          >
            {isChangingPassword ? 'Cancel' : 'Change Password'}
          </Button>
        </div>

        {isChangingPassword && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Choose a strong password that you haven't used before. Your password will be encrypted and stored securely.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    disabled={saving || isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('current')}
                    disabled={saving || isLoading}
                  >
                    {showPasswords.current ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    disabled={saving || isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('new')}
                    disabled={saving || isLoading}
                  >
                    {showPasswords.new ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <PasswordStrengthIndicator password={passwordData.newPassword} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    disabled={saving || isLoading}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => togglePasswordVisibility('confirm')}
                    disabled={saving || isLoading}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {passwordData.confirmPassword && !passwordsMatch && (
                  <div className="flex items-center space-x-2 text-xs text-red-600">
                    <XCircle className="w-3 h-3" />
                    <span>Passwords do not match</span>
                  </div>
                )}
                {passwordData.confirmPassword && passwordsMatch && (
                  <div className="flex items-center space-x-2 text-xs text-green-600">
                    <CheckCircle className="w-3 h-3" />
                    <span>Passwords match</span>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-4">
                <Button 
                  onClick={handlePasswordChange}
                  disabled={!isFormValid || saving || isLoading}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={saving || isLoading}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}