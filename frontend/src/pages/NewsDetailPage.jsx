import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { summarizeNews } from '../services/api.js'

const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420"><rect fill="%230d1018" width="800" height="420"/><text x="400" y="220" font-size="72" text-anchor="middle" fill="%233d4460">📰</text></svg>'

function _titleSeed(title) {
  return encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40))
}

function SmartImage({ src, title, style }) {
  const [tries, setTries] = useState(0)
  const srcs = [
    src,
    `https://picsum.photos/seed/${_titleSeed(title)}/800/420`,
    PLACEHOLDER_IMG,
  ].filter(Boolean)
  const current = tries < srcs.length ? srcs[tries] : PLACEHOLDER_IMG
  return (
    <img src={current} alt="" onError={() => setTries(t => t + 1)} style={style} />
  )
}

const SECTION_ICONS = {
  'What Happened':  '⚡',
  'Why It Matters': '💡',
  'Key Facts':      '📋',
  'Conclusion':     '✅',
}

function Tag({ label }) {
  return (
    <span style={{
      display:'inline-block',padding:'4px 10px',borderRadius:20,
      background:'rgba(0,212,255,.08)',border:'1px solid rgba(0,212,255,.18)',
      fontSize:11,fontFamily:'var(--mono)',color:'var(--accent)',
    }}>
      {label}
    </span>
  )
}

function SectionCard({ section }) {
  const icon = SECTION_ICONS[section.heading] || '•'
  return (
    <div style={{
      background:'var(--card)',border:'1px solid var(--border)',
      borderRadius:12,padding:'18px 20px',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
        <span style={{fontSize:16}}>{icon}</span>
        <span style={{fontSize:12,fontWeight:700,color:'var(--text)',fontFamily:'var(--mono)',letterSpacing:'.5px',textTransform:'uppercase'}}>
          {section.heading}
        </span>
      </div>
      <p style={{fontSize:14,color:'var(--text2)',lineHeight:1.7,margin:0}}>
        {section.text}
      </p>
    </div>
  )
}

export default function NewsDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [article,  setArticle]  = useState(null)
  const [summary,  setSummary]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [aiLoading,setAiLoading]= useState(false)
  const [error,    setError]    = useState(null)

  // Decode article from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`news_${id}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        setArticle(parsed)
      } else {
        setError('Article not found. Please go back and click from search results.')
      }
    } catch {
      setError('Failed to load article data.')
    } finally {
      setLoading(false)
    }
  }, [id])

  // Fetch AI summary once article is loaded
  useEffect(() => {
    if (!article) return
    const cacheKey = `news_summary_${id}`
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      try { setSummary(JSON.parse(cached)); return } catch {}
    }
    setAiLoading(true)
    summarizeNews({
      title:   article.title,
      summary: article.summary || '',
      url:     article.url,
      source:  article.source,
    })
      .then(data => {
        setSummary(data)
        try { sessionStorage.setItem(cacheKey, JSON.stringify(data)) } catch {}
      })
      .catch(() => setSummary(null))
      .finally(() => setAiLoading(false))
  }, [article, id])

  if (loading) {
    return (
      <div className="premium-bg" style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
          <div style={{width:36,height:36,border:'2px solid var(--accent)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto 16px'}}/>
          <p style={{color:'var(--text3)',fontFamily:'var(--mono)',fontSize:13}}>Loading…</p>
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="premium-bg" style={{minHeight:'100vh'}}>
      <div style={{maxWidth:600,margin:'80px auto',padding:'0 24px',textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>📰</div>
        <p style={{color:'var(--text2)',fontSize:15,marginBottom:24}}>{error || 'Article not found.'}</p>
        <button
          onClick={() => navigate(-1)}
          style={{padding:'10px 28px',borderRadius:10,border:'1px solid var(--border2)',background:'transparent',color:'var(--text)',fontFamily:'var(--sans)',fontSize:14,cursor:'pointer'}}
        >← Go Back</button>
      </div>
      </div>
    )
  }

  return (
    <div className="premium-bg" style={{ minHeight: '100vh' }}>
    <div style={{maxWidth:800,margin:'0 auto',padding:'40px 24px 80px'}}>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{display:'flex',alignItems:'center',gap:6,padding:'8px 0',background:'none',border:'none',color:'var(--text3)',fontFamily:'var(--mono)',fontSize:12,cursor:'pointer',marginBottom:32,transition:'color .15s'}}
        onMouseEnter={e=>e.currentTarget.style.color='var(--accent)'}
        onMouseLeave={e=>e.currentTarget.style.color='var(--text3)'}
      >
        ← Back to search
      </button>

      {/* Source badge */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
        <span style={{fontSize:10,fontFamily:'var(--mono)',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--accent)',padding:'4px 10px',borderRadius:6,border:'1px solid rgba(0,212,255,.25)',background:'rgba(0,212,255,.06)'}}>
          {article.source}
        </span>
        {article.pubDate && (
          <span style={{fontSize:11,color:'var(--text3)',fontFamily:'var(--mono)'}}>
            {article.pubDate.slice(0, 16)}
          </span>
        )}
      </div>

      {/* Title */}
      <h1 style={{fontSize:26,fontWeight:800,lineHeight:1.3,color:'var(--text)',marginBottom:24,letterSpacing:'-.3px'}}>
        {article.title}
      </h1>

      {/* Hero image */}
      <div style={{borderRadius:14,overflow:'hidden',marginBottom:32,border:'1px solid var(--border)'}}>
        <SmartImage
          src={article.image}
          title={article.title}
          style={{width:'100%',maxHeight:380,objectFit:'cover',display:'block'}}
        />
      </div>

      {/* AI Summary */}
      {aiLoading && (
        <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,padding:'24px',marginBottom:28,display:'flex',alignItems:'center',gap:14}}>
          <div style={{width:22,height:22,border:'2px solid var(--accent)',borderTopColor:'transparent',borderRadius:'50%',animation:'spin .7s linear infinite',flexShrink:0}}/>
          <span style={{fontSize:13,color:'var(--text3)',fontFamily:'var(--mono)'}}>Generating summary…</span>
        </div>
      )}

      {summary && !aiLoading && (
        <div style={{marginBottom:32}}>
          {/* Overview */}
          <div style={{background:'rgba(0,212,255,.04)',border:'1px solid rgba(0,212,255,.15)',borderRadius:14,padding:'20px 24px',marginBottom:20}}>
            <div style={{fontSize:10,fontFamily:'var(--mono)',letterSpacing:'1.5px',textTransform:'uppercase',color:'var(--accent)',marginBottom:10}}>
              ✦ Overview
            </div>
            <p style={{fontSize:15,color:'var(--text)',lineHeight:1.75,margin:0}}>
              {summary.overview}
            </p>
          </div>

          {/* Sections grid */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:14,marginBottom:20}}>
            {summary.sections?.map((s, i) => (
              <SectionCard key={i} section={s} />
            ))}
          </div>

          {/* Tags */}
          {summary.tags?.length > 0 && (
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {summary.tags.map((t, i) => <Tag key={i} label={t} />)}
            </div>
          )}
        </div>
      )}

      {/* Original link button */}
      <div style={{borderTop:'1px solid var(--border)',paddingTop:24,display:'flex',alignItems:'center',gap:12}}>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display:'inline-flex',alignItems:'center',gap:8,
            padding:'12px 28px',borderRadius:10,
            background:'var(--accent)',color:'#000',
            fontFamily:'var(--sans)',fontSize:14,fontWeight:700,
            textDecoration:'none',transition:'opacity .15s',
          }}
          onMouseEnter={e=>e.currentTarget.style.opacity='.85'}
          onMouseLeave={e=>e.currentTarget.style.opacity='1'}
        >
          Read original on {article.source} ↗
        </a>
        <span style={{fontSize:12,color:'var(--text3)',fontFamily:'var(--mono)'}}>
          Opens in new tab
        </span>
      </div>

    </div>
    </div>
  )
}
