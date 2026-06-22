import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { SubmitForm } from '@/components/posts/SubmitForm'

export function SubmitPage() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/submit' }} replace />
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Submit to ThePillboard</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Share a link or write a text post. All submissions are reviewed before going public.
        </p>
      </div>
      <div className="card p-6">
        <SubmitForm />
      </div>
    </div>
  )
}
