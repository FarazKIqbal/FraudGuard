import { useState, useEffect } from 'react'
import { ShieldAlert, ShieldCheck, Layers, Clock, Eye, AlertTriangle } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { predictSingle } from '../services/api'
import ClickForm from '../components/ClickForm'

export default function AdDemo() {
  const [scenario, setScenario] = useState('legitimate')
  const [clickData, setClickData] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const SCENARIOS = {
    legitimate: {
      name: 'Legitimate User Click',
      clicks: 0,
      fraud: 0,
      data: {
        device_type: 'Mobile',
        browser: 'Chrome',
        operating_system: 'Android',
        ad_position: 'Top',
        device_ip_reputation: 'Good',
        click_duration: 2.5,
        scroll_depth: 60,
        mouse_movement: 300,
        keystrokes_detected: 15,
        click_frequency: 3,
        time_since_last_click: 200,
        bot_likelihood_score: 0.1,
        VPN_usage: false,
        proxy_usage: false,
        timestamp: '2024-08-23 14:30:00',
      },
      description: 'A real user browsing the site, engaging with the content, and clicking naturally.',
    },
    suspicious: {
      name: 'Suspicious Click',
      clicks: 0,
      fraud: 0,
      data: {
        device_type: 'Desktop',
        browser: 'Firefox',
        operating_system: 'Windows',
        ad_position: 'Bottom',
        device_ip_reputation: 'Suspicious',
        click_duration: 0.1,
        scroll_depth: 5,
        mouse_movement: 10,
        keystrokes_detected: 0,
        click_frequency: 15,
        time_since_last_click: 5,
        bot_likelihood_score: 0.95,
        VPN_usage: true,
        proxy_usage: true,
        timestamp: '2024-08-23 02:15:00',
      },
      description: 'Pattern typical of automated scripts: short duration, no interaction, high bot likelihood, VPN/proxy enabled.',
    },
    bot: {
      name: 'Bot Network Click',
      clicks: 0,
      fraud: 0,
      data: {
        device_type: 'Mobile',
        browser: 'Chrome',
        operating_system: 'Android',
        ad_position: 'Side',
        device_ip_reputation: 'Poor',
        click_duration: 0.5,
        scroll_depth: 1,
        mouse_movement: 2,
        keystrokes_detected: 0,
        click_frequency: 50,
        time_since_last_click: 1,
        bot_likelihood_score: 0.99,
        VPN_usage: 1,
        proxy_usage: 1,
        timestamp: '2024-08-23 03:45:00',
      },
      description: ' Coordinated bot network: extremely high frequency, no human interaction, poor IP reputation, VPN/proxy.',
    },
  }

  // Load scenario data
  useEffect(() => {
    const scenario = SCENARIOS['legitimate'] // default
    setScenario('legitimate')
    setClickData({ ...scenario.data })
  }, [])

  const handleSubmit = async (payload) => {
    setLoading(true)
    setError(null)
    setPrediction(null)
    try {
      const res = await predictSingle(payload, 'meta_learner')
      setPrediction(res)
    } catch (e) {
      setError(e.message || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const scenarioData = SCENARIOS[scenario]

  // Simulate the "ad displaying" + "user clicking" journey
  const simulateAdClick = (selectedScenario = scenario) => {
    // Start with scenario data, then override with a slight modification
    // to show how the model reacts to subtle changes
    const base = { ...SCENARIOS[selectedScenario].data }
    // If bot scenario, nudge bot_likelihood higher; if legitimate, nudge down
    if (selectedScenario === 'bot') {
      base.bot_likelihood_score = 0.99
    } else if (selectedScenario === 'suspicious') {
      base.bot_likelihood_score = 0.95
    }
    setClickData(base)
    // Auto-submit the form
    handleSubmit(base)
  }

  if (error) return <div className="error-text">{error}</div>
  if (!clickData) return <div className="loading-center"><span className="spinner" /> Loading ad demo...</div>

  const isFraud = prediction?.prediction === 'fraudulent'
  const conf = (prediction?.confidence * 100).toFixed(1)

  return (
    <div className="page">
      <Helmet>
        <title>Ad Click Demo | FraudGuard - Simulate Fraud Detection</title>
        <meta name="description" content="Interactive demo simulating ad impressions, user clicks, and real-time fraud prediction across legitimate, suspicious, and bot scenarios." />
        <link rel="canonical" href="https://fraudguard.farazkiqbal.com/ad-demo" />
        <meta property="og:title" content="Ad Click Demo | FraudGuard" />
        <meta property="og:description" content="Simulate the full ad click fraud detection pipeline." />
        <meta property="og:url" content="https://fraudguard.farazkiqbal.com/ad-demo" />
      </Helmet>
      <h1>Ad Click Demo</h1>
      <p className="subtitle">Simulate an ad impression → user click → fraud prediction</p>

      {/* Ad visualization */}
      <div className="card mt-1" style={{ maxWidth: '420px' }}>
        <div className="card-header">
          <Layers size={24} /> Ad Unit
        </div>
        <div className="card-body">
          <p className="text-dim mb-2">Website: <strong>ExampleDeals.com</strong></p>
          <p className="text-dim mb-2">Ad Format: <strong>Banner 300×250</strong></p>
          <p className="text-dim mb-2">Campaign: <strong>Spring Sale #SP-2025</strong></p>
          <p className="text-dim">User: <strong>{scenarioData.name}</strong></p>
        </div>
      </div>

      {/* Click data form */}
      <div className="card mt-1">
        <h2><Eye size={20} /> Click Data</h2>
        <ClickForm onSubmit={handleSubmit} loading={loading} initialData={clickData} />
      </div>

      {/* Prediction result */}
      {prediction && (
        <div className={`card mt-1 ${isFraud ? 'fraud' : 'legit'}`}>
          <div className="card-header">
            {isFraud ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
            <span>{isFraud ? 'Fraud Detected' : 'Legitimate Click'}</span>
          </div>
          <div>
            <p>Fraud Probability: <strong>{(prediction.fraud_probability * 100).toFixed(1)}%</strong></p>
            <p>Confidence: <strong>{conf}%</strong></p>
            <p>Model Used: <strong>{prediction.model_used}</strong></p>
            {prediction.fraud_threshold !== undefined && (
              <p>Threshold: <strong>{prediction.fraud_threshold}</strong></p>
            )}
          </div>
        </div>
      )}

      {/* Scenario selector */}
      {error && <div className="result-banner fraud mt-1"><AlertTriangle size={24} /><p>{error}</p></div>}

      <div className="card mt-1">
        <h2><AlertTriangle size={16} /> Scenario Explorer</h2>
        <p className="text-sm text-dim mb-1">Click a scenario to load realistic click data:</p>
        <div className="scenario-grid">
          {Object.keys(SCENARIOS).map(key => {
            const s = SCENARIOS[key]
            return (
              <div key={key} className="scenario-item" onClick={() => {
                setScenario(key)
                simulateAdClick(key)
              }}>
                <span className="scenario-name">{s.name}</span>
                <span className="scenario-desc">{s.description}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Journey explanation */}
      <div className="card mt-1">
        <h2><Clock size={16} /> How It Works</h2>
        <ol className="kv-list">
          <li><span>Ad impression</span> Website serves a banner ad to a user</li>
          <li><span>User click</span> User interacts with the ad (or a bot generates clicks)</li>
          <li><span>Data captured</span> 17 features (device, browser, OS, ad position, timing, behavior)</li>
          <li><span>Model processes</span> RF + XGB + NN → meta-learner (logistic regression)</li>
          <li><span>Decision</span> Probability vs threshold → FRAUD / LEGITIMATE</li>
          <li><span>Outcome</span> Budget protected / legitimate revenue registered</li>
        </ol>
      </div>
    </div>
  )
}