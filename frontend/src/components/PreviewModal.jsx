import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import FileTree from './FileTree.jsx'
import CodeViewer from './CodeViewer.jsx'
import { getFileTree, getFileContent, getReadme } from '../services/api.js'

const SIDEBAR_W = 240

export default function PreviewModal({ repo, onClose }) {
  const navigate = useNavigate()

  const [tree,        setTree]        = useState([])
  const [treeLoading, setTreeLoading] = useState(true)
  const [selectedPath, setSelectedPath] = useState(null)
  const [fileContent,  setFileContent]  = useState('')
  const [fileLanguage, setFileLanguage] = useState('plaintext')
  const [fileLoading,  setFileLoading]  = useState(false)
  const [activeView,   setActiveView]   = useState('code') // 'code' | 'readme'
  const [readme,       setReadme]       = useState('')
  const [readmeLoading,setReadmeLoading]= useState(true)

  // Load file tree
  useEffect(() => {
    if (!repo) return
    setTreeLoading(true)
    getFileTree(repo.owner, repo.repo)
      .then(d => setTree(d.tree || []))
      .catch(() => setTree([]))
      .finally(() => setTreeLoading(false))

    setReadmeLoading(true)
    getReadme(repo.owner, repo.repo)
      .then(d => setReadme(d.content || ''))
      .catch(() => setReadme(''))
      .finally(() => setReadmeLoading(false))
  }, [repo])

  const handleFileSelect = useCallback(async (path) => {
    setSelectedPath(path)
    setActiveView('code')
    setFileLoading(true)
    try {
      const data = await getFileContent(repo.owner, repo.repo, path)
      setFileContent(data.content)
      setFileLanguage(data.language)
    } catch {
      setFileContent('// Error loading file')
      setFileLanguage('plaintext')
    } finally {
      setFileLoading(false)
    }
  }, [repo])

  const goTo = (mode) => {
    onClose()
    navigate(`/${mode}/${repo.owner}/${repo.repo}`, {
      state: { repo, readme }
    })
  }

  if (!repo) return null

  return (
    /* Backdrop */
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.82)',
        backdropFilter: 'blur(12px)',
        zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn .18s ease',
      }}
    >
      {/* Modal box */}
      <div style={{
        width: '100%', maxWidth: 1280, height: '88vh',
        background: 'var(--bg2)',
        border: '1px solid var(--border2)',
        borderRadius: 18,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeIn .22s ease',
        boxShadow: '0 32px 80px rgba(0,0,0,.7)',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          background: 'rgba(8,10,15,.5)',
        }}>
          {/* Window dots */}
          <div style={{ display:'flex', gap:6 }}>
            <div onClick={onClose} style={{ width:12, height:12, borderRadius:'50%', background:'#ff5f57', cursor:'pointer', transition:'filter .15s' }} onMouseEnter={e=>e.target.style.filter='brightness(1.2)'} onMouseLeave={e=>e.target.style.filter=''} />
            <div style={{ width:12, height:12, borderRadius:'50%', background:'#ffbd2e' }} />
            <div style={{ width:12, height:12, borderRadius:'50%', background:'#28c840' }} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--text)', fontWeight:600 }}>
              {repo.owner}/{repo.repo}
            </span>
            <span style={{ marginLeft:10, fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)' }}>
              {repo.language} · ⭐ {(repo.stars/1000).toFixed(1)}k
            </span>
          </div>
          {/* File tabs */}
          <div style={{ display:'flex', gap:0 }}>
            {['code','readme'].map(v => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                style={{
                  padding:'6px 16px', background:'transparent',
                  border:'none', borderBottom: `2px solid ${activeView===v?'var(--accent)':'transparent'}`,
                  color: activeView===v ? 'var(--accent)' : 'var(--text3)',
                  fontFamily:'var(--mono)', fontSize:11, cursor:'pointer',
                  transition:'all .15s', textTransform:'uppercase', letterSpacing:'.5px',
                }}
              >
                {v === 'code' ? '📄 Code' : '📖 README'}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            style={{
              width:28, height:28, borderRadius:7,
              background:'rgba(255,255,255,.06)',
              border:'1px solid var(--border)',
              color:'var(--text2)', fontSize:15,
              display:'flex', alignItems:'center', justifyContent:'center',
              cursor:'pointer', transition:'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.15)'; e.currentTarget.style.color='var(--red)' }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='var(--text2)' }}
          >✕</button>
        </div>

        {/* ── Body ── */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* File sidebar */}
          {activeView === 'code' && (
            <div style={{
              width: SIDEBAR_W, flexShrink:0,
              borderRight: '1px solid var(--border)',
              overflow: 'hidden',
              display: 'flex', flexDirection:'column',
              background:'rgba(0,0,0,.15)',
            }}>
              <FileTree
                items={tree}
                loading={treeLoading}
                onSelect={handleFileSelect}
                selectedPath={selectedPath}
              />
            </div>
          )}

          {/* Main code/readme area */}
          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            {activeView === 'code' ? (
              selectedPath ? (
                <>
                  {/* Tab label */}
                  <div style={{
                    padding:'7px 16px',
                    background:'var(--bg3)',
                    borderBottom:'1px solid var(--border)',
                    fontSize:11, fontFamily:'var(--mono)',
                    color:'var(--text2)', flexShrink:0,
                    display:'flex', alignItems:'center', gap:8,
                  }}>
                    <span>📄</span>
                    <span>{selectedPath}</span>
                  </div>
                  <div style={{ flex:1, overflow:'auto', background:'var(--bg)' }}>
                    <CodeViewer
                      content={fileContent}
                      language={fileLanguage}
                      loading={fileLoading}
                    />
                  </div>
                </>
              ) : (
                <div style={{
                  flex:1, display:'flex', flexDirection:'column',
                  alignItems:'center', justifyContent:'center',
                  color:'var(--text3)', fontFamily:'var(--mono)', fontSize:13, gap:12,
                }}>
                  <span style={{ fontSize:48 }}>👈</span>
                  <span>Select a file from the explorer</span>
                  <span style={{ fontSize:11, color:'var(--text3)' }}>
                    or switch to README tab
                  </span>
                </div>
              )
            ) : (
              /* README view */
              <div style={{ flex:1, overflow:'auto', padding:'32px 48px', maxWidth:800, width:'100%', margin:'0 auto' }}>
                {readmeLoading ? (
                  <div>{[...Array(12)].map((_,i) => <div key={i} className="skeleton" style={{ height:14,marginBottom:12,borderRadius:4,width:`${40+Math.random()*55}%` }} />)}</div>
                ) : (
                  <MarkdownRenderer content={readme} />
                )}
              </div>
            )}
          </div>

          {/* ── Right action panel ── */}
          <div style={{
            width: 220, flexShrink:0,
            borderLeft: '1px solid var(--border)',
            padding: 20,
            display: 'flex', flexDirection: 'column', gap: 14,
            background: 'rgba(0,0,0,.2)',
            overflowY: 'auto',
          }}>
            <div style={{
              fontSize:9, fontFamily:'var(--mono)', letterSpacing:'1.5px',
              textTransform:'uppercase', color:'var(--text3)',
              marginBottom:4,
            }}>
              Learning Tools
            </div>

            <ActionButton
              icon="📚"
              label="Learn"
              sublabel="Structured course"
              color="var(--accent)"
              bg="rgba(0,212,255,.07)"
              border="rgba(0,212,255,.22)"
              onClick={() => goTo('learn')}
            />
            <ActionButton
              icon="📝"
              label="Quiz"
              sublabel="Test your knowledge"
              color="#a78bfa"
              bg="rgba(124,58,237,.07)"
              border="rgba(124,58,237,.22)"
              onClick={() => goTo('quiz')}
            />
            <ActionButton
              icon="💻"
              label="Practice"
              sublabel="Coding exercises"
              color="var(--accent3)"
              bg="rgba(16,185,129,.07)"
              border="rgba(16,185,129,.22)"
              onClick={() => goTo('practice')}
            />

            <div style={{ marginTop:'auto', padding:'14px', background:'var(--bg3)', borderRadius:10, border:'1px solid var(--border)' }}>
              <p style={{ fontSize:11, fontFamily:'var(--mono)', color:'var(--text3)', lineHeight:1.6 }}>
                <span style={{ color:'var(--accent)', marginRight:5 }}>✦</span>
                AI analyzes this repo's code, README, and structure to generate personalized content.
              </p>
            </div>

            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                padding:'10px 0', borderRadius:9,
                border:'1px solid var(--border)',
                color:'var(--text2)', fontSize:12,
                fontFamily:'var(--mono)', transition:'all .15s',
                textDecoration:'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(255,255,255,.2)'; e.currentTarget.style.color='var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)' }}
            >
              <GitHubIcon /> View on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function ActionButton({ icon, label, sublabel, color, bg, border, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width:'100%', padding:'14px 16px',
        borderRadius:11, border:`1px solid ${border}`,
        background: bg, color: color,
        textAlign:'left', cursor:'pointer',
        transition:'all .18s',
        display:'flex', alignItems:'center', gap:12,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.filter='brightness(1.2)'
        e.currentTarget.style.transform='translateX(3px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.filter=''
        e.currentTarget.style.transform=''
      }}
    >
      <span style={{ fontSize:22, flexShrink:0 }}>{icon}</span>
      <div>
        <div style={{ fontSize:14, fontWeight:700, fontFamily:'var(--sans)' }}>{label}</div>
        <div style={{ fontSize:11, opacity:.65, marginTop:2, fontFamily:'var(--mono)' }}>{sublabel}</div>
      </div>
      <span style={{ marginLeft:'auto', fontSize:16, opacity:.5 }}>→</span>
    </button>
  )
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  )
}

// Simple markdown to HTML renderer for README
function MarkdownRenderer({ content }) {
  if (!content) return <p style={{ color:'var(--text3)', fontFamily:'var(--mono)' }}>No README found.</p>

  const lines = content.split('\n')
  const elements = []
  let i = 0, key = 0
  const codeBlocks = []

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={key++} style={{
          background:'var(--bg3)', border:'1px solid var(--border)',
          borderRadius:9, padding:'16px 20px', overflowX:'auto',
          fontFamily:'var(--mono)', fontSize:12, lineHeight:1.7,
          color:'var(--text2)', margin:'16px 0',
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={key++} style={{ fontSize:26, fontWeight:800, color:'var(--text)', margin:'28px 0 12px', letterSpacing:'-.3px' }}>{line.slice(2)}</h1>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} style={{ fontSize:20, fontWeight:700, color:'var(--text)', margin:'24px 0 10px', paddingBottom:8, borderBottom:'1px solid var(--border)' }}>{line.slice(3)}</h2>)
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} style={{ fontSize:16, fontWeight:700, color:'var(--text2)', margin:'18px 0 8px' }}>{line.slice(4)}</h3>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={key++} style={{ fontSize:13, color:'var(--text2)', lineHeight:1.75, marginLeft:18, marginBottom:4 }}>{renderInline(line.slice(2))}</li>)
    } else if (line.trim() === '') {
      elements.push(<br key={key++} />)
    } else {
      elements.push(<p key={key++} style={{ fontSize:13.5, color:'var(--text2)', lineHeight:1.85, marginBottom:8 }}>{renderInline(line)}</p>)
    }
    i++
  }

  return <div>{elements}</div>
}

function renderInline(text) {
  // Simple inline code: `code`
  const parts = text.split('`')
  return parts.map((p, i) =>
    i % 2 === 1
      ? <code key={i} style={{ fontFamily:'var(--mono)', fontSize:11, background:'rgba(0,212,255,.08)', padding:'1px 6px', borderRadius:4, color:'var(--accent)' }}>{p}</code>
      : p
  )
}
