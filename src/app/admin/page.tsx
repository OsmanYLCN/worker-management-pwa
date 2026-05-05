import { getFairs, getTemplates, getWorkersWithStats } from '@/app/actions/admin'
import { AdminDashboardHub } from '@/components/admin/AdminDashboardHub'

export default async function AdminPage() {
  const [fairsRes, templatesRes, workersRes] = await Promise.all([
    getFairs(),
    getTemplates(),
    getWorkersWithStats(),
  ])

  return (
    <AdminDashboardHub
      fairs={fairsRes.data || []}
      templates={templatesRes.data || []}
      workers={workersRes.data || []}
    />
  )
}
