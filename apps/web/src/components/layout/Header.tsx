import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LogOut, Shield, User, Moon, Sun, PenSquare } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const BASE_CATEGORIES = [
  { label: 'He Said', slug: 'he-said' },
  { label: 'She Said', slug: 'she-said' },
  { label: 'Dating', slug: 'dating' },
  { label: 'Relationships', slug: 'relationships' },
  { label: 'Culture', slug: 'culture' },
  { label: 'Red Flags', slug: 'red-flags' },
  { label: 'Hot Takes', slug: 'hot-takes' },
]

export function Header() {
  const { user, isAuthenticated, isMod, logout } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const activeTag = params.get('tag')
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )
  // Randomly swap He Said / She Said order on each page load
  const [categories] = useState(() => {
    const [heSaid, sheSaid, ...rest] = BASE_CATEGORIES
    return Math.random() < 0.5
      ? [heSaid, sheSaid, ...rest]
      : [sheSaid, heSaid, ...rest]
  })
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
    <header className="sticky top-0 z-50 bg-slate-900 dark:bg-slate-950 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-0">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 shrink-0 pr-4 border-r border-slate-700"
        >
          <span className="text-orange-500 font-black text-xl leading-none">●</span>
          <div className="flex flex-col leading-none">
            <span className="text-slate-400 font-medium text-[9px] uppercase tracking-widest">The</span>
            <span className="text-white font-black text-sm tracking-tight uppercase leading-none">Pillboard</span>
          </div>
          <span className="hidden lg:block text-slate-600 text-[10px] italic ml-1 self-end pb-0.5">he said · she said</span>
        </Link>

        {/* Category tabs */}
        <nav className="hidden md:flex items-stretch h-12 divide-x divide-slate-700 border-r border-slate-700">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={`/?tag=${cat.slug}`}
              className={cn(
                'px-3.5 flex items-center text-[11px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap',
                activeTag === cat.slug
                  ? cat.slug === 'he-said'
                    ? 'text-blue-400 bg-slate-800'
                    : cat.slug === 'she-said'
                      ? 'text-rose-400 bg-slate-800'
                      : 'text-orange-400 bg-slate-800'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              {cat.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Right controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-400 hover:text-white transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {isAuthenticated ? (
            <>
              <Link
                to="/submit"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded transition-colors ml-1"
              >
                <PenSquare className="w-3.5 h-3.5" />
                Submit
              </Link>

              <div className="relative ml-1">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-800 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                    {user?.username[0]?.toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-slate-300 text-xs max-w-[80px] truncate">
                    {user?.username}
                  </span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-50">
                    <Link
                      to={`/u/${user?.username}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => setMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      {user?.username}
                    </Link>
                    {isMod && (
                      <Link
                        to="/moderation"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-orange-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Shield className="w-4 h-4" />
                        Moderation
                      </Link>
                    )}
                    <hr className="my-1 border-slate-100 dark:border-slate-800" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-slate-50 dark:hover:bg-slate-800"
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
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
