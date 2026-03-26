import { useEffect, useRef } from 'react'
import hljs from 'highlight.js'

const LINE_H = 20
const FONT_SIZE = 12.5

export default function CodeViewer({ content = '', language = 'plaintext', loading = false }) {
  const codeRef = useRef(null)

  useEffect(() => {
    if (!codeRef.current || loading || !content) return
    codeRef.current.removeAttribute('data-highlighted')
    codeRef.current.textContent = content
    try {
      hljs.highlightElement(codeRef.current)
    } catch {
      // fallback: plain text
    }
  }, [content, language, loading])

  if (loading) {
    return (
      <div style={{ padding: 24, fontFamily:'var(--mono)', fontSize: FONT_SIZE }}>
        {[...Array(16)].map((_, i) => (
          <div key={i} className="skeleton" style={{
            height: LINE_H - 2, marginBottom: 5,
            borderRadius: 3,
            width: `${20 + Math.random() * 70}%`,
          }} />
        ))}
      </div>
    )
  }

  if (!content) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--text3)',
        fontFamily: 'var(--mono)', fontSize: 13,
        flexDirection: 'column', gap: 10,
      }}>
        <span style={{ fontSize: 36 }}>📂</span>
        <span>Select a file from the explorer</span>
      </div>
    )
  }

  const lines = content.split('\n')

  return (
    <div style={{ display:'flex', height:'100%', overflow:'auto', fontSize: FONT_SIZE }}>
      {/* Line numbers */}
      <div style={{
        flexShrink: 0,
        padding: '18px 8px 18px 12px',
        textAlign: 'right',
        fontFamily: 'var(--mono)',
        fontSize: FONT_SIZE,
        lineHeight: `${LINE_H}px`,
        color: 'var(--text3)',
        userSelect: 'none',
        borderRight: '1px solid var(--border)',
        minWidth: `${String(lines.length).length * 8 + 20}px`,
        background: 'rgba(0,0,0,.15)',
      }}>
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>

      {/* Code */}
      <div style={{ flex:1, overflow:'auto' }}>
        <pre style={{
          margin: 0, padding: '18px 20px',
          fontFamily: 'var(--mono)',
          fontSize: FONT_SIZE,
          lineHeight: `${LINE_H}px`,
          background: 'transparent',
        }}>
          <code
            ref={codeRef}
            className={`language-${language}`}
            style={{ fontFamily:'var(--mono)', fontSize: FONT_SIZE }}
          />
        </pre>
      </div>
    </div>
  )
}
