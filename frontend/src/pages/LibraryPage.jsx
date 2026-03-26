import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { searchRepos } from '../services/api.js'
import RepoCard from '../components/RepoCard.jsx'
import RepoFeed from '../components/RepoFeed.jsx'
import PreviewModal from '../components/PreviewModal.jsx'

/* ── Loading skeleton ──────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, height: 180,
    }}>
      <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 12, width: '90%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 12, width: '75%', marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 8, width: '40%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 1, width: '100%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 10, width: '50%' }} />
    </div>
  )
}

/* ── Main Repos Page ───────────────────────────────────── */
export default function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q          = searchParams.get('q') || ''
  const langParam   = searchParams.get('lang') || ''

  const [query,      setQuery]      = useState(q)
  const [repos,      setRepos]      = useState([])
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)
  const [totalRepos, setTotalRepos] = useState(0)
  const [page,       setPage]       = useState(1)
  const [selected,   setSelected]   = useState(null)
  const inputRef   = useRef(null)
  const debounce   = useRef(null)

  const doSearch = useCallback(async (searchQ, p = 1, searchLang = '') => {
    if (!searchQ.trim()) return
    setLoading(true); setError(null)
    try {
      const repoData = await searchRepos(searchQ, searchLang, p)
      setRepos(p === 1 ? repoData.items : prev => [...prev, ...repoData.items])
      setTotalRepos(repoData.total_count || 0)
    } catch (err) {
      setError(err.response?.data?.detail || 'Search failed.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Run search when query/lang in URL changes
  useEffect(() => {
    const qp = searchParams.get('q') || ''
    const lp = searchParams.get('lang') || ''
    setQuery(qp)
    setPage(1)
    if (qp) doSearch(qp, 1, lp)
  }, [searchParams]) // eslint-disable-line

  const handleInput = (e) => {
    const v = e.target.value
    setQuery(v)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      setPage(1)
      setSearchParams({ q: v })
    }, 400)
  }

  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounce.current)
      setSearchParams({ q: query })
    }
  }

  const loadMore = () => {
    const next = page + 1
    setPage(next)
    doSearch(query, next, langParam)
  }

  return (
    <div className="premium-bg" style={{ minHeight: '100vh' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>

      {/* ── Search bar ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 600 }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)', fontSize: 15, pointerEvents: 'none',
            }}>🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={handleInput}
              onKeyDown={handleEnter}
              placeholder="Search repositories…"
              style={{
                width: '100%', padding: '13px 18px 13px 44px',
                background: 'var(--bg2)', border: '1px solid var(--border2)',
                borderRadius: 12, color: 'var(--text)',
                fontFamily: 'var(--sans)', fontSize: 14,
                outline: 'none', transition: 'border-color .2s, box-shadow .2s',
                boxShadow: '0 4px 20px rgba(0,0,0,.3)',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(0,212,255,.45)'
                e.target.style.boxShadow = '0 0 0 3px rgba(0,212,255,.1),0 4px 20px rgba(0,0,0,.3)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'var(--border2)'
                e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,.3)'
              }}
            />
            {loading && (
              <span style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                width: 16, height: 16, border: '2px solid var(--accent)', borderTopColor: 'transparent',
                borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block',
              }} />
            )}
          </div>
        </div>

        {!loading && query && (
          <p style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', marginTop: 12 }}>
            {totalRepos.toLocaleString()} repositories found · showing {repos.length}
          </p>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          padding: '14px 18px', marginBottom: 24,
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
          borderRadius: 10, color: 'var(--red)', fontSize: 13, fontFamily: 'var(--mono)',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && query && repos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', color: 'var(--text3)' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔍</div>
          <p style={{ fontSize: 15 }}>No repositories found for "<strong style={{ color: 'var(--text2)' }}>{query}</strong>"</p>
          <p style={{ fontSize: 12, marginTop: 8, fontFamily: 'var(--mono)' }}>Try a different search term</p>
        </div>
      )}

      {/* ── No query: Show Recommended Feed ── */}
      {!query && !loading && (
        <div style={{ marginTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 20 }}>✨</span>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              Recommended for You
            </h2>
          </div>
          <RepoFeed hideHeader={true} onClick={setSelected} />
        </div>
      )}

      {/* ── Loading skeletons ── */}
      {loading && (
        <div>
          <SectionHeader icon="📦" title="Repositories" />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
            gap: 16,
          }}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {!loading && repos.length > 0 && (
        <div>
          <SectionHeader icon="📦" title="Repositories" count={totalRepos} />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
            gap: 16,
          }}>
            {repos.map((r, i) => (
              <RepoCard key={`${r.id}-${i}`} repo={r} onClick={setSelected} />
            ))}
          </div>

          {repos.length < totalRepos && repos.length < 60 && (
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button
                onClick={loadMore}
                disabled={loading}
                style={{
                  padding: '12px 36px', borderRadius: 10,
                  border: '1px solid var(--border2)',
                  background: 'transparent', color: 'var(--text)',
                  fontSize: 14, cursor: 'pointer', transition: 'all .18s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(0,212,255,.3)'
                  e.currentTarget.style.color = 'var(--accent)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border2)'
                  e.currentTarget.style.color = 'var(--text)'
                }}
              >
                Load more repos
              </button>
            </div>
          )}
        </div>
      )}

      {selected && <PreviewModal repo={selected} onClose={() => setSelected(null)} />}
    </div>
    </div>
  )
}

function SectionHeader({ icon, title, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 16, paddingBottom: 12,
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{title}</span>
      {count != null && (
        <span style={{
          fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text3)',
          padding: '2px 8px', borderRadius: 20,
          background: 'var(--bg3)', border: '1px solid var(--border)',
        }}>
          {count.toLocaleString()}
        </span>
      )}
    </div>
  )
}
