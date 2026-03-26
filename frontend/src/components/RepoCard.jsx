const LANG_COLORS = {
  Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6',
  Go: '#00ADD8', Rust: '#CE4221', Java: '#b07219', 'C++': '#f34b7d',
  C: '#555555', Ruby: '#CC342D', PHP: '#4F5D95', Swift: '#F05138',
  Kotlin: '#A97BFF', Scala: '#c22d40', Haskell: '#5e5086',
  Elixir: '#6e4a7e', Dart: '#00B4AB', 'C#': '#178600',
  Shell: '#89e051', HTML: '#e34c26', CSS: '#563d7c', Vue: '#41b883',
  Svelte: '#ff3e00', Unknown: '#8b9899',
}

function formatStars(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d}d ago`
  if (d < 365) return `${Math.floor(d/30)}mo ago`
  return `${Math.floor(d/365)}y ago`
}

export default function RepoCard({ repo, onClick }) {
  const langColor = LANG_COLORS[repo.language] || LANG_COLORS.Unknown

  return (
    <div
      onClick={() => onClick?.(repo)}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: '20px',
        cursor: 'pointer',
        transition: 'all .22s ease',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        animation: 'fadeIn .35s ease both',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)'
        e.currentTarget.style.transform = 'translateY(-3px)'
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,.4)'
        e.currentTarget.querySelector('.top-accent').style.opacity = '1'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.querySelector('.top-accent').style.opacity = '0'
      }}
    >
      {/* Top accent line */}
      <div
        className="top-accent"
        style={{
          position:'absolute', top:0, left:0, right:0, height:2,
          background:`linear-gradient(90deg,${langColor},var(--accent2))`,
          opacity:0, transition:'opacity .22s',
        }}
      />

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)', marginBottom:4 }}>
            {repo.owner}
          </div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--text)', lineHeight:1.25 }} className="truncate">
            {repo.repo}
          </div>
        </div>
        <span style={{
          fontSize:10, fontFamily:'var(--mono)', padding:'3px 9px',
          borderRadius:5, background:'var(--bg3)',
          border:'1px solid var(--border2)', color:'var(--text2)',
          flexShrink:0, whiteSpace:'nowrap',
        }}>
          {repo.language}
        </span>
      </div>

      {/* Description */}
      <p style={{
        fontSize:12, color:'var(--text2)', lineHeight:1.65,
        overflow:'hidden', display:'-webkit-box',
        WebkitLineClamp:2, WebkitBoxOrient:'vertical',
        flexGrow:1,
      }}>
        {repo.description || 'No description provided.'}
      </p>

      {/* Topics */}
      {repo.topics?.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {repo.topics.slice(0,4).map(t => (
            <span key={t} style={{
              fontSize:10, fontFamily:'var(--mono)', padding:'2px 8px',
              borderRadius:4, background:'rgba(0,212,255,.06)',
              color:'rgba(0,212,255,.7)', border:'1px solid rgba(0,212,255,.12)',
            }}>{t}</span>
          ))}
        </div>
      )}

      {/* Footer stats */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        paddingTop:12, borderTop:'1px solid var(--border)',
        fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)',
      }}>
        <div style={{ display:'flex', gap:16 }}>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ color:'var(--amber)' }}>★</span>
            {formatStars(repo.stars)}
          </span>
          <span style={{ display:'flex', alignItems:'center', gap:4 }}>
            <span>⑂</span> {formatStars(repo.forks)}
          </span>
        </div>
        <span style={{ display:'flex', alignItems:'center', gap:4 }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:langColor, display:'inline-block' }} />
          {timeAgo(repo.pushed_at)}
        </span>
      </div>
    </div>
  )
}
