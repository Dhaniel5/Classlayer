import { useState } from 'react'
import { Plus, Megaphone, Loader2 } from 'lucide-react'
import { useStore } from '@/services/store'
import { useAuth } from '@/services/auth/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogFooter } from '@/components/ui/dialog'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/states'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { canManageSchool } from '@/lib/permissions'
import type { AnnouncementAudience } from '@/types'

export default function AnnouncementsPage() {
  const { announcements, classes, actions } = useStore()
  const { user } = useAuth()
  const { toast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const canPost = !!user && canManageSchool(user.role)
  const [form, setForm] = useState({
    title: '', message: '', audience: 'All Parents' as AnnouncementAudience, classId: classes[0]?.id ?? '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.message.trim()) return
    if (form.audience === 'Specific Class' && !form.classId) return
    setBusy(true)
    try {
      await actions.addAnnouncement({ title: form.title, message: form.message, audience: form.audience, classId: form.classId })
      toast({ title: 'Announcement posted', description: form.title, tone: 'success' })
      setAddOpen(false)
      setForm({ title: '', message: '', audience: 'All Parents', classId: classes[0]?.id ?? '' })
    } catch (err) {
      toast({ title: 'Could not post announcement', description: (err as Error).message, tone: 'error' })
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Announcements</h1>
          <p className="text-sm text-slate-500 mt-0.5">{announcements.length} announcements</p>
        </div>
        {canPost && <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> New Announcement</Button>}
      </div>

      {announcements.length === 0 ? (
        <EmptyState title="No announcements yet" description={canPost ? "Post your first announcement." : undefined} />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                    <Megaphone className="h-4.5 w-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900">{a.title}</h3>
                      <Badge tone="info">{a.audience}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{a.message}</p>
                    <p className="text-xs text-slate-400 mt-2">{formatDate(a.date)} · {a.createdBy}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="New Announcement" description="Post a school announcement">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
          </div>
          <div>
            <Label>Audience</Label>
            <Select value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as AnnouncementAudience }))}>
              <option>All Parents</option>
              <option>Specific Class</option>
              <option>Teachers</option>
              <option>Staff</option>
            </Select>
          </div>
          {form.audience === 'Specific Class' && (
            <div>
              <Label>Class</Label>
              <Select value={form.classId} onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Post Announcement</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  )
}
