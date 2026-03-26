// CompetitionCard.jsx
// Reusable competition display component.
// compact={true}  → slim row for Home page left column
// compact={false} → full card for CompetitionsPage grid

const STATUS = {
  live:     { label: 'Live Now',          dot: '#34d399', text: '#34d399', bg: 'rgba(52,211,153,.10)', border: 'rgba(52,211,153,.22)' },
  ongoing:  { label: 'Ongoing',           dot: '#22d3ee', text: '#22d3ee', bg: 'rgba(34,211,238,.10)', border: 'rgba(34,211,238,.22)' },
  open:     { label: 'Registration Open', dot: '#fbbf24', text: '#fbbf24', bg: 'rgba(251,191,36,.10)', border: 'rgba(251,191,36,.22)' },
  upcoming: { label: 'Upcoming',          dot: '#60a5fa', text: '#60a5fa', bg: 'rgba(96,165,250,.10)', border: 'rgba(96,165,250,.22)' },
}
const MEDAL = ['#ffd700', '#c0c0c0', '#cd7f32']

function fmt(n) {
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)
}

function GradientBox({ from, to, size = 48, radius = 12 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: `linear-gradient(135deg, ${from || '#6366f1'}, ${to || '#7c3aed'})`,
      boxShadow: `0 4px 16px ${from || '#6366f1'}44`,
    }} />
  )
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

function Leaderboard({ entries }) {
  if (!entries?.length) return null
  return (
    <div style={{
      background: 'var(--bg3)', borderRadius: 10, padding: '10px 14px',
      border: '1px solid var(--border)',
    }}>
      <div style={{
        fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: 8,
      }}>
        🏆 Top Participants
      </div>
      {entries.slice(0, 3).map((p, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 0',
          borderBottom: i < entries.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none',
        }}>
          <span style={{ width: 20, fontWeight: 700, fontSize: 11, color: MEDAL[i], fontFamily: 'var(--mono)' }}>
            #{p.rank}
          </span>
          <span style={{ flex: 1, color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 11 }}>
            {p.username}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {p.country}
          </span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--amber)', fontWeight: 700, fontSize: 12 }}>
            {p.score.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Compact row (Home page) ──────────────────────────────────────────────────
function CompactCard({ comp, onClick }) {
  const s = STATUS[comp.status] || STATUS.upcoming
  const sub = comp.status === 'live' || comp.status === 'ongoing'
    ? `${s.label} · ${fmt(comp.participants)} active`
    : `${s.label} · ${fmt(comp.participants)} joined`

  return (
    <div
      onClick={() => onClick?.(comp)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '13px 0',
        borderBottom: '1px solid rgba(255,255,255,.055)',
        cursor: 'pointer',
        transition: 'opacity .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.opacity = '.75'}
      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
    >
      <GradientBox from={comp.gradient_from} to={comp.gradient_to} size={44} radius={11} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {comp.title}
        </div>
        <div style={{ fontSize: 11, color: s.text }}>{sub}</div>
      </div>

      {comp.leaderboard?.[0] && (
        <div style={{
          textAlign: 'right', flexShrink: 0,
          fontSize: 10, fontFamily: 'var(--mono)', lineHeight: 1.5,
        }}>
          <div style={{ color: 'var(--text3)' }}>🥇 {comp.leaderboard[0].username}</div>
          <div style={{ color: 'var(--amber)', fontWeight: 700 }}>{comp.leaderboard[0].score}</div>
        </div>
      )}
    </div>
  )
}

// ── Full card (CompetitionsPage) ─────────────────────────────────────────────
function FullCard({ comp, onClick }) {
  const ctaLabel = comp.status === 'open'
    ? 'Register Free'
    : comp.status === 'live' || comp.status === 'ongoing'
    ? 'Join Now'
    : 'View Details'

  return (
    <div
      onClick={() => onClick?.(comp)}
      style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 24, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 16,
        transition: 'all .2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,.13)'
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 14px 44px rgba(0,0,0,.45)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <GradientBox from={comp.gradient_from} to={comp.gradient_to} size={60} radius={14} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 6 }}>
            <StatusBadge status={comp.status} />
            {comp.starts_in && comp.status === 'upcoming' && (
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text3)' }}>
                · starts in {comp.starts_in}
              </span>
            )}
          </div>
          <h3 style={{
            fontSize: 16, fontWeight: 700, color: 'var(--text)',
            marginBottom: 6, lineHeight: 1.3,
          }}>
            {comp.title}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65, margin: 0 }}>
            {comp.description}
          </p>
        </div>
      </div>

      {/* Tags */}
      {comp.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {comp.tags.map(t => (
            <span key={t} style={{
              fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 8px',
              borderRadius: 4, background: 'rgba(0,212,255,.06)',
              color: 'rgba(0,212,255,.75)', border: '1px solid rgba(0,212,255,.13)',
            }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      <Leaderboard entries={comp.leaderboard} />

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingTop: 12, borderTop: '1px solid var(--border)',
        fontSize: 11, fontFamily: 'var(--mono)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ color: 'var(--text3)' }}>
            👥 {fmt(comp.participants)} {comp.status === 'live' || comp.status === 'ongoing' ? 'active' : 'joined'}
          </span>
          {comp.prize && (
            <span style={{ color: 'var(--amber)' }}>🏆 {comp.prize}</span>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClick?.(comp) }}
          style={{
            padding: '8px 20px', borderRadius: 9, border: 'none',
            background: comp.status === 'live' || comp.status === 'open'
              ? 'var(--accent)' : 'rgba(255,255,255,.08)',
            color: comp.status === 'live' || comp.status === 'open' ? '#000' : 'var(--text2)',
            fontWeight: 700, fontSize: 12, fontFamily: 'var(--sans)',
            cursor: 'pointer', transition: 'opacity .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '.82'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}

// ── Export ───────────────────────────────────────────────────────────────────
export default function CompetitionCard({ comp, compact = false, onClick }) {
  return compact
    ? <CompactCard comp={comp} onClick={onClick} />
    : <FullCard    comp={comp} onClick={onClick} />
}
