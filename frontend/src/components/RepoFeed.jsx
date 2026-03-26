import React, { useState, useEffect } from 'react';
import RepoCard from './RepoCard';
import { getRecommendedRepos } from '../services/api';  // ← use shared axios instance

export default function RepoFeed({ hideHeader = false, onClick }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchRepos() {
      if (loading || !hasMore) return;

      try {
        setLoading(true);
        const data = await getRecommendedRepos(page);  // ← was: raw fetch('/api/repos/recommended?page=...')
        const newItems = data.items || [];

        if (active) {
          if (newItems.length < 20) {
            setHasMore(false);
          }

          setRepos(prev => {
            const existingIds = new Set(prev.map(r => r.id));
            const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
            return page === 1 ? uniqueNewItems : [...prev, ...uniqueNewItems];
          });
        }
      } catch (error) {
        console.error("Failed to fetch recommended repos:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchRepos();

    return () => {
      active = false;
    };
  }, [page]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prevPage => prevPage + 1);
    }
  };

  return (
    <div style={{ padding: hideHeader ? '0' : '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {!hideHeader && (
        <>
          <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text)' }}>
            Recommended Repositories
          </h2>
          <p style={{ color: 'var(--text2)', marginBottom: '24px' }}>
            Trending projects across GitHub.
          </p>
        </>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {repos.map((repo) => (
          <RepoCard
            key={repo.id}
            repo={{
               id: repo.id,
               full_name: `${repo.owner}/${repo.name}`,
               owner: repo.owner,
               repo: repo.name,
               description: repo.description,
               stars: repo.stars,
               forks: repo.forks,
               language: repo.language,
               html_url: repo.url
            }}
            onClick={onClick}
          />
        ))}

        {loading && page === 1 && Array.from({ length: 6 }).map((_, i) => (
          <div key={`loading-${i}`} style={{
            height: '160px',
            background: 'var(--card, #f4f5f7)',
            borderRadius: '12px',
            animation: 'pulse 1.5s infinite ease-in-out',
            border: '1px solid var(--border, #e5e7eb)'
          }} />
        ))}
      </div>

      {hasMore && repos.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={handleLoadMore}
            disabled={loading}
            style={{
              padding: '12px 28px',
              background: loading ? 'var(--bg3, #e5e7eb)' : 'var(--accent, #3b82f6)',
              color: loading ? 'var(--text3, #9ca3af)' : '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '15px',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid currentColor',
                  borderRightColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.75s linear infinite'
                }} />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {!hasMore && repos.length > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text3)', marginTop: '24px' }}>
          No more repositories to show.
        </p>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
