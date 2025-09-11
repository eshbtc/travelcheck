"use client"

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { listUsers, setUserRole } from '@/services/firebaseFunctions'
import { toast } from 'react-hot-toast'

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<any[]>([])

  const adminEmails = useMemo(() => (
    (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)
  ), [])

  const isAdmin = useMemo(() => {
    if (!user) return false
    const emailIsAdmin = !!(user.email && adminEmails.includes((user.email || '').toLowerCase()))
    const roleIsAdmin = (user as any).role === 'admin'
    return emailIsAdmin || roleIsAdmin
  }, [user, adminEmails])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
  }, [isLoading, user, router])

  const loadUsers = React.useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await listUsers()
      if (res?.success && Array.isArray(res.users)) {
        setUsers(res.users)
      } else {
        toast.error('Failed to fetch users')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isAdmin) void loadUsers()
  }, [isAdmin, loadUsers])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="rounded-xl border border-border-light bg-bg-primary p-8 text-center shadow-kaggle">
          <h1 className="text-2xl font-semibold text-text-primary">403 • Admins only</h1>
          <p className="mt-2 text-text-secondary">You do not have access to this page.</p>
        </div>
      </div>
    )
  }

  const handleSetRole = async (targetUserId: string, role: 'admin' | 'user') => {
    const tid = toast.loading('Updating role...')
    try {
      const res = await setUserRole(targetUserId, role)
      if (res?.success) {
        toast.success('Role updated', { id: tid })
        setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role } : u))
      } else {
        toast.error('Failed to update role', { id: tid })
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update role', { id: tid })
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Users</h1>
          <p className="mt-2 text-text-secondary">Admin-only management of user roles.</p>
        </div>
        <button
          onClick={() => void loadUsers()}
          className="rounded-lg border border-border-light bg-bg-primary px-4 py-2 text-sm hover:bg-bg-secondary"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border-light bg-bg-primary shadow-kaggle">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-light">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">Role</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light bg-bg-primary">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{u.full_name || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">{u.email || '—'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{u.role || 'user'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="inline-flex gap-2">
                      <button
                        className="rounded-lg border px-3 py-1 text-sm hover:bg-bg-secondary"
                        onClick={() => void handleSetRole(u.id, 'user')}
                      >
                        Set User
                      </button>
                      <button
                        className="rounded-lg border px-3 py-1 text-sm hover:bg-bg-secondary"
                        onClick={() => void handleSetRole(u.id, 'admin')}
                      >
                        Set Admin
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-center text-sm text-text-secondary" colSpan={4}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

