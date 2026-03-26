import { useState, useEffect } from 'react'
import { getLocalCompetitions, getGlobalCompetitions } from '../services/api.js'

// ── Status config ─────────────────────────────────────────
const STATUS = {
  live:     { label: 'Live Now',          dot: '#34d399', text: '#34d399', bg: 'rgba(52,211,153,.10)',  border: 'rgba(52,211,153,.22)' },
  ongoing:  { label: 'Ongoing',           dot: '#22d3ee', text: '#22d3ee', bg: 'rgba(34,211,238,.10)',  border: 'rgba(34,211,238,.22)' },
  open:     { label: 'Registration Open', dot: '#fbbf24', text: '#fbbf24', bg: 'rgba(251,191,36,.10)',  border: 'rgba(251,191,36,.22)' },
  upcoming: { label: 'Upcoming',          dot: '#60a5fa', text: '#60a5fa', bg: 'rgba(96,165,250,.10)',  border: 'rgba(96,165,250,.22)' },
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.upcoming
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 9, fontWeight: 700, letterSpacing: '.8px',
      textTransform: 'uppercase', padding: '3px 9px', borderRadius: 20,
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%', background: s.dot,
        animation: status === 'live' || status === 'ongoing' ? 'blink 2s infinite' : 'none',
      }}/>
      {s.label}
    </span>
  )
}

function fmt(n) {
  if (!n) return '—'
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)
}

// ── Region badge ─────────────────────────────────────────
function RegionBadge({ city, region }) {
  const isLocal = city === 'Stara Zagora' || region === 'Stara Zagora'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 9, fontWeight: 700, letterSpacing: '.5px',
      textTransform: 'uppercase', padding: '2px 8px', borderRadius: 20,
      background: isLocal ? 'rgba(251,191,36,.10)' : 'rgba(255,255,255,.05)',
      color: isLocal ? '#fbbf24' : 'var(--text3)',
      border: `1px solid ${isLocal ? 'rgba(251,191,36,.2)' : 'rgba(255,255,255,.08)'}`,
    }}>
      {isLocal ? '📍' : '🇧🇬'} {city || region}
    </span>
  )
}

// ── Local competition card ───────────────────────────────
function LocalCard({ comp, onJoin, joined }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 16, overflow: 'hidden',
      transition: 'all .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 36px rgba(0,0,0,.4)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Card body */}
      <div style={{ padding: 20 }}>
        {/* Top row */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 13, flexShrink: 0,
            background: `linear-gradient(135deg, ${comp.gradient_from}, ${comp.gradient_to})`,
            boxShadow: `0 4px 16px ${comp.gradient_from}44`,
          }}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center' }}>
              <StatusBadge status={comp.status} />
              <RegionBadge city={comp.city} region={comp.region} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, margin: 0 }}>
              {comp.title}
            </h3>
          </div>
        </div>

        {/* Description */}
        <p style={{
          fontSize: 12, color: 'var(--text2)', lineHeight: 1.65, margin: '0 0 12px',
          display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {comp.description}
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
          {comp.tags?.map(t => (
            <span key={t} style={{
              fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 8px',
              borderRadius: 4, background: 'rgba(0,212,255,.06)',
              color: 'rgba(0,212,255,.75)', border: '1px solid rgba(0,212,255,.12)',
            }}>{t}</span>
          ))}
        </div>

        {/* Meta row */}
        <div style={{
          display: 'flex', gap: 16, fontSize: 11, fontFamily: 'var(--mono)',
          color: 'var(--text3)', flexWrap: 'wrap',
        }}>
          {comp.participants > 0 && (
            <span>👥 {fmt(comp.participants)} participants</span>
          )}
          {comp.prize && <span style={{ color: 'var(--amber)' }}>🏆 {comp.prize}</span>}
          {comp.deadline && <span>📅 {comp.deadline}</span>}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderTop: '1px solid var(--border)',
        background: 'rgba(255,255,255,.015)',
      }}>
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            fontSize: 11, fontFamily: 'var(--mono)', cursor: 'pointer',
            padding: 0, transition: 'color .15s',
          }}
          onMouseEnter={e => e.target.style.color = 'var(--text2)'}
          onMouseLeave={e => e.target.style.color = 'var(--text3)'}
        >
          {expanded ? '▲ Less' : '▼ More details'}
        </button>

        {joined ? (
          <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: '#34d399' }}>
            ✓ Registered
          </span>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={comp.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid var(--border2)',
                color: 'var(--text2)', fontSize: 11,
                fontFamily: 'var(--mono)', textDecoration: 'none',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.18)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
            >
              ↗ Website
            </a>
            <button
              onClick={() => onJoin(comp.id)}
              style={{
                padding: '6px 16px', borderRadius: 8, border: 'none',
                background: comp.status === 'open' || comp.status === 'live' ? 'var(--accent)' : 'rgba(255,255,255,.08)',
                color: comp.status === 'open' || comp.status === 'live' ? '#000' : 'var(--text2)',
                fontSize: 11, fontWeight: 700, fontFamily: 'var(--sans)',
                cursor: 'pointer', transition: 'opacity .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '.82'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {comp.status === 'open' ? 'Register' : comp.status === 'live' ? 'Join' : 'Notify Me'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Global (Codeforces) contest card ─────────────────────
function GlobalCard({ comp }) {
  const s = STATUS[comp.status] || STATUS.upcoming

  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      transition: 'all .2s', cursor: 'pointer',
    }}
      onClick={() => window.open(comp.url, '_blank', 'noopener')}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Gradient icon */}
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: `linear-gradient(135deg, ${comp.gradient_from}, ${comp.gradient_to})`,
        boxShadow: `0 3px 12px ${comp.gradient_from}44`,
      }}/>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <StatusBadge status={comp.status} />
          {comp.duration && (
            <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
              ⏱ {comp.duration}
            </span>
          )}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: 3,
        }}>
          {comp.title}
        </div>
        <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
          {comp.starts_in
            ? `Starts in ${comp.starts_in}`
            : comp.status === 'live' ? 'Running now'
            : comp.deadline || ''}
        </div>
      </div>

      {/* CTA */}
      <a
        href={comp.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{
          padding: '6px 14px', borderRadius: 8, flexShrink: 0,
          background: comp.status === 'live' ? 'var(--accent)' : 'rgba(255,255,255,.07)',
          color: comp.status === 'live' ? '#000' : 'var(--text2)',
          fontSize: 11, fontWeight: 700, fontFamily: 'var(--sans)',
          textDecoration: 'none', transition: 'opacity .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        {comp.status === 'live' ? 'Join →' : 'Details →'}
      </a>
    </div>
  )
}

// ── Section skeleton ──────────────────────────────────────
function SkelCard({ tall }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 18, height: tall ? 180 : 80,
    }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }}/>
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 10, width: '40%', marginBottom: 8, borderRadius: 4 }}/>
          <div className="skeleton" style={{ height: 13, width: '70%', marginBottom: 6, borderRadius: 4 }}/>
          {tall && <div className="skeleton" style={{ height: 10, width: '90%', borderRadius: 4 }}/>}
        </div>
      </div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, count, accent }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h2 style={{
          fontSize: 22, fontWeight: 800, margin: 0,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            width: 4, height: 28, borderRadius: 2,
            background: `linear-gradient(180deg, ${accent[0]}, ${accent[1]})`,
            display: 'inline-block',
          }}/>
          {icon} {title}
        </h2>
        {count != null && (
          <span style={{
            fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text3)',
            padding: '3px 10px', borderRadius: 20,
            background: 'var(--bg3)', border: '1px solid var(--border)',
          }}>{count} events</span>
        )}
      </div>
      {subtitle && (
        <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0, paddingLeft: 14 }}>{subtitle}</p>
      )}
    </div>
  )
}

// ── Filter row ────────────────────────────────────────────
const LOCAL_FILTERS = [
  { key: 'all',            label: 'All' },
  { key: 'stara-zagora',   label: '📍 Stara Zagora' },
  { key: 'bulgaria',       label: '🇧🇬 All Bulgaria' },
]
const GLOBAL_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'live',     label: '🔴 Live' },
  { key: 'upcoming', label: '⏳ Upcoming' },
]

function FilterBar({ filters, active, setActive }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
      {filters.map(f => (
        <button key={f.key} onClick={() => setActive(f.key)} style={{
          padding: '5px 14px', borderRadius: 16, cursor: 'pointer',
          fontFamily: 'var(--mono)', fontSize: 10, transition: 'all .15s',
          border: active === f.key ? '1px solid var(--accent)' : '1px solid var(--border)',
          background: active === f.key ? 'rgba(0,212,255,.08)' : 'transparent',
          color: active === f.key ? 'var(--accent)' : 'var(--text3)',
        }}>
          {f.label}
        </button>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────
export default function CompetitionsPage() {
  const [localComps,   setLocalComps]   = useState([])
  const [globalComps,  setGlobalComps]  = useState([])
  const [localLoading, setLocalLoading] = useState(true)
  const [globalLoading,setGlobalLoading]= useState(true)
  const [globalError,  setGlobalError]  = useState(false)
  const [localFilter,  setLocalFilter]  = useState('all')
  const [globalFilter, setGlobalFilter] = useState('all')
  const [joined,       setJoined]       = useState(new Set())

  useEffect(() => {
    getLocalCompetitions()
      .then(d => setLocalComps(d.items || []))
      .catch(() => {})
      .finally(() => setLocalLoading(false))

    getGlobalCompetitions()
      .then(d => setGlobalComps(d.items || []))
      .catch(() => setGlobalError(true))
      .finally(() => setGlobalLoading(false))
  }, [])

  // Filtered local
  const visibleLocal = localComps.filter(c => {
    if (localFilter === 'stara-zagora') return c.city === 'Stara Zagora' || c.region === 'Stara Zagora'
    if (localFilter === 'bulgaria')     return true
    return true
  })

  // Filtered global
  const visibleGlobal = globalComps.filter(c => {
    if (globalFilter === 'live')     return c.status === 'live'
    if (globalFilter === 'upcoming') return c.status === 'upcoming'
    return true
  })

  const handleJoin = id => setJoined(prev => new Set([...prev, id]))

  return (
    <div className="premium-bg" style={{ minHeight: '100vh', color: 'var(--text)', fontFamily: 'var(--sans)' }}>

      {/* ── Page title (static, scrolls away) ── */}
      <div style={{ padding: '36px 32px 28px', maxWidth: 1280, margin: '0 auto',
        borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)',
          letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>
          Competitions
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6, letterSpacing: '-.4px' }}>
          IT & Programming Competitions
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text2)', maxWidth: 560, lineHeight: 1.7, margin: 0 }}>
          Local events in Stara Zagora and Bulgaria, plus live international contests from Codeforces.
        </p>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{
        display: 'flex', flexDirection: 'row', gap: 0,
        maxWidth: 1280, margin: '0 auto',
        flexWrap: 'wrap',
      }}>

        {/* ══ LEFT: Local & Regional ══════════════════════════ */}
        <div style={{
          flex: '1 1 480px', padding: '28px 32px',
          borderRight: '1px solid var(--border)',
          minWidth: 0,
        }}>
          <SectionHeader
            icon="🇧🇬"
            title="Local & Regional"
            subtitle="Stara Zagora, Bulgaria — competitions near you"
            count={!localLoading ? localComps.length : null}
            accent={['#fbbf24', '#f59e0b']}
          />

          <FilterBar filters={LOCAL_FILTERS} active={localFilter} setActive={setLocalFilter} />

          {localLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(4)].map((_, i) => <SkelCard key={i} tall />)}
            </div>
          ) : visibleLocal.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🇧🇬</div>
              <p>No events in this category right now.</p>
              <button onClick={() => setLocalFilter('all')}
                style={{ marginTop: 10, padding: '6px 18px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>
                Show all
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {visibleLocal.map(comp => (
                <LocalCard
                  key={comp.id}
                  comp={comp}
                  onJoin={handleJoin}
                  joined={joined.has(comp.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ══ RIGHT: Global (Codeforces) ══════════════════════ */}
        <div style={{
          flex: '1 1 400px', padding: '28px 32px',
          minWidth: 0,
        }}>
          <SectionHeader
            icon="🌍"
            title="Global & International"
            subtitle="Live upcoming contests from Codeforces"
            count={!globalLoading ? visibleGlobal.length : null}
            accent={['#60a5fa', '#3b82f6']}
          />

          <FilterBar filters={GLOBAL_FILTERS} active={globalFilter} setActive={setGlobalFilter} />

          {globalLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(8)].map((_, i) => <SkelCard key={i} tall={false} />)}
            </div>
          ) : globalError ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🌐</div>
              <p style={{ marginBottom: 10 }}>Could not reach Codeforces API.</p>
              <p style={{ fontSize: 11, fontFamily: 'var(--mono)' }}>
                Check your internet connection or try again shortly.
              </p>
              <a href="https://codeforces.com/contests" target="_blank" rel="noopener noreferrer"
                style={{ marginTop: 14, display: 'inline-block', padding: '7px 18px', borderRadius: 8,
                  border: '1px solid var(--border2)', color: 'var(--accent)',
                  textDecoration: 'none', fontSize: 12, fontFamily: 'var(--mono)' }}>
                View on Codeforces ↗
              </a>
            </div>
          ) : visibleGlobal.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🌍</div>
              <p>No contests in this filter right now.</p>
              <button onClick={() => setGlobalFilter('all')}
                style={{ marginTop: 10, padding: '6px 18px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'transparent',
                  color: 'var(--text3)', cursor: 'pointer', fontSize: 12 }}>
                Show all
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visibleGlobal.map(comp => (
                  <GlobalCard key={comp.id} comp={comp} />
                ))}
              </div>
              <div style={{
                marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)',
                fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text3)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>Data from Codeforces API · refreshes every 15 min</span>
                <a href="https://codeforces.com/contests" target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  View all on CF ↗
                </a>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
