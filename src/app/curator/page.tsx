'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageContainer, PageHeader, Section } from '@/components/layout/PageContainer'
import { StatusBadge } from '@/components/work/StatusBadge'
import { PromotionDialog } from '@/components/forms/PromotionDialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatWorkId } from '@/lib/utils'
import { WorkStatus } from '@prisma/client'

interface Work {
  id: string
  slug: string
  title: string
  status: WorkStatus
  createdAt: string
  contributions: Array<{ displayName: string; role: string }>
}

interface PaginatedResponse {
  data: Work[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export default function CuratorDeskPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [filterStatus, setFilterStatus] = useState<WorkStatus | ''>('JAM')

  const [promotionWork, setPromotionWork] = useState<Work | null>(null)

  // Check auth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (session?.user?.role && !['CURATOR', 'ADMIN'].includes(session.user.role)) {
      router.push('/')
    }
  }, [session, status, router])

  // Fetch works
  useEffect(() => {
    async function fetchWorks() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '20',
        })
        if (filterStatus) {
          params.set('status', filterStatus)
        }

        const res = await fetch(`/api/works?${params}`)
        if (res.ok) {
          const json: PaginatedResponse = await res.json()
          setWorks(json.data)
          setTotal(json.total)
          setTotalPages(json.totalPages)
        }
      } catch (error) {
        console.error('Failed to fetch works:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchWorks()
    }
  }, [session, page, filterStatus])

  const handlePromotion = async (justification: string) => {
    if (!promotionWork) return

    const res = await fetch(`/api/works/${promotionWork.id}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justification }),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Promotion failed')
    }

    // Refresh the list
    setWorks((prev) =>
      prev.map((w) =>
        w.id === promotionWork.id
          ? {
              ...w,
              status:
                w.status === 'JAM'
                  ? 'PLATE'
                  : w.status === 'PLATE'
                    ? 'CANON'
                    : w.status,
            }
          : w
      )
    )
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
        title="Curator Desk"
        subtitle="Review, evaluate, and promote works through the CANORA pipeline"
      />

      {/* Filters */}
      <Section>
        <div className="flex items-center gap-4">
          <span className="text-sm text-secondary">Filter by status:</span>
          <div className="flex gap-2">
            {['JAM', 'PLATE', ''].map((s) => (
              <Button
                key={s || 'all'}
                variant={filterStatus === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setFilterStatus(s as WorkStatus | '')
                  setPage(1)
                }}
                className="font-mono text-xs"
              >
                {s || 'ALL'}
              </Button>
            ))}
          </div>
          <span className="ml-auto font-mono text-xs text-secondary">
            {total} work{total !== 1 ? 's' : ''}
          </span>
        </div>
      </Section>

      {/* Works Table */}
      <Section number={1} title="Work Queue">
        {loading ? (
          <div className="py-8 text-center text-secondary">Loading works...</div>
        ) : works.length === 0 ? (
          <div className="border border-dashed border-divider py-8 text-center">
            <p className="text-secondary">No works found</p>
          </div>
        ) : (
          <>
            <div className="border border-divider">
              <Table>
                <TableHeader>
                  <TableRow className="border-divider hover:bg-transparent">
                    <TableHead className="font-mono text-xs">ID</TableHead>
                    <TableHead className="font-mono text-xs">Title</TableHead>
                    <TableHead className="font-mono text-xs">Status</TableHead>
                    <TableHead className="font-mono text-xs">Created</TableHead>
                    <TableHead className="font-mono text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {works.map((work) => (
                    <TableRow key={work.id} className="border-divider">
                      <TableCell className="font-mono text-xs text-secondary">
                        {formatWorkId(work.slug).slice(0, 16)}...
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/work/${work.slug}`}
                          className="font-serif hover:text-canon hover:underline"
                        >
                          {work.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={work.status} size="sm" />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-secondary">
                        {formatDate(work.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {work.status !== 'CANON' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPromotionWork(work)}
                            className="font-mono text-xs"
                          >
                            Promote
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="font-mono text-xs text-secondary">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Promotion Guidelines */}
      <Section number={2} title="Promotion Guidelines">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="border border-jam/30 bg-jam/5 p-6">
            <h3 className="font-serif text-lg font-medium">JAM &rarr; PLATE</h3>
            <p className="mt-2 text-sm text-secondary">
              Elevate works that demonstrate notable quality, originality, or cultural
              significance. PLATE status indicates curator approval but remains reversible.
            </p>
          </div>
          <div className="border border-canon/30 bg-canon/5 p-6">
            <h3 className="font-serif text-lg font-medium text-canon">PLATE &rarr; CANON</h3>
            <p className="mt-2 text-sm text-secondary">
              <strong>Irreversible.</strong> Only promote to CANON works that deserve
              permanent preservation. This decision cannot be undone.
            </p>
          </div>
        </div>
      </Section>

      {/* Promotion Dialog */}
      {promotionWork && (
        <PromotionDialog
          open={!!promotionWork}
          onOpenChange={(open) => !open && setPromotionWork(null)}
          workId={promotionWork.id}
          workTitle={promotionWork.title}
          currentStatus={promotionWork.status}
          onConfirm={handlePromotion}
        />
      )}
    </PageContainer>
  )
}
