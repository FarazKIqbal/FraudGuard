import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Predict from './pages/Predict'
import BatchPredict from './pages/BatchPredict'
import Models from './pages/Models'
import Analytics from './pages/Analytics'
import HowItWorks from './pages/HowItWorks'
import AdDemo from './pages/AdDemo'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/predict" element={<Predict />} />
            <Route path="/batch" element={<BatchPredict />} />
            <Route path="/models" element={<Models />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/ad-demo" element={<AdDemo />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
