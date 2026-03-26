import { Link, useLocation, useNavigate } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/library', label: 'Repositories' },
  { to: '/competitions', label: 'Competitions' },
]

export default function SiteHeader() {
  const location = useLocation()
  const navigate = useNavigate()

  const pathname = location.pathname
  const parts = pathname.split('/').filter(Boolean)
  const mode = parts[0]
  const owner = parts[1]
  const repo = parts[2]

  const isHome = pathname === '/'
  const isRepoPage = ['learn', 'quiz', 'practice'].includes(mode) && owner && repo

  return (
    <header className="glass-header site-header">
      <Link to="/" className="site-brand" aria-label="Go to home">
        <img
          src="/favicon.svg"
          alt="GitLearn Logo"
          className="site-brand-logo"
        />
        <span className="site-brand-text">
          Git<span>Learn</span>
        </span>
      </Link>

      {isRepoPage ? (
        <div className="site-breadcrumbs" aria-label="Breadcrumb">
          <span className="site-breadcrumb-link" onClick={() => navigate('/')}>Home</span>
          <span className="site-breadcrumb-sep">/</span>
          <span className="site-breadcrumb-current">{owner}/{repo}</span>
          <span className="site-breadcrumb-sep">/</span>
          <span className="site-breadcrumb-mode">
            {mode === 'learn' ? '📚 Learn' : mode === 'quiz' ? '📝 Quiz' : '💻 Practice'}
          </span>
        </div>
      ) : (
        <nav className="site-nav" aria-label="Primary">
          {NAV_LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`site-nav-link${pathname === to ? ' is-active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}

      <div className="site-actions">
        {!isHome && (
          <button
            className="site-button site-button--ghost"
            onClick={() => navigate('/')}
            type="button"
          >
            ← Home
          </button>
        )}

        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="site-button site-button--link"
        >
          <svg className="site-button-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          GitHub
        </a>

        <div className="site-pill">
          <span className="site-pill-dot" />
          AI Active
        </div>
      </div>
    </header>
  )
}
