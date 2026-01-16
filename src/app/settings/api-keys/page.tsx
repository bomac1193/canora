'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { KeyIcon, TrashIcon, CopyIcon, CheckIcon, PlusIcon, AlertTriangleIcon } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  keyPreview: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

const AVAILABLE_SCOPES = [
  { value: 'works:read', label: 'Works Read', description: 'Read work data' },
  { value: 'works:write', label: 'Works Write', description: 'Create and update works' },
  { value: 'signals:write', label: 'Signals Write', description: 'Send engagement signals' },
  { value: 'canon:graduate', label: 'Canon Graduate', description: 'Graduate works to ISSUANCE' },
  { value: 'webhooks:manage', label: 'Webhooks Manage', description: 'Manage webhook subscriptions' },
]

export default function ApiKeysPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null)
  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [expiresInDays, setExpiresInDays] = useState('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Check auth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/apikey')
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.keys)
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session?.user) {
      fetchApiKeys()
    }
  }, [session, fetchApiKeys])

  const handleCreateKey = async () => {
    if (!name || selectedScopes.length === 0) return

    setCreating(true)
    try {
      const res = await fetch('/api/v1/auth/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          scopes: selectedScopes,
          expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setNewKey(data.key)
        setCreateDialogOpen(false)
        setNewKeyDialogOpen(true)
        fetchApiKeys()

        // Reset form
        setName('')
        setSelectedScopes([])
        setExpiresInDays('')
      }
    } catch (error) {
      console.error('Failed to create API key:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteKey = async () => {
    if (!keyToDelete) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/v1/auth/apikey/${keyToDelete.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== keyToDelete.id))
        setDeleteDialogOpen(false)
        setKeyToDelete(null)
      }
    } catch (error) {
      console.error('Failed to delete API key:', error)
    } finally {
      setDeleting(false)
    }
  }

  const handleCopyKey = async () => {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
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
        title="API Keys"
        subtitle="Manage API keys for programmatic access to CANORA"
      >
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for programmatic access. The key will only be shown once.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="My API Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Scopes</Label>
                <div className="grid gap-2">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <label
                      key={scope.value}
                      className="flex cursor-pointer items-center gap-3 rounded-md border border-divider p-3 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope.value)}
                        onChange={() => toggleScope(scope.value)}
                        className="h-4 w-4"
                      />
                      <div>
                        <p className="font-mono text-sm font-medium">{scope.value}</p>
                        <p className="text-xs text-muted-foreground">{scope.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires">Expires In (days, optional)</Label>
                <Input
                  id="expires"
                  type="number"
                  placeholder="Leave empty for no expiration"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateKey}
                disabled={!name || selectedScopes.length === 0 || creating}
              >
                {creating ? 'Creating...' : 'Create Key'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* New Key Display Dialog */}
      <Dialog open={newKeyDialogOpen} onOpenChange={(open) => {
        setNewKeyDialogOpen(open)
        if (!open) setNewKey(null)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />
              Save Your API Key
            </DialogTitle>
            <DialogDescription>
              This key will only be shown once. Copy it now and store it securely.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            <div className="flex items-center gap-2 rounded-md border border-divider bg-muted p-3">
              <code className="flex-1 break-all font-mono text-sm">{newKey}</code>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyKey}
                className="shrink-0"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <CopyIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => {
              setNewKeyDialogOpen(false)
              setNewKey(null)
            }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke &quot;{keyToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteKey}
              disabled={deleting}
            >
              {deleting ? 'Revoking...' : 'Revoke Key'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Section number={1} title="Your API Keys">
        {loading ? (
          <p className="text-secondary">Loading API keys...</p>
        ) : apiKeys.length === 0 ? (
          <div className="border border-divider p-12 text-center">
            <KeyIcon className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-secondary">No API keys yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an API key to access CANORA programmatically
            </p>
          </div>
        ) : (
          <div className="border border-divider">
            <Table>
              <TableHeader>
                <TableRow className="border-divider hover:bg-transparent">
                  <TableHead className="font-mono text-xs">Name</TableHead>
                  <TableHead className="font-mono text-xs">Key</TableHead>
                  <TableHead className="font-mono text-xs">Scopes</TableHead>
                  <TableHead className="font-mono text-xs">Last Used</TableHead>
                  <TableHead className="font-mono text-xs">Created</TableHead>
                  <TableHead className="font-mono text-xs">Expires</TableHead>
                  <TableHead className="font-mono text-xs w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id} className="border-divider">
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                        {key.keyPreview}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant="outline" className="font-mono text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(key.lastUsedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(key.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(key.expiresAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setKeyToDelete(key)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <TrashIcon className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Section>

      <Section number={2} title="API Documentation">
        <div className="border border-divider p-6">
          <p className="text-secondary">
            Use your API key by including it in the <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">X-API-Key</code> header of your requests.
          </p>
          <div className="mt-4 rounded-md bg-muted p-4">
            <pre className="overflow-x-auto font-mono text-sm">
{`curl -H "X-API-Key: YOUR_API_KEY" \\
     https://canora.fm/api/v1/works`}
            </pre>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Available endpoints: <code>/api/v1/works</code>, <code>/api/v1/canon</code>, <code>/api/v1/webhooks</code>
          </p>
        </div>
      </Section>
    </PageContainer>
  )
}
