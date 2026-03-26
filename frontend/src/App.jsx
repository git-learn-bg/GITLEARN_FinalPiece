import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import RepoFeed from './components/RepoFeed.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import LearnPage from './pages/LearnPage.jsx'
import QuizPage from './pages/QuizPage.jsx'
import PracticePage from './pages/PracticePage.jsx'
import NewsDetailPage from './pages/NewsDetailPage.jsx'
import CompetitionsPage from './pages/CompetitionsPage.jsx'

export default function App() {
  return (
    <Routes>
      {/* Standalone pages — own header built-in */}
      <Route path="/"         element={<Home />} />
      <Route path="/news/:id" element={<NewsDetailPage />} />

      {/* Pages that use shared Navbar */}
      <Route path="/competitions"          element={<><Navbar /><CompetitionsPage /></>} />
      <Route path="/repos"                 element={<><Navbar /><RepoFeed /></>} />
      <Route path="/library"               element={<><Navbar /><LibraryPage /></>} />
      <Route path="/learn/:owner/:repo"    element={<><Navbar /><LearnPage /></>} />
      <Route path="/quiz/:owner/:repo"     element={<><Navbar /><QuizPage /></>} />
      <Route path="/practice/:owner/:repo" element={<><Navbar /><PracticePage /></>} />
    </Routes>
  )
}
