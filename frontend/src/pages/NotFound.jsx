import { Link } from 'react-router-dom'
import { Home, AlertTriangle } from 'lucide-react'
import { Helmet } from 'react-helmet-async'

export default function NotFound() {
  return (
    <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <Helmet>
        <title>404 - Page Not Found | FraudGuard</title>
        <meta name="description" content="The page you're looking for doesn't exist." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <AlertTriangle size={48} style={{ margin: '0 auto 1rem', color: 'var(--warn)' }} />
      <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>404</h1>
      <p className="subtitle" style={{ marginBottom: '2rem' }}>Page not found</p>
      <p style={{ marginBottom: '2rem', color: 'var(--text-dim)' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
        <Home size={16} /> Back to Dashboard
      </Link>
    </div>
  )
}
