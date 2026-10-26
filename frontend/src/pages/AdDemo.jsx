import { useState, useEffect, useRef, useCallback } from 'react'
import { ShieldAlert, ShieldCheck, Layers, Clock, Eye, Zap, MousePointer, Timer } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { predictSingle } from '../services/api'
import ClickForm from '../components/ClickForm'

export default function AdDemo() {
  const [clickData, setClickData] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Interactive ad click tracking
  const [adClickCount, setAdClickCount] = useState(0)
  const [clickTimings, setClickTimings] = useState([])
  const [hoverStart, setHoverStart] = useState(null)
  const [isHovering, setIsHovering] = useState(false)
  const [clickFeedback, setClickFeedback] = useState(null)
  const [simulating, setSimulating] = useState(false)

  const adRef = useRef(null)
  const lastClickTime = useRef(0)
  const hoverTimerRef = useRef(null)

  const handleSubmit = async (payload) => {
    if (!payload) return
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

  // Generate realistic click data based on click behavior
  const analyzeClickBehavior = useCallback(() => {
    const now = Date.now()
    const timeSinceLastClick = lastClickTime.current ? Math.floor((now - lastClickTime.current) / 1000) : 120
    lastClickTime.current = now
    setAdClickCount(prev => prev + 1)

    // Calculate timing metrics
    const recentTimings = clickTimings.slice(-5)
    const avgTiming = recentTimings.length > 0
      ? recentTimings.reduce((a, b) => a + b, 0) / recentTimings.length
      : 200
    const fastClicks = recentTimings.filter(t => t < 100).length

    // Simulate mouse movement based on clicking pattern
    const mouseMovement = Math.max(50, Math.min(500, avgTiming * 1.5 + Math.random() * 100))

    return {
      click_duration: Math.max(0.1, (avgTiming / 1000) * 0.8),
      mouse_movement: Math.round(mouseMovement),
      click_frequency: Math.min(50, Math.max(1, Math.round(60000 / Math.max(avgTiming, 200)))),
      time_since_last_click,
    }
  }, [clickTimings])

  // Handle ad click
  const handleAdClick = useCallback(() => {
    if (!clickData || loading) return

    const timing = Date.now() - lastClickTime.current
    setClickTimings(prev => [...prev.slice(-10), timing])

    const behavior = analyzeClickBehavior()
    setClickFeedback({ type: 'processing', timing })

    // Update click data with new behavior patterns
    setClickData(prev => ({
      ...prev,
      ...behavior,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }))

    // Auto-predict after short delay
    setTimeout(() => {
      handleSubmit({ ...clickData, ...behavior })
    }, 300)
  }, [clickData, loading, analyzeClickBehavior, handleSubmit])

  // Handle mouse hover on ad
  const handleAdHover = useCallback(() => {
    setIsHovering(true)
    hoverTimerRef.current = Date.now()
  }, [])

  const handleAdMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      const hoverDuration = Date.now() - hoverTimerRef.current
      if (hoverDuration > 2000) {
        // Long hover - suspicious pattern
        setClickData(prev => ({
          ...prev,
          bot_likelihood_score: Math.min(0.95, prev.bot_likelihood_score + 0.2),
          mouse_movement: prev.mouse_movement + 50,
        }))
      }
    }
    setIsHovering(false)
    hoverTimerRef.current = null
  }, [])

  // Simulate different click patterns
  const simulatePattern = useCallback((pattern) => {
    setSimulating(true)
    setAdClickCount(0)
    setClickTimings([])
    lastClickTime.current = Date.now()
    setPrediction(null)

    let clicks = []
    let delay = 0

    if (pattern === 'fast') {
      // Rapid clicks - suspicious
      clicks = [150, 100, 80, 120, 90, 70, 110]
    } else if (pattern === 'slow') {
      // Slow, deliberate clicks - normal
      clicks = [800, 1200, 900, 1500, 1100]
    } else if (pattern === 'bot') {
      // Ultra-fast, machine-like - bot
      clicks = [50, 45, 55, 40, 60, 35, 50, 48, 52, 42]
    }

    clicks.forEach((timing, index) => {
      setTimeout(() => {
        setClickTimings(prev => [...prev, timing])
        const behavior = analyzeClickBehavior()
        setClickData(prev => ({
          ...prev,
          ...behavior,
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        }))

        if (index === clicks.length - 1) {
          setTimeout(() => {
            handleSubmit(clickData)
            setSimulating(false)
          }, 300)
        }
      }, delay)
      delay += timing
    })
  }, [analyzeClickBehavior, handleSubmit])

  // Initialize with default scenario
  useEffect(() => {
    const initialData = {
      device_type: 'Desktop',
      browser: 'Chrome',
      operating_system: 'Windows',
      ad_position: 'Side',
      device_ip_reputation: 'Good',
      click_duration: 1.5,
      scroll_depth: 45,
      mouse_movement: 200,
      keystrokes_detected: 10,
      click_frequency: 5,
      time_since_last_click: 120,
      bot_likelihood_score: 0.3,
      VPN_usage: false,
      proxy_usage: false,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    setClickData(initialData)
    lastClickTime.current = Date.now()
  }, [])

  const isFraud = prediction?.prediction === 'fraudulent'
  const fraudProb = prediction ? (prediction.fraud_probability * 100).toFixed(1) : null
  const conf = prediction ? (prediction.confidence * 100).toFixed(1) : null

  // Calculate live click metrics
  const avgClickTime = clickTimings.length > 0
    ? Math.round(clickTimings.reduce((a, b) => a + b, 0) / clickTimings.length)
    : null
  const clickRate = clickTimings.length > 0
    ? Math.round(60000 / (clickTimings.reduce((a, b) => a + b, 0) / clickTimings.length))
    : null

  return (
    <div className="page">
      <Helmet>
        <title>Ad Click Demo | FraudGuard - Interactive Fraud Detection</title>
        <meta name="description" content="Experience real-time ad click fraud detection. Click ads and see how FraudGuard analyzes human vs bot behavior patterns." />
        <link rel="canonical" href="https://fraudguard.farazkiqbal.com/ad-demo" />
        <meta property="og:title" content="Ad Click Demo | FraudGuard" />
        <meta property="og:description" content="Interactive demo showing real-time ad click fraud detection." />
        <meta property="og:url" content="https://fraudguard.farazkiqbal.com/ad-demo" />
      </Helmet>

      <h1>Ad Click Demo</h1>
      <p className="subtitle">Click ads to simulate user behavior and see real-time fraud detection</p>

      {/* Interactive Ad Unit */}
      <div className="card mt-1 ad-demo-section">
        <div className="card-header">
          <span className="card-title"><Layers size={16} /> Ad Unit Preview</span>
          <span className="text-xs text-dim">Click the ad to test fraud detection</span>
        </div>

        <div className="ad-container">
          {/* Ad Banner */}
          <div
            ref={adRef}
            className={`ad-banner ${isHovering ? 'hovering' : ''} ${loading ? 'analyzing' : ''} ${isFraud === true ? 'fraud' : isFraud === false ? 'legit' : ''}`}
            onClick={handleAdClick}
            onMouseEnter={handleAdHover}
            onMouseLeave={handleAdMouseLeave}
          >
            <div className="ad-label">ADVERTISEMENT</div>
            <div className="ad-content">
              <div className="ad-image-placeholder">
                <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'%3E%3Crect fill='%231a1f36' width='200' height='150'/%3E%3Ctext x='50%25' y='40%25' font-family='Arial' font-size='16' fill='%2300d4aa' text-anchor='middle'%3ESummer%3C/text%3E%3Ctext x='50%25' y='60%25' font-family='Arial' font-size='20' fill='%23e8edf5' text-anchor='middle'%3ESALE%3C/text%3E%3Ctext x='50%25' y='75%25' font-family='Arial' font-size='12' fill='%237a8aa3' text-anchor='middle'%3EUp to 50%25 Off%3C/text%3E%3C/svg%3E" alt="Ad" />
              </div>
              <div className="ad-text">
                <h3>🔥 Summer Sale Live!</h3>
                <p>Get up to 50% off on all electronics</p>
                <span className="ad-cta">Shop Now →</span>
              </div>
            </div>

            {/* Click feedback overlay */}
            {clickFeedback && (
              <div className="click-feedback">
                <Zap size={24} />
                <span>Click captured!</span>
              </div>
            )}

            {/* Hover indicator */}
            {isHovering && !clickFeedback && (
              <div className="hover-indicator">
                <MousePointer size={16} /> Hovering...
              </div>
            )}
          </div>

          {/* Live Metrics */}
          <div className="live-metrics">
            <div className="metric">
              <Timer size={16} />
              <div>
                <div className="metric-value">{avgClickTime !== null ? `${avgClickTime}ms` : '--'}</div>
                <div className="metric-label">Avg Click Time</div>
              </div>
            </div>
            <div className="metric">
              <Zap size={16} />
              <div>
                <div className="metric-value">{clickRate !== null ? `${clickRate}/min` : '--'}</div>
                <div className="metric-label">Click Rate</div>
              </div>
            </div>
            <div className="metric">
              <Eye size={16} />
              <div>
                <div className="metric-value">{adClickCount}</div>
                <div className="metric-label">Total Clicks</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simulation Presets */}
      <div className="card mt-1">
        <h2><Zap size={20} /> Simulate Click Patterns</h2>
        <p className="text-sm text-dim mb-2">Choose a pattern to simulate different user behaviors:</p>
        <div className="btn-group">
          <button
            className="btn btn-outline"
            onClick={() => simulatePattern('normal')}
            disabled={simulating}
          >
            🎯 Normal Behavior
          </button>
          <button
            className="btn btn-outline"
            onClick={() => simulatePattern('fast')}
            disabled={simulating}
          >
            ⚡ Fast Clicks (Suspicious)
          </button>
          <button
            className="btn btn-outline"
            onClick={() => simulatePattern('bot')}
            disabled={simulating}
          >
            🤖 Bot Pattern
          </button>
        </div>
      </div>

      {/* Click Data Form */}
      <div className="card mt-1">
        <h2><Eye size={20} /> Click Data Analysis</h2>
        {clickData && (
          <ClickForm onSubmit={handleSubmit} loading={loading} initialData={clickData} />
        )}
      </div>

      {/* Prediction Result */}
      {prediction && (
        <div className={`card mt-1 ${isFraud ? 'result-fraud' : 'result-legit'}`}>
          <div className="result-header">
            {isFraud ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
            <div className="result-info">
              <h3>{isFraud ? '⚠️ Fraud Detected!' : '✓ Legitimate Click'}</h3>
              <p className="result-subtitle">
                {isFraud
                  ? 'This click pattern shows characteristics of fraudulent activity.'
                  : 'This click appears to be from a legitimate user.'}
              </p>
            </div>
            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-label">Fraud Probability</span>
                <span className="stat-value">{fraudProb}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Confidence</span>
                <span className="stat-value">{conf}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Model</span>
                <span className="stat-value mono">{prediction.model_used}</span>
              </div>
            </div>
          </div>

          {/* Risk indicator bar */}
          <div className="risk-bar">
            <div
              className={`risk-fill ${isFraud ? 'high' : 'low'}`}
              style={{ width: `${fraudProb}%` }}
            ></div>
          </div>
          <div className="risk-labels">
            <span>Legitimate</span>
            <span>Suspicious</span>
            <span>Fraudulent</span>
          </div>
        </div>
      )}

      {/* Scenario Guide */}
      <div className="card mt-1">
        <h2><Clock size={20} /> How Click Patterns Are Analyzed</h2>
        <div className="analysis-guide">
          <div className="guide-item">
            <div className="guide-icon normal">🎯</div>
            <div className="guide-content">
              <h4>Normal Behavior</h4>
              <p>Average click time: 400-1000ms. Natural mouse movements and occasional variations. Human browsing pattern.</p>
            </div>
          </div>
          <div className="guide-item">
            <div className="guide-icon suspicious">⚡</div>
            <div className="guide-content">
              <h4>Suspicious Speed</h4>
              <p>Below 200ms average click time. Machine-gun clicking with no pause. May indicate scripted behavior.</p>
            </div>
          </div>
          <div className="guide-item">
            <div className="guide-icon bot">🤖</div>
            <div className="guide-content">
              <h4>Bot Pattern</h4>
              <p>Ultra-fast clicks (50-100ms), perfect consistency, zero human variation. Automated scripts are predictable.</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="result-banner fraud mt-1">
          <ShieldAlert size={24} />
          <div>
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
