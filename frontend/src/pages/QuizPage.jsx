import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getReadme, generateQuiz } from '../services/api.js'

const DIFF_COLORS = {
  easy:   { bg:'rgba(16,185,129,.08)',   border:'rgba(16,185,129,.2)',   color:'var(--accent3)' },
  medium: { bg:'rgba(245,158,11,.08)',   border:'rgba(245,158,11,.2)',   color:'var(--amber)' },
  hard:   { bg:'rgba(239,68,68,.08)',    border:'rgba(239,68,68,.2)',    color:'var(--red)' },
}

export default function QuizPage() {
  const { owner, repo } = useParams()
  const location        = useLocation()
  const navigate        = useNavigate()
  const stateRepo       = location.state?.repo
  const stateReadme     = location.state?.readme

  const [quiz,       setQuiz]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [phase,      setPhase]      = useState('quiz')   // 'quiz' | 'result'
  const [current,    setCurrent]    = useState(0)
  const [answers,    setAnswers]    = useState({})       // questionId -> chosenIdx
  const [revealed,   setRevealed]   = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      try {
        let readme = stateReadme
        if (!readme) {
          const rd = await getReadme(owner, repo)
          readme = rd.content
        }
        const data = await generateQuiz({
          owner, repo,
          readme: readme || '',
          description: stateRepo?.description || '',
          language:    stateRepo?.language || '',
          topics:      stateRepo?.topics || [],
        })
        setQuiz(data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to generate quiz.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [owner, repo])

  const questions   = quiz?.questions || []
  const q           = questions[current]
  const totalQ      = questions.length
  const chosen      = answers[current]
  const isAnswered  = chosen !== undefined

  const score = Object.entries(answers).reduce((acc, [idx, chosen]) => {
    const q = questions[parseInt(idx)]
    return acc + (q && chosen === q.correct ? 1 : 0)
  }, 0)

  const handleAnswer = (optIdx) => {
    if (isAnswered) return
    setAnswers(prev => ({ ...prev, [current]: optIdx }))
    setRevealed(true)
  }

  const handleNext = () => {
    if (current < totalQ - 1) {
      setCurrent(current + 1)
      setRevealed(false)
    } else {
      setPhase('result')
    }
  }

  const handleRetry = () => {
    setAnswers({})
    setCurrent(0)
    setRevealed(false)
    setPhase('quiz')
  }

  const pct = totalQ > 0 ? Math.round((current) / totalQ * 100) : 0

  /* ── Loading ── */
  if (loading) return <LoadingState />

  /* ── Error ── */
  if (error) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:48, textAlign:'center', gap:16 }}>
      <span style={{ fontSize:48 }}>⚠️</span>
      <h2 style={{ fontSize:22, color:'var(--text)' }}>Failed to generate quiz</h2>
      <p style={{ fontSize:14, color:'var(--text2)', maxWidth:500, lineHeight:1.7 }}>{error}</p>
    </div>
  )

  /* ── Result Screen ── */
  if (phase === 'result') {
    const pctScore = Math.round((score / totalQ) * 100)
    const grade = pctScore >= 90 ? { label:'Excellent!', color:'var(--accent3)', icon:'🏆' }
                : pctScore >= 70 ? { label:'Good job!',  color:'var(--amber)',   icon:'⭐' }
                : pctScore >= 50 ? { label:'Keep learning', color:'#a78bfa',   icon:'📚' }
                :                  { label:'Try again',   color:'var(--red)',    icon:'💪' }

    return (
      <div style={{
        minHeight:'calc(100vh - 56px)', display:'flex',
        alignItems:'center', justifyContent:'center',
        padding:'32px 24px', position:'relative', zIndex:1,
        animation:'fadeIn .4s ease',
      }}>
        <div style={{ width:'100%', maxWidth:680, textAlign:'center' }}>

          <div style={{ fontSize:80, marginBottom:16 }}>{grade.icon}</div>
          <h1 style={{ fontSize:48, fontWeight:800, color:grade.color, marginBottom:8 }}>
            {score}/{totalQ}
          </h1>
          <p style={{ fontSize:18, color:'var(--text2)', marginBottom:6 }}>
            {pctScore}% · {grade.label}
          </p>
          <p style={{ fontSize:13, fontFamily:'var(--mono)', color:'var(--text3)', marginBottom:40 }}>
            {owner}/{repo}
          </p>

          {/* Score bar */}
          <div style={{ height:8, background:'var(--bg3)', borderRadius:4, marginBottom:40, overflow:'hidden' }}>
            <div style={{
              height:'100%', width:`${pctScore}%`,
              background:`linear-gradient(90deg,${grade.color},var(--accent2))`,
              borderRadius:4, transition:'width .8s ease',
            }} />
          </div>

          {/* Per-question review */}
          <div style={{ textAlign:'left', marginBottom:36 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)', letterSpacing:'.5px', textTransform:'uppercase', marginBottom:16 }}>
              Review
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {questions.map((q, i) => {
                const chose   = answers[i]
                const correct = chose === q.correct
                return (
                  <div key={i} style={{
                    padding:'14px 18px', borderRadius:10,
                    background: correct ? 'rgba(16,185,129,.06)' : 'rgba(239,68,68,.06)',
                    border: `1px solid ${correct ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.18)'}`,
                    display:'flex', gap:12, alignItems:'flex-start',
                  }}>
                    <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>
                      {correct ? '✅' : '❌'}
                    </span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, color:'var(--text)', marginBottom:4, lineHeight:1.5 }}>{q.question}</p>
                      {!correct && (
                        <p style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--accent3)' }}>
                          ✓ {q.options[q.correct]}
                        </p>
                      )}
                      {q.explanation && (
                        <p style={{ fontSize:11.5, color:'var(--text3)', marginTop:4, lineHeight:1.6 }}>
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <button
              onClick={handleRetry}
              style={{
                padding:'13px 32px', borderRadius:10,
                border:'1px solid rgba(255,255,255,.1)',
                background:'transparent', color:'var(--text)',
                fontFamily:'var(--sans)', fontSize:14, fontWeight:600,
                cursor:'pointer', transition:'all .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(255,255,255,.25)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,.1)'}
            >↺ Retry Quiz</button>
            <button
              onClick={() => navigate(`/learn/${owner}/${repo}`, { state: location.state })}
              style={{
                padding:'13px 32px', borderRadius:10,
                border:'1px solid rgba(0,212,255,.3)',
                background:'rgba(0,212,255,.08)', color:'var(--accent)',
                fontFamily:'var(--sans)', fontSize:14, fontWeight:600,
                cursor:'pointer', transition:'all .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(0,212,255,.14)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(0,212,255,.08)'}
            >📚 Review Lesson</button>
            <button
              onClick={() => navigate(`/practice/${owner}/${repo}`, { state: location.state })}
              style={{
                padding:'13px 32px', borderRadius:10,
                border:'none',
                background:'linear-gradient(135deg,var(--accent3),#059669)',
                color:'#fff', fontFamily:'var(--sans)',
                fontSize:14, fontWeight:700, cursor:'pointer',
                transition:'all .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.filter='brightness(1.1)'}
              onMouseLeave={e => e.currentTarget.style.filter=''}
            >💻 Practice Now</button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Quiz Question ── */
  const diff    = DIFF_COLORS[q?.difficulty] || DIFF_COLORS.medium
  const correct = q?.correct

  return (
    <div className="premium-bg" style={{
      minHeight:'calc(100vh - 56px)',
      display:'flex', alignItems:'flex-start', justifyContent:'center',
      padding:'40px 24px 80px',
      position:'relative', zIndex:1,
    }}>
      <div style={{ width:'100%', maxWidth:680 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
          <div>
            <div style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)', letterSpacing:'1px', textTransform:'uppercase', marginBottom:4 }}>
              {owner}/{repo}
            </div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)' }}>
              {quiz?.title || 'Quiz'}
            </h1>
          </div>
          <div style={{
            fontSize:11, fontFamily:'var(--mono)',
            color:'var(--text2)', background:'var(--bg3)',
            border:'1px solid var(--border)',
            padding:'6px 14px', borderRadius:20,
          }}>
            {current + 1} / {totalQ}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom:28 }}>
          <div style={{ height:4, background:'var(--bg3)', borderRadius:2, overflow:'hidden' }}>
            <div style={{
              height:'100%',
              width:`${((current) / totalQ) * 100}%`,
              background:'linear-gradient(90deg,var(--accent),var(--accent2))',
              borderRadius:2, transition:'width .4s ease',
            }} />
          </div>
          <div style={{ display:'flex', gap:5, marginTop:8 }}>
            {questions.map((_, i) => {
              const a = answers[i]
              const ok = a !== undefined && questions[i] && a === questions[i].correct
              return (
                <div key={i} style={{
                  flex:1, height:3, borderRadius:2,
                  background: a === undefined ? 'var(--bg3)' : ok ? 'var(--accent3)' : 'var(--red)',
                  transition:'background .3s',
                }} />
              )
            })}
          </div>
        </div>

        {/* Difficulty badge */}
        <div style={{ marginBottom:16, display:'flex', gap:8, alignItems:'center' }}>
          <span style={{
            fontSize:10, fontFamily:'var(--mono)', padding:'3px 10px',
            borderRadius:12, background:diff.bg, border:`1px solid ${diff.border}`,
            color:diff.color, textTransform:'uppercase', letterSpacing:'.5px',
          }}>
            {q?.difficulty || 'medium'}
          </span>
          <span style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)' }}>
            Question {current + 1}
          </span>
        </div>

        {/* Question card */}
        <div style={{
          background:'var(--bg2)', border:'1px solid var(--border2)',
          borderRadius:16, padding:'28px 32px',
          marginBottom:20,
          boxShadow:'0 8px 32px rgba(0,0,0,.3)',
          animation:'fadeIn .3s ease',
        }}>
          <p style={{ fontSize:18, fontWeight:700, color:'var(--text)', lineHeight:1.6, marginBottom:0 }}>
            {q?.question}
          </p>
        </div>

        {/* Options */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:24 }}>
          {(q?.options || []).map((opt, idx) => {
            const isChosen  = chosen === idx
            const isCorrect = idx === correct
            let bg = 'var(--bg2)', border = 'var(--border2)', color = 'var(--text2)'
            if (isAnswered) {
              if (isCorrect) { bg='rgba(16,185,129,.1)'; border='rgba(16,185,129,.35)'; color='var(--accent3)' }
              else if (isChosen && !isCorrect) { bg='rgba(239,68,68,.08)'; border='rgba(239,68,68,.3)'; color='var(--red)' }
            } else if (isChosen) {
              bg='rgba(0,212,255,.1)'; border='rgba(0,212,255,.35)'; color='var(--accent)'
            }

            return (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                disabled={isAnswered}
                style={{
                  width:'100%', padding:'16px 20px',
                  background:bg, border:`1px solid ${border}`,
                  borderRadius:11, color, fontFamily:'var(--sans)',
                  fontSize:14, cursor: isAnswered ? 'default' : 'pointer',
                  textAlign:'left', transition:'all .18s',
                  display:'flex', alignItems:'center', gap:14,
                  fontWeight: isAnswered && isCorrect ? 600 : 400,
                  lineHeight:1.5,
                }}
                onMouseEnter={e => { if(!isAnswered && !isChosen) e.currentTarget.style.borderColor='rgba(255,255,255,.18)' }}
                onMouseLeave={e => { if(!isAnswered && !isChosen) e.currentTarget.style.borderColor='var(--border2)' }}
              >
                <span style={{
                  width:28, height:28, borderRadius:8,
                  background: isAnswered && isCorrect ? 'rgba(16,185,129,.2)' : isAnswered && isChosen && !isCorrect ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.05)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:11, fontFamily:'var(--mono)', flexShrink:0,
                  color: isAnswered && isCorrect ? 'var(--accent3)' : isAnswered && isChosen && !isCorrect ? 'var(--red)' : 'var(--text3)',
                  fontWeight:700,
                }}>
                  {isAnswered && isCorrect ? '✓' : isAnswered && isChosen && !isCorrect ? '✗' : String.fromCharCode(65+idx)}
                </span>
                {opt}
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {isAnswered && q?.explanation && (
          <div style={{
            padding:'16px 20px',
            background:'rgba(255,255,255,.03)',
            border:'1px solid var(--border)',
            borderLeft:`3px solid ${chosen===correct?'var(--accent3)':'var(--red)'}`,
            borderRadius:'0 10px 10px 0',
            marginBottom:24,
            animation:'fadeIn .25s ease',
          }}>
            <p style={{ fontSize:13, fontFamily:'var(--mono)', color: chosen===correct ? 'var(--accent3)' : 'var(--red)', fontWeight:600, marginBottom:6 }}>
              {chosen===correct ? '✓ Correct!' : '✗ Incorrect'}
            </p>
            <p style={{ fontSize:13.5, color:'var(--text2)', lineHeight:1.75 }}>
              {q.explanation}
            </p>
          </div>
        )}

        {/* Next button */}
        {isAnswered && (
          <div style={{ display:'flex', justifyContent:'flex-end', animation:'fadeIn .2s ease' }}>
            <button
              onClick={handleNext}
              style={{
                padding:'12px 32px', borderRadius:10,
                border:'none',
                background: current===totalQ-1
                  ? 'linear-gradient(135deg,var(--accent),var(--accent2))'
                  : 'rgba(0,212,255,.1)',
                border: current===totalQ-1 ? 'none' : '1px solid rgba(0,212,255,.3)',
                color: current===totalQ-1 ? '#fff' : 'var(--accent)',
                fontFamily:'var(--sans)', fontSize:14, fontWeight:700,
                cursor:'pointer', transition:'all .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.filter='brightness(1.1)'}
              onMouseLeave={e => e.currentTarget.style.filter=''}
            >
              {current === totalQ - 1 ? 'See Results →' : 'Next Question →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{
      minHeight:'calc(100vh - 56px)', display:'flex',
      alignItems:'center', justifyContent:'center',
      flexDirection:'column', gap:20,
    }}>
      <div style={{
        width:48, height:48, border:'3px solid var(--accent)',
        borderTopColor:'transparent', borderRadius:'50%',
        animation:'spin .7s linear infinite',
      }} />
      <p style={{ fontSize:14, color:'var(--text2)', fontFamily:'var(--mono)' }}>
        Generating quiz questions…
      </p>
      <p style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--mono)' }}>
        AI is analyzing the repository
      </p>
    </div>
  )
}
