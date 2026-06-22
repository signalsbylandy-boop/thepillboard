import { Link } from 'react-router-dom'
import { GlobalPresenceBadge } from '@/components/realtime/LivePresence'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white py-6 dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-orange-600">ThePillboard</span>
            <span>&mdash; community news</span>
          </div>

          <GlobalPresenceBadge />

          <nav className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            <Link to="/about" className="hover:text-orange-600 dark:hover:text-orange-400">
              About
            </Link>
            <Link to="/rules" className="hover:text-orange-600 dark:hover:text-orange-400">
              Rules
            </Link>
            <a
              href="mailto:hello@thepillboard.com"
              className="hover:text-orange-600 dark:hover:text-orange-400"
            >
              Contact
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
