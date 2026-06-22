import { Link, useNavigate } from 'react-router-dom'
import { PenSquare, LogOut, Shield, User, Moon, Sun } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { GlobalPresenceBadge } from '@/components/realtime/LivePresence'
import { cn } from '@/lib/utils'

export function Header() {
  const { user, isAuthenticated, isMod, logout } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
      setTheme('dark')
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', next === 'dark')
    localStorage.setItem('theme', next)
    setTheme(next)
  }

  const handleLogout = () => {
    logout.mutate()
    navigate('/')
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-1.5 font-bold text-lg text-brand-600 dark:text-brand-400 hover:opacity-80 shrink-0"
        >
          <span className="text-xl">●</span>
          <span>thepillboard</span>
        </Link>

        {/* Live presence badge */}
        <div className="hidden md:flex flex-1">
          <GlobalPresenceBadge />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="btn-ghost p-2"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated ? (
            <>
              <Link to="/submit" className="btn-primary text-xs px-3 py-1.5 gap-1">
                <PenSquare className="w-3.5 h-3.5" />
                Submit
              </Link>

              <div className="relative">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
                    menuOpen && 'bg-zinc-100 dark:bg-zinc-800'
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                    {user?.username[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-zinc-700 dark:text-zinc-300 max-w-[80px] truncate">
                    {user?.username}
                  </span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 card shadow-lg py-1 z-50 animate-slide-up">
                    <Link
                      to={`/u/${user?.username}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      onClick={() => setMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    {isMod && (
                      <Link
                        to="/moderation"
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-orange-600"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Shield className="w-4 h-4" />
                        Moderation
                      </Link>
                    )}
                    <hr className="my-1 border-zinc-100 dark:border-zinc-800" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 text-red-600 dark:text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">Log in</Link>
              <Link to="/register" className="btn-primary text-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile presence bar */}
      <div className="md:hidden px-4 pb-1.5 flex justify-center">
        <GlobalPresenceBadge />
      </div>
    </header>
  )
}
