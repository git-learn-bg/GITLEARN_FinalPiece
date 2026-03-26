import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getReadme, generatePractice } from '../services/api.js'

const DIFF = {
  easy:   { label:'Easy',   color:'var(--accent3)', bg:'rgba(16,185,129,.08)',  border:'rgba(16,185,129,.2)' },
  medium: { label:'Medium', color:'var(--amber)',   bg:'rgba(245,158,11,.08)',  border:'rgba(245,158,11,.2)' },
  hard:   { label:'Hard',   color:'var(--red)',     bg:'rgba(239,68,68,.08)',   border:'rgba(239,68,68,.2)' },
}

function CodeBlock({ code, lang = 'plaintext' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!ref.current || !code) return
    ref.current.removeAttribute('data-highlighted')
    ref.current.textContent = code
    try { window.hljs?.highlightElement(ref.current) } catch {}
  }, [code, lang])
  return (
    <pre style={{
      margin:0, background:'var(--bg)',
      border:'1px solid var(--border)',
      borderRadius:9, overflow:'auto',
      padding:'16px 20px',
    }}>
      <code
        ref={ref}
        className={`language-${lang}`}
        style={{ fontFamily:'var(--mono)', fontSize:12.5, lineHeight:1.75 }}
      />
    </pre>
  )
}

function ExerciseCard({ ex, idx, lang, isExpanded, onToggle }) {
  const [showSolution, setShowSolution] = useState(false)
  const [userCode,     setUserCode]     = useState('')
  const [done,         setDone]         = useState(false)
  const diff = DIFF[ex.difficulty] || DIFF.medium

  return (
    <div
      id={`ex-${idx}`}
      style={{
        background:'var(--bg2)',
        border:`1px solid ${isExpanded ? 'rgba(255,255,255,.1)' : 'var(--border)'}`,
        borderRadius:16, overflow:'hidden',
        transition:'border-color .2s',
        marginBottom:16,
        boxShadow: isExpanded ? '0 8px 32px rgba(0,0,0,.3)' : 'none',
      }}
    >
      {/* Card header — always visible */}
      <div
        onClick={onToggle}
        style={{
          padding:'18px 24px',
          display:'flex', alignItems:'center', gap:14,
          cursor:'pointer',
          background: isExpanded ? 'rgba(255,255,255,.02)' : 'transparent',
          transition:'background .15s',
          userSelect:'none',
        }}
        onMouseEnter={e => { if(!isExpanded) e.currentTarget.style.background='rgba(255,255,255,.02)' }}
        onMouseLeave={e => { if(!isExpanded) e.currentTarget.style.background='transparent' }}
      >
        {/* Number */}
        <div style={{
          width:36, height:36, borderRadius:10,
          background: done ? 'rgba(16,185,129,.15)' : 'var(--bg3)',
          border:`1px solid ${done?'rgba(16,185,129,.3)':'var(--border)'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--mono)', fontSize:13, fontWeight:700,
          color: done ? 'var(--accent3)' : 'var(--text2)',
          flexShrink:0, transition:'all .2s',
        }}>
          {done ? '✓' : idx + 1}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
            <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text)', lineHeight:1.2 }}>
              {ex.title}
            </h3>
            <span style={{
              fontSize:10, fontFamily:'var(--mono)', padding:'2px 9px',
              borderRadius:12, background:diff.bg, border:`1px solid ${diff.border}`,
              color:diff.color, textTransform:'uppercase', letterSpacing:'.4px',
            }}>
              {diff.label}
            </span>
            <span style={{
              fontSize:10, fontFamily:'var(--mono)', color:'var(--text3)',
              background:'var(--bg3)', border:'1px solid var(--border)',
              padding:'2px 8px', borderRadius:12,
            }}>
              ⏱ {ex.estimated_time}
            </span>
          </div>
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5, margin:0 }} className="truncate">
            {ex.description}
          </p>
        </div>

        <span style={{
          fontSize:18, color:'var(--text3)',
          transform: isExpanded ? 'rotate(90deg)' : 'none',
          transition:'transform .2s', flexShrink:0,
        }}>
          ›
        </span>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div style={{ borderTop:'1px solid var(--border)', animation:'fadeIn .2s ease' }}>

          {/* Description + Task */}
          <div style={{ padding:'24px 28px', borderBottom:'1px solid var(--border)' }}>
            <SectionLabel icon="📋" label="Description" />
            <p style={{ fontSize:14.5, color:'var(--text2)', lineHeight:1.85, marginBottom:20 }}>
              {ex.description}
            </p>

            <SectionLabel icon="🎯" label="Your Task" />
            <div style={{
              padding:'14px 18px',
              background:'rgba(0,212,255,.05)', border:'1px solid rgba(0,212,255,.15)',
              borderLeft:'3px solid var(--accent)', borderRadius:'0 9px 9px 0',
              marginBottom:20,
            }}>
              <p style={{ fontSize:14.5, color:'var(--text)', lineHeight:1.8 }}>
                {ex.task}
              </p>
            </div>

            <SectionLabel icon="✅" label="Expected Output" />
            <CodeBlock code={ex.expected_output} lang={lang} />
          </div>

          {/* Hints */}
          {ex.hints?.length > 0 && (
            <div style={{ padding:'20px 28px', borderBottom:'1px solid var(--border)' }}>
              <SectionLabel icon="💡" label="Hints" />
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {ex.hints.map((h, i) => (
                  <div key={i} style={{
                    display:'flex', gap:10, alignItems:'flex-start',
                    padding:'10px 14px',
                    background:'rgba(245,158,11,.05)', border:'1px solid rgba(245,158,11,.15)',
                    borderRadius:8,
                  }}>
                    <span style={{ color:'var(--amber)', flexShrink:0, fontSize:13 }}>→</span>
                    <span style={{ fontSize:13.5, color:'var(--text2)', lineHeight:1.65 }}>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code editor (textarea) */}
          <div style={{ padding:'20px 28px', borderBottom:'1px solid var(--border)' }}>
            <SectionLabel icon="✏️" label="Your Solution" />
            <textarea
              value={userCode}
              onChange={e => setUserCode(e.target.value)}
              placeholder={`// Write your ${lang} solution here...\n`}
              style={{
                width:'100%', minHeight:160,
                background:'var(--bg)', border:'1px solid var(--border)',
                borderRadius:9, padding:'14px 18px',
                color:'var(--text)', fontFamily:'var(--mono)',
                fontSize:13, lineHeight:1.7, resize:'vertical',
                outline:'none', transition:'border-color .2s',
              }}
              onFocus={e => e.target.style.borderColor='rgba(0,212,255,.35)'}
              onBlur={e  => e.target.style.borderColor='var(--border)'}
            />
            <div style={{ display:'flex', gap:10, marginTop:10 }}>
              <button
                onClick={() => setDone(true)}
                style={{
                  padding:'9px 22px', borderRadius:8,
                  border:'none',
                  background:'linear-gradient(135deg,var(--accent3),#059669)',
                  color:'#fff', fontFamily:'var(--sans)', fontSize:13,
                  fontWeight:700, cursor:'pointer', transition:'all .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.filter='brightness(1.1)'}
                onMouseLeave={e => e.currentTarget.style.filter=''}
              >
                ✓ Mark Complete
              </button>
              <button
                onClick={() => setShowSolution(s => !s)}
                style={{
                  padding:'9px 22px', borderRadius:8,
                  border:'1px solid rgba(124,58,237,.3)',
                  background:'rgba(124,58,237,.07)', color:'#a78bfa',
                  fontFamily:'var(--sans)', fontSize:13,
                  fontWeight:600, cursor:'pointer', transition:'all .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(124,58,237,.14)'}
                onMouseLeave={e => e.currentTarget.style.background='rgba(124,58,237,.07)'}
              >
                {showSolution ? '🙈 Hide Solution' : '👁 Show Solution'}
              </button>
            </div>
            {done && (
              <div style={{
                marginTop:10, padding:'10px 14px',
                background:'rgba(16,185,129,.07)',
                border:'1px solid rgba(16,185,129,.2)',
                borderRadius:8, fontSize:13, color:'var(--accent3)',
                display:'flex', gap:8, alignItems:'center',
                animation:'fadeIn .2s ease',
              }}>
                <span>🎉</span>
                <span>Exercise marked as complete!</span>
              </div>
            )}
          </div>

          {/* Solution */}
          {showSolution && (
            <div style={{ padding:'20px 28px', animation:'fadeIn .25s ease' }}>
              <SectionLabel icon="🔓" label="Solution" />
              <CodeBlock code={ex.solution} lang={lang} />
              {ex.explanation && (
                <div style={{
                  marginTop:16, padding:'14px 18px',
                  background:'rgba(255,255,255,.03)', border:'1px solid var(--border)',
                  borderRadius:9,
                }}>
                  <p style={{ fontSize:13, fontFamily:'var(--mono)', color:'var(--accent)', fontWeight:600, marginBottom:6 }}>
                    Why this works:
                  </p>
                  <p style={{ fontSize:13.5, color:'var(--text2)', lineHeight:1.75 }}>
                    {ex.explanation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SectionLabel({ icon, label }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:7, marginBottom:10,
      fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)',
      letterSpacing:'1px', textTransform:'uppercase',
    }}>
      <span>{icon}</span> {label}
    </div>
  )
}

export default function PracticePage() {
  const { owner, repo } = useParams()
  const location        = useLocation()
  const navigate        = useNavigate()
  const stateRepo       = location.state?.repo
  const stateReadme     = location.state?.readme

  const [exercises, setExercises] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [expanded,  setExpanded]  = useState(0)        // only one open at a time
  const [filter,    setFilter]    = useState('all')    // 'all' | 'easy' | 'medium' | 'hard'

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      try {
        let readme = stateReadme
        if (!readme) {
          const rd = await getReadme(owner, repo)
          readme = rd.content
        }
        const data = await generatePractice({
          owner, repo,
          readme: readme || '',
          description: stateRepo?.description || '',
          language:    stateRepo?.language || '',
          topics:      stateRepo?.topics || [],
        })
        setExercises(data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to generate exercises.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [owner, repo])

  const lang   = stateRepo?.language?.toLowerCase() || 'plaintext'
  const exList = exercises?.exercises || []
  const shown  = filter === 'all' ? exList : exList.filter(e => e.difficulty === filter)

  if (loading) return (
    <div style={{
      minHeight:'calc(100vh - 56px)', display:'flex',
      alignItems:'center', justifyContent:'center',
      flexDirection:'column', gap:20,
    }}>
      <div style={{ width:48, height:48, border:'3px solid var(--accent3)', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <p style={{ fontSize:14, color:'var(--text2)', fontFamily:'var(--mono)' }}>Generating exercises…</p>
      <p style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--mono)' }}>AI is crafting coding challenges</p>
    </div>
  )

  if (error) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:48, textAlign:'center', gap:16 }}>
      <span style={{ fontSize:48 }}>⚠️</span>
      <h2 style={{ fontSize:22, color:'var(--text)' }}>Failed to generate exercises</h2>
      <p style={{ fontSize:14, color:'var(--text2)', maxWidth:500, lineHeight:1.7 }}>{error}</p>
    </div>
  )

  const counts = exList.reduce((acc, e) => { acc[e.difficulty] = (acc[e.difficulty]||0)+1; return acc }, {})

  return (
    <div className="premium-bg" style={{ position:'relative', zIndex:1 }}>

      {/* ── Page header ── */}
      <div style={{
        background:'linear-gradient(180deg,rgba(16,185,129,.06) 0%,rgba(7,9,19,.95))',
        borderBottom:'1px solid var(--border)',
        padding:'36px 40px 28px',
        position:'sticky', top:'var(--header-height)', zIndex:100,
        backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)',
      }}>
        <div style={{ maxWidth:860, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--accent3)', letterSpacing:'1.2px', textTransform:'uppercase', marginBottom:8 }}>
            💻 Practice Exercises
          </div>
          <h1 style={{ fontSize:30, fontWeight:800, letterSpacing:'-.4px', color:'var(--text)', marginBottom:6 }}>
            {exercises?.title || `Practice: ${repo}`}
          </h1>
          <p style={{ fontSize:14, color:'var(--text2)' }}>
            {owner}/{repo} · {exList.length} exercises · varying difficulty
          </p>

          {/* Difficulty filter */}
          <div style={{ display:'flex', gap:8, marginTop:20, flexWrap:'wrap' }}>
            {['all', 'easy', 'medium', 'hard'].map(f => {
              const d   = DIFF[f] || { label:'All', color:'var(--text2)', bg:'transparent', border:'var(--border)' }
              const cnt = f === 'all' ? exList.length : (counts[f] || 0)
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding:'7px 18px', borderRadius:20,
                    border:`1px solid ${filter===f ? d.border : 'var(--border)'}`,
                    background: filter===f ? d.bg : 'transparent',
                    color: filter===f ? d.color : 'var(--text2)',
                    fontFamily:'var(--mono)', fontSize:11,
                    cursor:'pointer', transition:'all .15s',
                    textTransform:'capitalize',
                  }}
                >
                  {f === 'all' ? 'All' : d.label} ({cnt})
                </button>
              )
            })}

            {/* Nav shortcuts */}
            <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
              <button
                onClick={() => navigate(`/learn/${owner}/${repo}`, { state: location.state })}
                style={{
                  padding:'7px 16px', borderRadius:20,
                  border:'1px solid rgba(0,212,255,.2)',
                  background:'rgba(0,212,255,.05)', color:'var(--accent)',
                  fontFamily:'var(--mono)', fontSize:11, cursor:'pointer',
                }}
              >📚 Lesson</button>
              <button
                onClick={() => navigate(`/quiz/${owner}/${repo}`, { state: location.state })}
                style={{
                  padding:'7px 16px', borderRadius:20,
                  border:'1px solid rgba(124,58,237,.2)',
                  background:'rgba(124,58,237,.05)', color:'#a78bfa',
                  fontFamily:'var(--mono)', fontSize:11, cursor:'pointer',
                }}
              >📝 Quiz</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Exercise list ── */}
      <div style={{ maxWidth:860, margin:'0 auto', padding:'32px 40px 80px' }}>
        {shown.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--text3)', fontFamily:'var(--mono)' }}>
            No {filter} exercises found.
          </div>
        ) : (
          shown.map((ex, i) => {
            const realIdx = exList.indexOf(ex)
            return (
              <ExerciseCard
                key={ex.id || i}
                ex={ex}
                idx={realIdx}
                lang={lang}
                isExpanded={expanded === realIdx}
                onToggle={() => setExpanded(expanded === realIdx ? -1 : realIdx)}
              />
            )
          })
        )}

        {/* Completion CTA */}
        {shown.length > 0 && (
          <div style={{
            marginTop:36, padding:'28px 32px', textAlign:'center',
            background:'var(--bg2)', border:'1px solid var(--border)',
            borderRadius:16,
          }}>
            <p style={{ fontSize:18, fontWeight:700, color:'var(--text)', marginBottom:8 }}>
              🎉 Finished all exercises?
            </p>
            <p style={{ fontSize:14, color:'var(--text2)', marginBottom:20 }}>
              Head back to test your knowledge or explore a new repo.
            </p>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <button
                onClick={() => navigate(`/quiz/${owner}/${repo}`, { state: location.state })}
                style={{
                  padding:'11px 28px', borderRadius:10,
                  border:'1px solid rgba(124,58,237,.3)',
                  background:'rgba(124,58,237,.08)', color:'#a78bfa',
                  fontFamily:'var(--sans)', fontSize:13, fontWeight:700,
                  cursor:'pointer',
                }}
              >📝 Take Quiz</button>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding:'11px 28px', borderRadius:10,
                  border:'none',
                  background:'linear-gradient(135deg,var(--accent),var(--accent2))',
                  color:'#fff', fontFamily:'var(--sans)', fontSize:13,
                  fontWeight:700, cursor:'pointer',
                }}
              >🔍 Explore More Repos</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
