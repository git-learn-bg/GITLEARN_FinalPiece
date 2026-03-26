import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
const api = axios.create({ baseURL: API_URL })

export const searchRepos  = (q, lang = '', page = 1) =>
  api.get('/search', { params: { q, lang, page, per_page: 12 } }).then(r => r.data)

export const getReadme    = (owner, repo) =>
  api.get(`/repo/${owner}/${repo}/readme`).then(r => r.data)

export const getFileTree  = (owner, repo) =>
  api.get(`/repo/${owner}/${repo}/tree`).then(r => r.data)

export const getFileContent = (owner, repo, path) =>
  api.get(`/repo/${owner}/${repo}/file`, { params: { path } }).then(r => r.data)

export const generateLearn = (payload) =>
  api.post('/generate/learn', payload).then(r => r.data)

export const generateQuiz = (payload) =>
  api.post('/generate/quiz', payload).then(r => r.data)

export const generatePractice = (payload) =>
  api.post('/generate/practice', payload).then(r => r.data)

export const suggestSearch = (q) =>
  api.get('/suggest', { params: { q } }).then(r => r.data)

export const searchNews = (q) =>
  api.get('/news', { params: { q } }).then(r => r.data)

export const summarizeNews = (payload) =>
  api.post('/news/summarize', payload).then(r => r.data)

export const getCompetitions = (limit = 8) =>
  api.get('/competitions', { params: { limit } }).then(r => r.data)

export const getCompetitionStats = () =>
  api.get('/competitions/stats').then(r => r.data)

export const getLocalCompetitions = () =>
  api.get('/competitions/local').then(r => r.data)

export const getGlobalCompetitions = () =>
  api.get('/competitions/global').then(r => r.data)

export const getRecommendedRepos = (page = 1) =>
  api.get('/repos/recommended', { params: { page } }).then(r => r.data)
```

And remember your Vercel env var should be:
```
VITE_API_URL = https://your-app-name.onrender.com/api
