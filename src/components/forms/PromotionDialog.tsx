'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/work/StatusBadge'
import { WorkStatus } from '@prisma/client'

interface PromotionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workId: string
  workTitle: string
  currentStatus: WorkStatus
  onConfirm: (justification: string) => Promise<void>
}

const nextStatus: Record<WorkStatus, WorkStatus | null> = {
  JAM: 'PLATE',
  PLATE: 'CANON',
  CANON: null,
}

export function PromotionDialog({
  open,
  onOpenChange,
  workTitle,
  currentStatus,
  onConfirm,
}: PromotionDialogProps) {
  const [justification, setJustification] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const targetStatus = nextStatus[currentStatus]
  const isCanonPromotion = targetStatus === 'CANON'

  const handleSubmit = async () => {
    if (justification.trim().length < 10) return

    if (isCanonPromotion && !confirmed) {
      setConfirmed(true)
      return
    }

    setLoading(true)
    try {
      await onConfirm(justification)
      setJustification('')
      setConfirmed(false)
      onOpenChange(false)
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setJustification('')
    setConfirmed(false)
    onOpenChange(false)
  }

  if (!targetStatus) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {confirmed ? 'Confirm Canonization' : 'Promote Work'}
          </DialogTitle>
          <DialogDescription className="text-secondary">
            {confirmed
              ? 'This action is permanent and cannot be undone.'
              : `Promoting "${workTitle}" from ${currentStatus} to ${targetStatus}`}
          </DialogDescription>
        </DialogHeader>

        {!confirmed ? (
          <>
            {/* Status Change Preview */}
            <div className="flex items-center justify-center gap-4 py-4">
              <StatusBadge status={currentStatus} />
              <span className="text-secondary">&rarr;</span>
              <StatusBadge status={targetStatus} />
            </div>

            {/* Justification */}
            <div className="space-y-2">
              <Label htmlFor="justification" className="text-sm font-medium">
                Justification <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="justification"
                placeholder="Explain why this work deserves promotion. Be specific about its qualities, significance, or impact..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="min-h-32 border-divider bg-muted/30"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters. This will be permanently recorded.
              </p>
            </div>

            {isCanonPromotion && (
              <div className="border border-canon/30 bg-canon/5 p-4">
                <p className="font-mono text-xs font-semibold text-canon">
                  WARNING: CANON PROMOTION
                </p>
                <p className="mt-1 text-sm text-secondary">
                  Canonization is irreversible. Once canonized, this work becomes
                  a permanent part of the archive and cannot be modified or demoted.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4 py-4">
            <div className="border border-canon bg-canon/5 p-6 text-center">
              <p className="font-serif text-lg text-foreground">
                You are about to permanently canonize
              </p>
              <p className="mt-2 font-serif text-2xl font-semibold text-canon">
                &ldquo;{workTitle}&rdquo;
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-xs text-secondary">YOUR JUSTIFICATION:</p>
              <blockquote className="border-l-2 border-canon pl-4 text-sm text-foreground">
                {justification}
              </blockquote>
            </div>

            <p className="text-center font-mono text-xs text-destructive">
              This action CANNOT be undone.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={justification.trim().length < 10 || loading}
            className={
              confirmed
                ? 'bg-canon text-[#F6F2EA] hover:bg-canon/90'
                : 'bg-foreground text-background hover:bg-foreground/90'
            }
          >
            {loading
              ? 'Processing...'
              : confirmed
                ? 'Confirm Canonization'
                : `Promote to ${targetStatus}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
