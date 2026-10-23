import { Helmet } from 'react-helmet-async'

export default function PrivacyPolicy() {
  return (
    <div className="page">
      <Helmet>
        <title>Privacy Policy | FraudGuard</title>
        <meta name="description" content="FraudGuard privacy policy - how we collect, use, and protect your data." />
        <link rel="canonical" href="https://fraudguard.farazkiqbal.com/privacy" />
      </Helmet>
      <header className="page-header">
        <h1 className="page-title">Privacy Policy</h1>
        <p className="subtitle">How FraudGuard handles data</p>
      </header>

      <div className="card">
        <h2>Overview</h2>
        <p>
          FraudGuard is a click-fraud detection tool for ad networks. This dashboard
          runs locally in your browser and communicates with a Flask API backend.
          No click data submitted to the API is stored or logged beyond what is
          necessary to return a prediction.
        </p>
      </div>

      <div className="card mt-1">
        <h2>Data We Process</h2>
        <ul className="kv-list">
          <li><span>Click payload</span><strong>Transient</strong><span className="text-dim"> — sent to the API for scoring; not persisted to disk.</span></li>
          <li><span>Browser session</span><strong>Local</strong><span className="text-dim"> — form state held in browser memory only.</span></li>
          <li><span>Dataset statistics</span><strong>Read-only</strong><span className="text-dim"> — training/test split metadata served from committed artifacts.</span></li>
        </ul>
      </div>

      <div className="card mt-1">
        <h2>Data We Do Not Collect</h2>
        <ul className="feature-list">
          <li>No personally identifiable information (PII) is stored.</li>
          <li>No click data is written to disk or a database.</li>
          <li>No third-party tracking scripts are loaded.</li>
          <li>No cookies or local storage identifiers are set by this application.</li>
        </ul>
      </div>

      <div className="card mt-1">
        <h2>Your Rights</h2>
        <p>
          You are free to use FraudGuard locally without submitting any data to a
          remote server. If you deploy it yourself, you control the endpoint. The
          prediction API does not retain submissions after the response is returned.
        </p>
      </div>

      <div className="card mt-1">
        <h2>Changes</h2>
        <p>
          This policy may be updated with the project. Check the repository for the
          latest version.
        </p>
      </div>
    </div>
  )
}
