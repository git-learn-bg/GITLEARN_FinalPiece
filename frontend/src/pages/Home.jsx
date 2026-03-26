import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import RepoCard from '../components/RepoCard.jsx'
import CompetitionCard from '../components/CompetitionCard.jsx'
import PreviewModal from '../components/PreviewModal.jsx'
import SiteHeader from '../components/SiteHeader.jsx'
import { searchRepos, suggestSearch, getCompetitionStats } from '../services/api.js'

// ── Language filter pills ───────────────────────────────
const LANG_PILLS = [
  { label: 'All',        value: '' },
  { label: 'Python',     value: 'Python',     dot: '#3572A5' },
  { label: 'JavaScript', value: 'JavaScript', dot: '#f1e05a' },
  { label: 'TypeScript', value: 'TypeScript', dot: '#3178c6' },
  { label: 'Go',         value: 'Go',         dot: '#00ADD8' },
  { label: 'Rust',       value: 'Rust',       dot: '#CE4221' },
]

// ── Autocomplete dropdown ────────────────────────────────
function SuggestionDropdown({ suggestions, onSelect, visible }) {
  if (!visible || !suggestions.length) return null
  const repos = suggestions.filter(s => s.type === 'repo')
  const news  = suggestions.filter(s => s.type === 'news')
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
      background: 'rgba(10,11,30,.97)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,.12)', borderRadius: 14,
      overflow: 'hidden', zIndex: 999,
      boxShadow: '0 20px 60px rgba(0,0,0,.6)',
    }}>
      {repos.length > 0 && <>
        <div style={{ fontSize: 9, fontFamily: 'var(--mono)', letterSpacing: '1.5px',
          textTransform: 'uppercase', color: 'rgba(255,255,255,.3)',
          padding: '8px 16px 4px', background: 'rgba(0,0,0,.3)' }}>📦 Repositories</div>
        {repos.map((s, i) => (
          <div key={'r'+i} onMouseDown={() => onSelect(s)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px',
              cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,.04)',
              transition:'background .1s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.05)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <span style={{ color:'rgba(255,255,255,.4)', fontSize:12 }}>⑂</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#dde2f0' }} className="truncate">{s.label}</div>
              {s.sublabel && <div style={{ fontSize:11, color:'rgba(255,255,255,.35)' }} className="truncate">{s.sublabel}</div>}
            </div>
            <span style={{ fontSize:10, fontFamily:'var(--mono)', color:'rgba(255,255,255,.3)', flexShrink:0 }}>
              ★ {s.stars >= 1000 ? (s.stars/1000).toFixed(1)+'k' : s.stars}
            </span>
          </div>
        ))}
      </>}
      {news.length > 0 && <>
        <div style={{ fontSize:9, fontFamily:'var(--mono)', letterSpacing:'1.5px',
          textTransform:'uppercase', color:'rgba(255,255,255,.3)',
          padding:'8px 16px 4px', background:'rgba(0,0,0,.3)',
          borderTop:'1px solid rgba(255,255,255,.05)' }}>📰 News</div>
        {news.map((s, i) => (
          <div key={'n'+i} onMouseDown={() => onSelect(s)}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 16px',
              cursor:'pointer', transition:'background .1s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.05)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <span style={{ fontSize:12 }}>📰</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, color:'#dde2f0' }} className="truncate">{s.label}</div>
              <div style={{ fontSize:10, fontFamily:'var(--mono)', color:'#00d4ff', marginTop:2 }}>{s.source}</div>
            </div>
          </div>
        ))}
      </>}
    </div>
  )
}

// ── Competition stats mini strip ─────────────────────────
function StatBadge({ value, label, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 16px' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>{label}</div>
    </div>
  )
}

// ── Repo skeleton card ────────────────────────────────────
function RepoSkeleton() {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: 20, height: 180 }}>
      <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 10 }}/>
      <div className="skeleton" style={{ height: 10, width: '90%', marginBottom: 8 }}/>
      <div className="skeleton" style={{ height: 10, width: '75%', marginBottom: 20 }}/>
      <div className="skeleton" style={{ height: 8, width: '40%' }}/>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()

  const [query,        setQuery]        = useState('')
  const [lang,         setLang]         = useState('')
  const [suggestions,  setSuggestions]  = useState([])
  const [showDrop,     setShowDrop]     = useState(false)
  const [trendingRepos,setTrendingRepos]= useState([])
  const [trendLoading, setTrendLoading] = useState(true)
  const [compStats,    setCompStats]    = useState(null)
  const [compLoading,  setCompLoading]  = useState(true)
  const [selectedRepo, setSelectedRepo] = useState(null)

  const wrapRef = useRef(null)
  const debRef  = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Load trending repos (top starred public repos)
  useEffect(() => {
    searchRepos('stars:>10000', '', 1)
      .then(d => setTrendingRepos((d.items || []).slice(0, 4)))
      .catch(() => {})
      .finally(() => setTrendLoading(false))
  }, [])

  // Load competition stats for home preview
  useEffect(() => {
    getCompetitionStats()
      .then(d => setCompStats(d))
      .catch(() => {})
      .finally(() => setCompLoading(false))
  }, [])

  const handleInput = e => {
    const v = e.target.value
    setQuery(v)
    clearTimeout(debRef.current)
    if (v.trim().length < 2) { setSuggestions([]); setShowDrop(false); return }
    debRef.current = setTimeout(async () => {
      try {
        const d = await suggestSearch(v)
        setSuggestions(d.suggestions || [])
        setShowDrop(true)
      } catch { setSuggestions([]) }
    }, 280)
  }

  const doSearch = () => {
    if (!query.trim()) return
    const p = new URLSearchParams({ q: query.trim(), filter: 'repos' })
    if (lang) p.set('lang', lang)
    navigate(`/library?${p}`)
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter') { setShowDrop(false); doSearch() }
    if (e.key === 'Escape') setShowDrop(false)
  }

  const handleSuggestionSelect = item => {
    setShowDrop(false)
    if (item.type === 'repo') {
      navigate(`/library?q=${encodeURIComponent(item.label)}&filter=repos`)
    } else {
      const id = btoa(encodeURIComponent(item.url)).replace(/=/g, '')
      try { localStorage.setItem(`news_${id}`, JSON.stringify({ title: item.label, url: item.url, source: item.source, image: item.image, summary: '' })) } catch {}
      navigate(`/news/${id}`)
    }
  }

  const handleLangPill = v => {
    setLang(v)
    if (query.trim()) {
      const p = new URLSearchParams({ q: query.trim(), filter: 'repos' })
      if (v) p.set('lang', v)
      navigate(`/library?${p}`)
    }
  }

  return (
    <div className="min-h-screen text-white premium-bg"
      style={{ fontFamily: "'Inter', 'Outfit', sans-serif" }}>
      <SiteHeader />

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="relative w-full py-28 overflow-hidden z-10">
        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto">
          <p className="text-blue-400 text-sm font-bold tracking-[0.3em] uppercase mb-6 opacity-80">
            AI-Powered Engineering Intelligence
          </p>
          <h1 className="text-6xl md:text-7xl font-black mb-8 tracking-tight leading-[1.1]">
            Learn from real <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              GitHub source
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mb-12 leading-relaxed font-light">
            Search any repository. Preview the logic. Let AI generate a full course, quiz, and
            practice exercises — from the actual source code.
          </p>

          {/* Search bar */}
          <div ref={wrapRef} className="w-full max-w-2xl relative group">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-blue-500 group-focus-within:text-blue-400 transition-colors"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"/>
              </svg>
            </div>
            <input
              value={query} onChange={handleInput} onKeyDown={handleKeyDown}
              onFocus={() => { if (suggestions.length) setShowDrop(true) }}
              placeholder="Search GitHub repos, competitions, news…"
              className="w-full rounded-2xl py-6 pl-16 pr-32 text-white text-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none shadow-2xl transition-all placeholder-gray-500 bg-white/5 backdrop-blur-xl border border-white/10"
            />
            <button onClick={doSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white px-7 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20">
              Analyze
            </button>
            <SuggestionDropdown suggestions={suggestions} onSelect={handleSuggestionSelect} visible={showDrop} />
          </div>

          {/* Language pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {LANG_PILLS.map(pill => (
              <button key={pill.value} onClick={() => handleLangPill(pill.value)}
                className={`px-6 py-2.5 rounded-full text-sm font-semibold glass-card border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2.5 ${lang === pill.value ? 'ring-2 ring-white/20' : ''}`}
                style={{ color: pill.dot ? undefined : '#fff' }}>
                {pill.dot && <span style={{ width:9, height:9, borderRadius:'50%', background:pill.dot, display:'inline-block' }}/>}
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main grid ──────────────────────────────────── */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px 80px' }} className="relative z-10">
        <div className="flex flex-col lg:flex-row gap-14">

          {/* ── LEFT: Competition Stats + Preview ─── */}
          <aside style={{ flex: '0 0 58%' }}>
            {/* Section heading */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:28, fontWeight:800, display:'flex', alignItems:'center', gap:12, margin:0 }}>
                <span style={{ width:4, height:38, borderRadius:2,
                  background:'linear-gradient(180deg,#60a5fa,#3b82f6)', display:'inline-block' }}/>
                Competition Preview
              </h2>
              <span onClick={() => navigate('/competitions')}
                style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)',
                  textTransform:'uppercase', letterSpacing:'2px', cursor:'pointer',
                  transition:'color .15s' }}
                onMouseEnter={e => e.target.style.color='var(--accent)'}
                onMouseLeave={e => e.target.style.color='var(--text3)'}>
                Global Ranking →
              </span>
            </div>

            {/* Glass card */}
            <div className="glass-card" style={{ borderRadius: 28, padding: 32 }}>

              {/* Stats bar */}
              {compStats && (
                <div style={{
                  display: 'flex', gap: 0, marginBottom: 24, paddingBottom: 24,
                  borderBottom: '1px solid rgba(255,255,255,.07)',
                }}>
                  <StatBadge
                    value={compStats.total_participants >= 1000
                      ? (compStats.total_participants/1000).toFixed(1)+'k'
                      : compStats.total_participants}
                    label="Total Participants"
                    color="var(--accent)"
                  />
                  <div style={{ width:1, background:'rgba(255,255,255,.07)', margin:'0 4px' }}/>
                  <StatBadge value={compStats.live_count}  label="Live / Ongoing" color="#34d399" />
                  <div style={{ width:1, background:'rgba(255,255,255,.07)', margin:'0 4px' }}/>
                  <StatBadge value={compStats.open_count}  label="Open to Register" color="#fbbf24" />
                </div>
              )}

              {/* Competition rows */}
              {compLoading ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 0' }}>
                  <div style={{ width:28, height:28, border:'2px solid var(--accent)',
                    borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                </div>
              ) : compStats?.preview?.length > 0 ? (
                <div>
                  {compStats.preview.map(comp => (
                    <CompetitionCard
                      key={comp.id}
                      comp={comp}
                      compact={true}
                      onClick={() => navigate('/competitions')}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ color:'var(--text3)', fontSize:13, textAlign:'center', padding:'24px 0' }}>
                  No competitions data available
                </div>
              )}

              {/* View All button */}
              <button
                onClick={() => navigate('/competitions')}
                style={{
                  marginTop: 24, width: '100%', padding: '14px 0',
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
                  borderRadius: 12, color: 'var(--text2)', fontWeight: 700,
                  fontSize: 12, fontFamily: 'var(--mono)', letterSpacing: '2px',
                  textTransform: 'uppercase', cursor: 'pointer', transition: 'all .2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(0,212,255,.08)'; e.currentTarget.style.borderColor='rgba(0,212,255,.25)'; e.currentTarget.style.color='var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.04)'; e.currentTarget.style.borderColor='rgba(255,255,255,.1)'; e.currentTarget.style.color='var(--text2)' }}
              >
                View All Global Competitions
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"/>
                </svg>
              </button>
            </div>
          </aside>

          {/* ── RIGHT: Trending Repos ─────────────────── */}
          <section style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ fontSize:28, fontWeight:800, display:'flex', alignItems:'center', gap:12, margin:0 }}>
                <span style={{ width:4, height:38, borderRadius:2,
                  background:'linear-gradient(180deg,#a78bfa,#7c3aed)', display:'inline-block' }}/>
                Trending
              </h2>
              <span onClick={() => navigate('/library')}
                style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--accent)',
                  letterSpacing:'2px', textTransform:'uppercase', cursor:'pointer',
                  transition:'color .15s' }}
                onMouseEnter={e => e.target.style.color='var(--text)'}
                onMouseLeave={e => e.target.style.color='var(--accent)'}>
                See Feed →
              </span>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {trendLoading
                ? [...Array(4)].map((_, i) => <RepoSkeleton key={i} />)
                : trendingRepos.map(repo => (
                    <RepoCard
                      key={repo.id}
                      repo={repo}
                      onClick={setSelectedRepo}
                    />
                  ))
              }
            </div>
          </section>

        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-white/10 py-14 px-8 glass-header relative z-10">
        <div style={{ maxWidth:1400, margin:'0 auto', display:'flex', flexWrap:'wrap',
          justifyContent:'space-between', alignItems:'center', gap:24 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.2)',
                borderRadius:6, width:26, height:26, display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:10, fontWeight:700 }}>GL</div>
              <span style={{ fontSize:18, fontWeight:800, opacity:.6 }}>GitLearn</span>
            </div>
            <p style={{ fontSize:11, color:'rgba(255,255,255,.3)', margin:0 }}>
              © 2024 GitLearn AI Platforms Inc. All technical assets protected.
            </p>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'16px 40px' }}>
            {['Security','Privacy Policy','Terms of Service','API Docs','Network Status'].map(l => (
              <a key={l} href="#" style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,.35)',
                textTransform:'uppercase', letterSpacing:'1px', textDecoration:'none',
                transition:'color .15s' }}
                onMouseEnter={e => e.target.style.color='var(--accent)'}
                onMouseLeave={e => e.target.style.color='rgba(255,255,255,.35)'}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {selectedRepo && <PreviewModal repo={selectedRepo} onClose={() => setSelectedRepo(null)} />}
    </div>
  )
}
