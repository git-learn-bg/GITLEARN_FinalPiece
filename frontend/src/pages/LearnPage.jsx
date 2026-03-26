import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getReadme, generateLearn } from '../services/api.js'

/* ── Tiny inline syntax highlighter (uses hljs already loaded) ── */
function CodeBlock({ code, language = 'plaintext', caption }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current) return
    ref.current.removeAttribute('data-highlighted')
    ref.current.textContent = code
    try { window.hljs?.highlightElement(ref.current) } catch {}
  }, [code, language])

  return (
    <div style={{ margin:'20px 0' }}>
      {caption && (
        <div style={{
          padding:'6px 16px', background:'var(--bg3)',
          borderRadius:'8px 8px 0 0',
          borderBottom:'1px solid var(--border)',
          fontSize:11, fontFamily:'var(--mono)',
          color:'var(--text3)', display:'flex', alignItems:'center', gap:6,
        }}>
          <span>📄</span> {caption}
        </div>
      )}
      <pre style={{
        margin:0, background:'var(--bg)',
        border:'1px solid var(--border)',
        borderRadius: caption ? '0 0 8px 8px' : 8,
        overflow:'auto',
        borderTop: caption ? 'none' : undefined,
      }}>
        <code
          ref={ref}
          className={`language-${language}`}
          style={{ fontFamily:'var(--mono)', fontSize:12.5, lineHeight:1.75 }}
        />
      </pre>
    </div>
  )
}

/* ── Content block renderer ── */
function ContentBlock({ block }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p style={{
          fontSize:15.5, lineHeight:1.95, color:'var(--text2)',
          marginBottom:18, letterSpacing:'.01em',
        }}>
          {block.text}
        </p>
      )
    case 'code':
      return <CodeBlock code={block.code} language={block.language} caption={block.caption} />
    case 'list':
      return (
        <div style={{ margin:'18px 0' }}>
          {block.heading && (
            <p style={{ fontSize:13, fontWeight:700, fontFamily:'var(--mono)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.5px', color:'var(--accent)' }}>
              {block.heading}
            </p>
          )}
          <ul style={{ listStyle:'none', padding:0 }}>
            {(block.items || []).map((item, i) => (
              <li key={i} style={{
                display:'flex', gap:12, alignItems:'flex-start',
                padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.04)',
                fontSize:14.5, lineHeight:1.7, color:'var(--text2)',
              }}>
                <span style={{
                  width:6, height:6, borderRadius:'50%',
                  background:'var(--accent)', flexShrink:0, marginTop:9,
                }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )
    case 'callout':
      const CALLOUT = {
        info:    { bg:'rgba(0,212,255,.06)',    border:'rgba(0,212,255,.2)',    icon:'ℹ️',  color:'var(--accent)' },
        warning: { bg:'rgba(245,158,11,.06)',   border:'rgba(245,158,11,.2)',   icon:'⚠️',  color:'var(--amber)' },
        tip:     { bg:'rgba(16,185,129,.06)',   border:'rgba(16,185,129,.2)',   icon:'💡',  color:'var(--accent3)' },
      }
      const c = CALLOUT[block.variant] || CALLOUT.info
      return (
        <div style={{
          margin:'20px 0', padding:'16px 20px',
          background:c.bg, border:`1px solid ${c.border}`,
          borderLeft:`3px solid ${c.color}`,
          borderRadius:'0 10px 10px 0',
          display:'flex', gap:12, alignItems:'flex-start',
        }}>
          <span style={{ fontSize:18, flexShrink:0 }}>{c.icon}</span>
          <p style={{ fontSize:14, lineHeight:1.75, color:'var(--text2)', margin:0 }}>{block.text}</p>
        </div>
      )
    default:
      return null
  }
}

/* ── Progress bar ── */
function ProgressBar({ current, total }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div style={{
        flex:1, height:4, background:'var(--bg3)',
        borderRadius:2, overflow:'hidden',
      }}>
        <div style={{
          height:'100%', width:`${pct}%`,
          background:'linear-gradient(90deg,var(--accent),var(--accent2))',
          borderRadius:2, transition:'width .4s ease',
        }} />
      </div>
      <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)', flexShrink:0 }}>
        {pct}%
      </span>
    </div>
  )
}

/* ── Skeleton loader for the course ── */
function CourseSkeleton() {
  return (
    <div style={{ padding:'40px 0' }}>
      {[...Array(4)].map((_,i) => (
        <div key={i} style={{ marginBottom:28 }}>
          <div className="skeleton" style={{ height:24, width:'55%', marginBottom:14 }} />
          <div className="skeleton" style={{ height:14, width:'90%', marginBottom:8 }} />
          <div className="skeleton" style={{ height:14, width:'80%', marginBottom:8 }} />
          <div className="skeleton" style={{ height:14, width:'70%', marginBottom:24 }} />
          <div className="skeleton" style={{ height:100, width:'100%' }} />
        </div>
      ))}
    </div>
  )
}

export default function LearnPage() {
  const { owner, repo }    = useParams()
  const location           = useLocation()
  const navigate           = useNavigate()
  const stateRepo          = location.state?.repo
  const stateReadme        = location.state?.readme

  const [course,     setCourse]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [activeIdx,  setActiveIdx]  = useState(0)
  const [completed,  setCompleted]  = useState(new Set())
  const contentRef               = useRef(null)

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      try {
        let readme = stateReadme
        if (!readme) {
          const rd = await getReadme(owner, repo)
          readme = rd.content
        }
        const payload = {
          owner, repo,
          readme: readme || '',
          description: stateRepo?.description || '',
          language:    stateRepo?.language || '',
          topics:      stateRepo?.topics || [],
        }
        const data = await generateLearn(payload)
        setCourse(data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to generate course. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [owner, repo])

  const sections   = course?.sections || []
  const activeSection = sections[activeIdx]

  const goNext = () => {
    setCompleted(prev => new Set([...prev, activeIdx]))
    if (activeIdx < sections.length - 1) {
      setActiveIdx(activeIdx + 1)
      contentRef.current?.scrollTo({ top:0, behavior:'smooth' })
    }
  }
  const goPrev = () => {
    if (activeIdx > 0) {
      setActiveIdx(activeIdx - 1)
      contentRef.current?.scrollTo({ top:0, behavior:'smooth' })
    }
  }

  const ICON_BG = 'rgba(0,212,255,.08)'

  return (
    <div className="premium-bg" style={{ display:'flex', height:'calc(100vh - 56px)', overflow:'hidden', position:'relative', zIndex:1 }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside style={{
        width: 280, flexShrink:0,
        borderRight:'1px solid var(--border)',
        background:'rgba(8,10,15,.8)',
        display:'flex', flexDirection:'column',
        overflow:'hidden',
      }}>
        {/* Course meta */}
        <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
          <div style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--accent)', letterSpacing:'1.2px', textTransform:'uppercase', marginBottom:8 }}>
            Course
          </div>
          {loading ? (
            <>
              <div className="skeleton" style={{ height:18, width:'80%', marginBottom:8 }} />
              <div className="skeleton" style={{ height:12, width:'60%' }} />
            </>
          ) : course ? (
            <>
              <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', lineHeight:1.3, marginBottom:6 }}>
                {course.title}
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:10 }}>
                <span style={{ fontSize:10, fontFamily:'var(--mono)', padding:'2px 8px', borderRadius:4, background:'var(--bg3)', color:'var(--text3)' }}>
                  {course.difficulty}
                </span>
                <span style={{ fontSize:10, fontFamily:'var(--mono)', padding:'2px 8px', borderRadius:4, background:'var(--bg3)', color:'var(--text3)' }}>
                  ⏱ {course.estimated_time}
                </span>
              </div>
              <ProgressBar current={completed.size} total={sections.length} />
              <div style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--text3)', marginTop:6 }}>
                {completed.size}/{sections.length} sections complete
              </div>
            </>
          ) : null}
        </div>

        {/* Section list */}
        <div style={{ overflowY:'auto', flex:1, padding:'8px 0' }}>
          {loading ? (
            <div style={{ padding:16 }}>
              {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height:40, marginBottom:8, borderRadius:8 }} />)}
            </div>
          ) : sections.map((sec, i) => {
            const isActive    = i === activeIdx
            const isDone      = completed.has(i)
            return (
              <button
                key={sec.id || i}
                onClick={() => { setActiveIdx(i); contentRef.current?.scrollTo({top:0,behavior:'smooth'}) }}
                style={{
                  width:'100%', padding:'12px 16px',
                  background: isActive ? 'rgba(0,212,255,.08)' : 'transparent',
                  border:'none',
                  borderLeft:`3px solid ${isActive?'var(--accent)':'transparent'}`,
                  cursor:'pointer', textAlign:'left',
                  transition:'all .15s',
                  display:'flex', alignItems:'center', gap:10,
                }}
                onMouseEnter={e => { if(!isActive) e.currentTarget.style.background='rgba(255,255,255,.03)' }}
                onMouseLeave={e => { if(!isActive) e.currentTarget.style.background='transparent' }}
              >
                <span style={{ fontSize:18, flexShrink:0 }}>{sec.icon || '📖'}</span>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{
                    fontSize:12, fontWeight:600,
                    color: isActive ? 'var(--accent)' : isDone ? 'var(--accent3)' : 'var(--text2)',
                    lineHeight:1.3, marginBottom:2,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                  }}>
                    {sec.title}
                  </div>
                  <div style={{ fontSize:10, fontFamily:'var(--mono)', color:'var(--text3)' }}>
                    Section {i + 1}
                  </div>
                </div>
                {isDone && <span style={{ fontSize:12, color:'var(--accent3)', flexShrink:0 }}>✓</span>}
                {isActive && !isDone && <span style={{ fontSize:10, color:'var(--accent)', flexShrink:0 }}>●</span>}
              </button>
            )
          })}
        </div>

        {/* Bottom actions */}
        <div style={{ padding:'16px 20px', borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:8, flexShrink:0 }}>
          <button
            onClick={() => navigate(`/quiz/${owner}/${repo}`, { state: location.state })}
            style={{
              width:'100%', padding:'10px 0', borderRadius:9,
              border:'1px solid rgba(124,58,237,.25)',
              background:'rgba(124,58,237,.07)', color:'#a78bfa',
              fontFamily:'var(--sans)', fontSize:12, fontWeight:600,
              cursor:'pointer', transition:'all .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(124,58,237,.14)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(124,58,237,.07)'}
          >📝 Take Quiz</button>
          <button
            onClick={() => navigate(`/practice/${owner}/${repo}`, { state: location.state })}
            style={{
              width:'100%', padding:'10px 0', borderRadius:9,
              border:'1px solid rgba(16,185,129,.25)',
              background:'rgba(16,185,129,.07)', color:'var(--accent3)',
              fontFamily:'var(--sans)', fontSize:12, fontWeight:600,
              cursor:'pointer', transition:'all .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(16,185,129,.14)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(16,185,129,.07)'}
          >💻 Practice</button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main ref={contentRef} style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }}>
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <div style={{ maxWidth:820, margin:'0 auto', width:'100%', padding:'40px 48px' }}>
            <CourseSkeleton />
          </div>
        ) : activeSection ? (
          <>
            {/* Section header */}
            <div style={{
              padding:'36px 48px 28px',
              maxWidth:820, width:'100%', margin:'0 auto',
              flexShrink:0,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)', letterSpacing:'1px', textTransform:'uppercase' }}>
                  Section {activeIdx + 1} of {sections.length}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'flex-start', gap:16, marginBottom:8 }}>
                <div style={{
                  width:52, height:52, borderRadius:14,
                  background:ICON_BG, flexShrink:0,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:26, border:'1px solid rgba(0,212,255,.15)',
                }}>
                  {activeSection.icon || '📖'}
                </div>
                <div>
                  <h1 style={{
                    fontSize:30, fontWeight:800, letterSpacing:'-.5px',
                    color:'var(--text)', lineHeight:1.15, marginBottom:6,
                  }}>
                    {activeSection.title}
                  </h1>
                  <div style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text3)' }}>
                    {owner}/{repo} · {course?.difficulty}
                  </div>
                </div>
              </div>

              <div style={{
                height:1, background:'linear-gradient(90deg,var(--accent) 0%,transparent 60%)',
                opacity:.2, marginTop:24,
              }} />
            </div>

            {/* Section body */}
            <div style={{
              maxWidth:820, width:'100%', margin:'0 auto',
              padding:'0 48px 60px', flex:1,
            }}>
              {(activeSection.content || []).map((block, i) => (
                <ContentBlock key={i} block={block} />
              ))}

              {/* Key takeaways on last section */}
              {activeIdx === sections.length - 1 && course?.key_takeaways?.length > 0 && (
                <div style={{
                  marginTop:36, padding:'24px 28px',
                  background:'rgba(0,212,255,.05)',
                  border:'1px solid rgba(0,212,255,.18)',
                  borderRadius:14,
                }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'var(--accent)', fontFamily:'var(--mono)', letterSpacing:'.5px', textTransform:'uppercase', marginBottom:16 }}>
                    ✦ Key Takeaways
                  </h3>
                  {course.key_takeaways.map((t,i) => (
                    <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:10 }}>
                      <span style={{ color:'var(--accent)', fontSize:12, marginTop:3 }}>→</span>
                      <span style={{ fontSize:14.5, color:'var(--text2)', lineHeight:1.7 }}>{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Navigation bar ── */}
            <div style={{
              borderTop:'1px solid var(--border)',
              padding:'20px 48px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              flexShrink:0,
              background:'rgba(8,10,15,.7)', backdropFilter:'blur(10px)',
              maxWidth:820, width:'100%', margin:'0 auto',
              position:'sticky', bottom:0,
            }}>
              <button
                onClick={goPrev}
                disabled={activeIdx === 0}
                style={{
                  padding:'12px 28px', borderRadius:10,
                  border:'1px solid var(--border)',
                  background:'transparent',
                  color: activeIdx===0 ? 'var(--text3)' : 'var(--text)',
                  fontFamily:'var(--sans)', fontSize:14, fontWeight:600,
                  cursor: activeIdx===0 ? 'default' : 'pointer',
                  transition:'all .15s', display:'flex', gap:8, alignItems:'center',
                  opacity: activeIdx===0 ? .4 : 1,
                }}
              >
                ← Previous
              </button>

              {/* Progress dots */}
              <div style={{ display:'flex', gap:6 }}>
                {sections.map((_,i) => (
                  <div
                    key={i}
                    onClick={() => { setActiveIdx(i); contentRef.current?.scrollTo({top:0,behavior:'smooth'}) }}
                    style={{
                      width: i===activeIdx ? 20 : 7,
                      height:7, borderRadius:4,
                      background: i===activeIdx ? 'var(--accent)' : completed.has(i) ? 'var(--accent3)' : 'var(--bg3)',
                      cursor:'pointer', transition:'all .3s',
                    }}
                  />
                ))}
              </div>

              {activeIdx === sections.length - 1 ? (
                <button
                  onClick={() => navigate(`/quiz/${owner}/${repo}`, { state: location.state })}
                  style={{
                    padding:'12px 28px', borderRadius:10,
                    border:'none',
                    background:'linear-gradient(135deg,var(--accent),var(--accent2))',
                    color:'#fff', fontFamily:'var(--sans)',
                    fontSize:14, fontWeight:700, cursor:'pointer',
                    transition:'all .15s',
                    boxShadow:'0 4px 20px rgba(0,212,255,.25)',
                    display:'flex', gap:8, alignItems:'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.filter='brightness(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.filter=''}
                >
                  Take Quiz →
                </button>
              ) : (
                <button
                  onClick={goNext}
                  style={{
                    padding:'12px 28px', borderRadius:10,
                    border:'1px solid rgba(0,212,255,.3)',
                    background:'rgba(0,212,255,.08)',
                    color:'var(--accent)',
                    fontFamily:'var(--sans)', fontSize:14, fontWeight:700,
                    cursor:'pointer', transition:'all .15s',
                    display:'flex', gap:8, alignItems:'center',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(0,212,255,.14)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(0,212,255,.08)'}
                >
                  Next →
                </button>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div style={{
      flex:1, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center',
      padding:48, textAlign:'center', gap:16,
    }}>
      <span style={{ fontSize:48 }}>⚠️</span>
      <h2 style={{ fontSize:22, color:'var(--text)' }}>Failed to generate course</h2>
      <p style={{ fontSize:14, color:'var(--text2)', maxWidth:500, lineHeight:1.7 }}>{message}</p>
    </div>
  )
}
