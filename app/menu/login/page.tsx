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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">ENTER REGISTERED</h1>
          <h2 className="text-2xl font-bold text-gray-800">Table Number & Password</h2>
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <Label htmlFor="number" className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Table Number
                </Label>
              </div>
              <Input
                id="number"
                type="text"
                placeholder="Enter table number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                required
                className="w-full h-12 px-4 bg-gray-50 border-0 rounded-lg text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-orange-200"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <Label htmlFor="password" className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  PASSWORD
                </Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12 px-4 bg-gray-50 border-0 rounded-lg text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-orange-200"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-orange-400 to-yellow-400 hover:from-orange-500 hover:to-yellow-500 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 transform hover:scale-[1.02]" 
              disabled={isLoading}
            >
              {isLoading ? "SIGNING IN..." : "LOGIN"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 font-medium mb-1">Demo Credentials:</p>
            <p className="text-xs text-gray-500">Email: 101</p>
            <p className="text-xs text-gray-500">Password: admin123</p>
          </div>
        </div>
      </div>
    </div>
  )
}
