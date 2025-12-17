'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { PageContainer, PageHeader, Section } from '@/components/layout/PageContainer'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Role } from '@prisma/client'
import { Metrics } from '@/types'

interface User {
  id: string
  name: string | null
  email: string | null
  role: Role
  createdAt: string
  _count: {
    contributions: number
    promotionEvents: number
    curatedLists: number
  }
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  // Check auth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (session?.user?.role !== 'ADMIN') {
      router.push('/')
    }
  }, [session, status, router])

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [metricsRes, usersRes] = await Promise.all([
          fetch('/api/admin/metrics'),
          fetch('/api/admin/users'),
        ])

        if (metricsRes.ok) {
          const data = await metricsRes.json()
          setMetrics(data.data)
        }

        if (usersRes.ok) {
          const data = await usersRes.json()
          setUsers(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch admin data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.role === 'ADMIN') {
      fetchData()
    }
  }, [session])

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdating(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        )
      }
    } catch (error) {
      console.error('Failed to update role:', error)
    } finally {
      setUpdating(null)
    }
  }

  if (status === 'loading' || !session?.user) {
    return (
      <PageContainer>
        <div className="py-12 text-center">
          <p className="text-secondary">Loading...</p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Admin Dashboard"
        subtitle="System metrics and user management"
      />

      {/* Metrics */}
      <Section number={1} title="Archive Metrics">
        {loading ? (
          <p className="text-secondary">Loading metrics...</p>
        ) : metrics ? (
          <div className="grid gap-6 md:grid-cols-4">
            <MetricCard label="Total Works" value={metrics.totalWorks} />
            <MetricCard label="JAM" value={metrics.jamCount} color="jam" />
            <MetricCard label="PLATE" value={metrics.plateCount} color="plate" />
            <MetricCard
              label="CANON"
              value={metrics.canonCount}
              color="canon"
              subtext={`${metrics.canonPercentage.toFixed(1)}% of total`}
            />
          </div>
        ) : (
          <p className="text-secondary">Failed to load metrics</p>
        )}
      </Section>

      {/* Canon Health Check */}
      <Section number={2} title="Canon Health">
        {metrics && (
          <div className="max-w-md border border-divider p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">Canon Percentage</span>
              <span
                className={`font-mono text-lg font-semibold ${
                  metrics.canonPercentage <= 5
                    ? 'text-jam'
                    : metrics.canonPercentage <= 10
                      ? 'text-plate'
                      : 'text-canon'
                }`}
              >
                {metrics.canonPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="mt-4 h-2 w-full bg-muted">
              <div
                className={`h-full transition-all ${
                  metrics.canonPercentage <= 5
                    ? 'bg-jam'
                    : metrics.canonPercentage <= 10
                      ? 'bg-plate'
                      : 'bg-canon'
                }`}
                style={{ width: `${Math.min(metrics.canonPercentage, 100)}%` }}
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Target: &lt;5% canonized. Current status:{' '}
              {metrics.canonPercentage <= 5 ? (
                <span className="text-jam">Healthy</span>
              ) : metrics.canonPercentage <= 10 ? (
                <span className="text-plate">Warning</span>
              ) : (
                <span className="text-canon">Critical - too permissive</span>
              )}
            </p>
          </div>
        )}
      </Section>

      {/* User Management */}
      <Section number={3} title="User Management">
        {loading ? (
          <p className="text-secondary">Loading users...</p>
        ) : (
          <div className="border border-divider">
            <Table>
              <TableHeader>
                <TableRow className="border-divider hover:bg-transparent">
                  <TableHead className="font-mono text-xs">User</TableHead>
                  <TableHead className="font-mono text-xs">Role</TableHead>
                  <TableHead className="font-mono text-xs">Contributions</TableHead>
                  <TableHead className="font-mono text-xs">Promotions</TableHead>
                  <TableHead className="font-mono text-xs">Lists</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-divider">
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name || 'Anonymous'}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          handleRoleChange(user.id, value as Role)
                        }
                        disabled={
                          updating === user.id || user.id === session?.user?.id
                        }
                      >
                        <SelectTrigger className="w-32 border-divider">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIEWER">VIEWER</SelectItem>
                          <SelectItem value="CREATOR">CREATOR</SelectItem>
                          <SelectItem value="CURATOR">CURATOR</SelectItem>
                          <SelectItem value="ADMIN">ADMIN</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {user._count.contributions}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {user._count.promotionEvents}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {user._count.curatedLists}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>
    </PageContainer>
  )
}

function MetricCard({
  label,
  value,
  color,
  subtext,
}: {
  label: string
  value: number
  color?: 'jam' | 'plate' | 'canon'
  subtext?: string
}) {
  const colorClass = color
    ? { jam: 'text-jam', plate: 'text-plate', canon: 'text-canon' }[color]
    : 'text-foreground'

  return (
    <div className="border border-divider p-6">
      <p className="font-mono text-xs text-secondary">{label}</p>
      <p className={`mt-2 font-mono text-3xl font-light ${colorClass}`}>
        {value}
      </p>
      {subtext && (
        <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
      )}
    </div>
  )
}
