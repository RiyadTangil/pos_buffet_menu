"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

// Mock login credentials
const MOCK_CREDENTIALS = {
  number: "101",
  password: "admin123",
}

export default function LoginPage() {
  const [number, setNumber] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Validate credentials
    if (number === MOCK_CREDENTIALS.number && password === MOCK_CREDENTIALS.password) {
      router.push("/tables")
    } else {
      setError("Invalid number or password. Please try again.")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">Restaurant Portal</CardTitle>
          <CardDescription className="text-gray-600">Sign in to access the buffet management system</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="number" className="text-sm font-medium text-gray-700">
                Table Number
              </Label>
              <Input
                id="number"
                type="text"
                placeholder="Enter table number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</div>
            )}

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-100 rounded-md">
            <p className="text-xs text-gray-600 font-medium mb-1">Demo Credentials:</p>
            <p className="text-xs text-gray-500">Number: 101</p>
            <p className="text-xs text-gray-500">Password: admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
