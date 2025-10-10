export interface DashboardMetricsResponse {
  success: boolean
  data?: {
    totalUsers: number
    menuItems: number
    todaysOrders: number
    bookings: number
    revenueToday: number
  }
  error?: string
}

export async function fetchDashboardMetrics(): Promise<DashboardMetricsResponse> {
  try {
    const res = await fetch('/api/admin-dashboard', { cache: 'no-store' })
    const json = await res.json()
    return json
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to load dashboard metrics' }
  }
}