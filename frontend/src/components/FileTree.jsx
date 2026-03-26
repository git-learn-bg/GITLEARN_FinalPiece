import { useState, useMemo } from 'react'

const FILE_ICONS = {
  py: '🐍', js: '📜', ts: '📘', jsx: '⚛️', tsx: '⚛️',
  go: '🐹', rs: '🦀', java: '☕', cpp: '⚙️', c: '⚙️', h: '⚙️',
  cs: '💎', rb: '💎', php: '🐘', swift: '🎯', kt: '🟣',
  md: '📝', json: '🔧', yaml: '🔧', yml: '🔧', toml: '🔧',
  env: '🔒', sh: '🖥️', html: '🌐', css: '🎨', scss: '🎨',
  sql: '🗄️', graphql: '🔗', vue: '🟩', svelte: '🟠',
  dockerfile: '🐳', gitignore: '🚫',
  default: '📄',
}

function getIcon(path) {
  const name = path.split('/').pop().toLowerCase()
  if (name === 'dockerfile') return '🐳'
  if (name === '.gitignore') return '🚫'
  const ext = name.split('.').pop()
  return FILE_ICONS[ext] || FILE_ICONS.default
}

function buildTree(flatItems) {
  const root = {}
  flatItems.forEach(item => {
    const parts = item.path.split('/')
    let node = root
    parts.forEach((part, i) => {
      if (!node[part]) {
        node[part] = {
          name: part,
          type: i === parts.length - 1 ? item.type : 'tree',
          path: parts.slice(0, i + 1).join('/'),
          children: {},
        }
      }
      node = node[part].children
    })
  })
  return root
}

function sortNodes(nodeMap) {
  return Object.values(nodeMap).sort((a, b) => {
    if (a.type === 'tree' && b.type !== 'tree') return -1
    if (a.type !== 'tree' && b.type === 'tree') return 1
    return a.name.localeCompare(b.name)
  })
}

function TreeNode({ node, depth = 0, onSelect, selectedPath }) {
  const [open, setOpen] = useState(depth < 2)
  const isDir     = node.type === 'tree'
  const isSelected = node.path === selectedPath

  return (
    <div>
      <div
        onClick={() => isDir ? setOpen(v => !v) : onSelect(node.path)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: `3px 8px 3px ${8 + depth * 14}px`,
          fontSize: 12, fontFamily: 'var(--mono)',
          cursor: 'pointer',
          borderRadius: 5,
          background: isSelected ? 'rgba(0,212,255,.12)' : 'transparent',
          color: isSelected ? 'var(--accent)' : isDir ? 'var(--text2)' : 'var(--text)',
          transition: 'background .12s',
          userSelect: 'none',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background='rgba(255,255,255,.04)' }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background='transparent' }}
      >
        {isDir ? (
          <span style={{ fontSize: 10, color: 'var(--text3)', flexShrink:0 }}>
            {open ? '▾' : '▸'}
          </span>
        ) : (
          <span style={{ fontSize: 13, flexShrink:0 }}>{getIcon(node.path)}</span>
        )}
        <span style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{node.name}</span>
      </div>
      {isDir && open && (
        <div>
          {sortNodes(node.children).map(child => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FileTree({ items = [], onSelect, selectedPath, loading }) {
  const tree = useMemo(() => buildTree(items), [items])
  const roots = useMemo(() => sortNodes(tree), [tree])

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height:16, marginBottom:10, borderRadius:4, width:`${60+Math.random()*30}%` }} />
        ))}
      </div>
    )
  }

  if (!items.length) {
    return (
      <div style={{ padding:20, color:'var(--text3)', fontSize:12, fontFamily:'var(--mono)', textAlign:'center' }}>
        No files found
      </div>
    )
  }

  return (
    <div style={{ overflowY:'auto', overflowX:'hidden', height:'100%', padding:'8px 4px' }}>
      <div style={{
        fontSize:9, fontFamily:'var(--mono)', letterSpacing:'1.2px',
        textTransform:'uppercase', color:'var(--text3)',
        padding:'4px 12px 8px', marginBottom:2,
      }}>
        Explorer
      </div>
      {roots.map(node => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          onSelect={onSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  )
}
