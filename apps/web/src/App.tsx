import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy, Component } from 'react'
import type { ReactNode } from 'react'
import { Header } from '@/components/layout/Header'
import { useGlobalPresence } from '@/hooks/usePresence'
import { Loader2 } from 'lucide-react'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-5xl">⚠️</p>
          <p className="text-slate-700 dark:text-slate-300 font-semibold">Something went wrong</p>
          <p className="text-xs text-slate-400 font-mono max-w-sm break-all">{(this.state.error as Error).message}</p>
          <a href="/" className="btn-outline text-sm mt-2">← Go home</a>
        </div>
      )
    }
    return this.props.children
  }
}

const HomePage = lazy(() => import('@/pages/Home').then((m) => ({ default: m.HomePage })))
const PostPage = lazy(() => import('@/pages/Post').then((m) => ({ default: m.PostPage })))
const LoginPage = lazy(() => import('@/pages/Login').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/Register').then((m) => ({ default: m.RegisterPage })))
const SubmitPage = lazy(() => import('@/pages/Submit').then((m) => ({ default: m.SubmitPage })))
const ModerationPage = lazy(() => import('@/pages/Moderation').then((m) => ({ default: m.ModerationPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function AppInner() {
  // Connect to global presence WebSocket for the entire session
  useGlobalPresence()

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <ErrorBoundary>
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/p/:slug" element={<PostPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/moderation" element={<ModerationPage />} />
          <Route
            path="*"
            element={
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <h1 className="text-6xl font-bold text-zinc-200 dark:text-zinc-800">404</h1>
                <p className="text-zinc-500">Page not found</p>
                <a href="/" className="btn-outline text-sm">Go home</a>
              </div>
            }
          />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </div>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
