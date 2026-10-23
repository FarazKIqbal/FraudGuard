import { useState, useRef, useEffect } from 'react'
import { ShieldAlert, ShieldCheck, Radar, Zap } from 'lucide-react'
import { predictSingle, predictAllModels } from '../services/api'

/* ── Radar Sweep Meter ──────────────────────────────────────── */
function RadarMeter({ probability, threshold, onThresholdChange }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const sweepAngleRef = useRef(-Math.PI / 2)

  const SIZE = 280
  const CX = SIZE / 2
  const R = SIZE / 2 - 16

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = SIZE * 2
    canvas.height = SIZE * 2
    ctx.scale(2, 2)

    const prob = probability ?? 0
    sweepAngleRef.current = -Math.PI / 2
    let start = performance.now()

    const draw = (now) => {
      const elapsed = (now - start) / 1000
      const t = Math.min(elapsed / 1.8, 1)

      ctx.clearRect(0, 0, SIZE, SIZE)

      // Background circle
      ctx.beginPath()
      ctx.arc(CX, CX, R, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,212,170,0.03)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,212,170,0.15)'
      ctx.lineWidth = 1
      ctx.stroke()

      // Concentric rings
      [0.25, 0.5, 0.75].forEach((ratio) => {
        ctx.beginPath()
        ctx.arc(CX, CX, R * ratio, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(0,212,170,${0.06 + ratio * 0.04})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      })

      // Crosshairs
      ctx.strokeStyle = 'rgba(0,212,170,0.08)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(CX, 10)
      ctx.lineTo(CX, SIZE - 10)
      ctx.moveTo(10, CX)
      ctx.lineTo(SIZE - 10, CX)
      ctx.stroke()

      // Threshold arc (amber)
      const thresholdAngle = (threshold - 0.5) * Math.PI * 2 - Math.PI / 2
      ctx.beginPath()
      ctx.arc(CX, CX, R * 0.85, -Math.PI / 2, thresholdAngle)
      ctx.strokeStyle = 'rgba(255,184,0,0.4)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.stroke()
      ctx.setLineDash([])

      // Risk arc (cyan → amber → red)
      const riskAngle = prob * Math.PI * 2 - Math.PI / 2
      const grad = ctx.createConicGradient(riskAngle, CX, CX)
      grad.addColorStop(0, 'rgba(0,212,170,0.6)')
      grad.addColorStop(Math.min(prob * 0.7, 0.5), 'rgba(255,184,0,0.5)')
      grad.addColorStop(1, 'rgba(255,71,87,0.6)')
      ctx.beginPath()
      ctx.arc(CX, CX, R * 0.65, -Math.PI / 2, riskAngle)
      ctx.strokeStyle = grad
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.stroke()

      // Sweep trail (only during animation)
      if (t < 1) {
        const sweep = sweepAngleRef.current
        const trailLen = Math.PI * 0.4
        const trailGrad = ctx.createLinearGradient(
          CX + Math.cos(sweep) * R, CX + Math.sin(sweep) * R,
          CX + Math.cos(sweep - trailLen) * R, CX + Math.sin(sweep - trailLen) * R
        )
        trailGrad.addColorStop(0, 'rgba(0,212,170,0.35)')
        trailGrad.addColorStop(1, 'rgba(0,212,170,0)')
        ctx.beginPath()
        ctx.arc(CX, CX, R * 0.9, sweep - trailLen, sweep)
        ctx.strokeStyle = trailGrad
        ctx.lineWidth = 3
        ctx.stroke()

        // Sweep line
        ctx.beginPath()
        ctx.moveTo(CX, CX)
        ctx.lineTo(CX + Math.cos(sweep) * R * 0.9, CX + Math.sin(sweep) * R * 0.9)
        ctx.strokeStyle = 'rgba(0,212,170,0.5)'
        ctx.lineWidth = 1.5
        ctx.stroke()

        sweepAngleRef.current = -Math.PI / 2 + elapsed * 2.5
        if (sweepAngleRef.current > -Math.PI / 2 + Math.PI * 4) sweepAngleRef.current = -Math.PI / 2
      } else if (!sweepAngleRef.current) {
        // Final settled state — show a dot at the risk angle
        const dotX = CX + Math.cos(riskAngle) * R * 0.65
        const dotY = CX + Math.sin(riskAngle) * R * 0.65
        ctx.beginPath()
        ctx.arc(dotX, dotY, 4, 0, Math.PI * 2)
        ctx.fillStyle = prob > 0.5 ? '#ff4757' : '#00d4aa'
        ctx.fill()
      }

      if (t < 1) {
        animRef.current = requestAnimationFrame(draw)
      }
    }

    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [probability, threshold])

  return (
    <div className="radar-container">
      <canvas ref={canvasRef} className="radar-canvas" />
      <div className="radar-readout">
        <div className="radar-prob">
          <span className="radar-prob-value">{(probability ?? 0).toFixed(2)}</span>
          <span className="radar-prob-label">P(fraud)</span>
        </div>
        <div className="radar-threshold">
          <span className="radar-thresh-val">{threshold.toFixed(2)}</span>
          <span className="radar-thresh-label">threshold</span>
        </div>
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={threshold}
        onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
        className="radar-threshold-slider"
      />
    </div>
  )
}

/* ── Form Constants ── */
const DEFAULTS = {
  device_type: 'Desktop',
  browser: 'Chrome',
  operating_system: 'Windows',
  ad_position: 'Top',
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

const CATEGORICAL = {
  device_type:          ['Desktop', 'Mobile', 'Tablet'],
  browser:              ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'],
  operating_system:     ['Windows', 'macOS', 'Linux', 'Android', 'iOS'],
  ad_position:          ['Top', 'Bottom', 'Side'],
  device_ip_reputation: ['Good', 'Suspicious', 'Poor'],
}

const NUMERICAL = [
  { key: 'click_duration',       label: 'Click Duration (s)', min: 0, max: 30, step: 0.1 },
  { key: 'scroll_depth',         label: 'Scroll Depth (%)',   min: 0, max: 100, step: 1 },
  { key: 'mouse_movement',       label: 'Mouse Movement',     min: 0, max: 1000, step: 1 },
  { key: 'keystrokes_detected',  label: 'Keystrokes',         min: 0, max: 100, step: 1 },
  { key: 'click_frequency',      label: 'Click Frequency',    min: 0, max: 50,  step: 1 },
  { key: 'time_since_last_click',label: 'Time Since Last (s)',min: 0, max: 1000,step: 1 },
  { key: 'bot_likelihood_score', label: 'Bot Likelihood',     min: 0, max: 1,   step: 0.01 },
]

/* ── Main Component ── */
export default function Predict() {
  const [model, setModel] = useState('meta_learner')
  const [threshold, setThreshold] = useState(0.35)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(DEFAULTS)

  const set = (key, raw) => {
    const isNum = NUMERICAL.find(n => n.key === key)
    setForm(prev => ({ ...prev, [key]: isNum ? parseFloat(raw) || 0 : raw }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const payload = {
        ...form,
        VPN_usage: form.VPN_usage ? 1 : 0,
        proxy_usage: form.proxy_usage ? 1 : 0,
      }
      const res = await predictSingle(payload, model, threshold)
      setResult(res)
    } catch (err) {
      setError(err.message || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const fillSuspicious = () => setForm({
    device_type: 'Desktop', browser: 'Firefox', operating_system: 'Windows',
    ad_position: 'Bottom', device_ip_reputation: 'Suspicious',
    click_duration: 0.1, scroll_depth: 5, mouse_movement: 10,
    keystrokes_detected: 0, click_frequency: 15, time_since_last_click: 5,
    bot_likelihood_score: 0.95, VPN_usage: true, proxy_usage: true,
    timestamp: '2024-08-23 02:15:00',
  })

  const fillLegitimate = () => setForm({
    device_type: 'Mobile', browser: 'Chrome', operating_system: 'Android',
    ad_position: 'Top', device_ip_reputation: 'Good',
    click_duration: 2.5, scroll_depth: 60, mouse_movement: 300,
    keystrokes_detected: 15, click_frequency: 3, time_since_last_click: 200,
    bot_likelihood_score: 0.1, VPN_usage: false, proxy_usage: false,
    timestamp: '2024-08-23 14:30:00',
  })

  const isFraud = result?.prediction === 'fraudulent'
  const threatLevel = result
    ? (result.fraud_probability >= 0.7 ? 'CRITICAL'
      : result.fraud_probability >= 0.35 ? 'ELEVATED'
      : 'CLEAR')
    : 'CLEAR'

  return (
    <div className="page-predict">
      {/* Header */}
      <header className="predict-header">
        <div className="predict-header-left">
          <div className="predict-badge">
            <Radar size={12} />
            LIVE SCAN
          </div>
          <h1 className="page-title">Click Analysis</h1>
          <p className="subtitle">Score a single ad click against the meta-learner ensemble</p>
        </div>
        <div className="predict-header-right">
          <div className="stat-card primary">
            <span className="stat-card-value">4</span>
            <span className="stat-card-label">models active</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-value mono">{threshold.toFixed(2)}</span>
            <span className="stat-card-label">threshold</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Radar | Form */}
      <div className="predict-grid">

        {/* Left: Radar Meter */}
        <section className="radar-section">
          <div className="radar-card">
            <div className="radar-card-header">
              <span className="radar-card-title">Risk Assessment</span>
              {result && (
                <span className={`threat-pill threat-${threatLevel.toLowerCase()}`}>
                  {threatLevel}
                </span>
              )}
            </div>

            <RadarMeter
              probability={result?.fraud_probability}
              threshold={threshold}
              onThresholdChange={setThreshold}
            />

            {result && (
              <div className="radar-verdict">
                {isFraud ? (
                  <div className="verdict-fraud">
                    <ShieldAlert size={20} />
                    <span>FRAUD DETECTED</span>
                  </div>
                ) : (
                  <div className="verdict-legit">
                    <ShieldCheck size={20} />
                    <span>LEGITIMATE</span>
                  </div>
                )}
                <div className="verdict-detail">
                  <span>Confidence: <strong>{(result.confidence * 100).toFixed(1)}%</strong></span>
                  <span>Model: <strong>meta_learner</strong></span>
                </div>
              </div>
            )}

            {error && (
              <div className="verdict-error">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div className="radar-presets">
            <button className="preset-btn preset-fraud" onClick={fillSuspicious} type="button">
              <Zap size={14} />
              Load Suspicious
            </button>
            <button className="preset-btn preset-legit" onClick={fillLegitimate} type="button">
              <ShieldCheck size={14} />
              Load Legitimate
            </button>
          </div>
        </section>

        {/* Right: Input Form */}
        <section className="form-section">
          <form onSubmit={handleSubmit} className="predict-form">

            {/* Categorical inputs */}
            <div className="form-group">
              <h3>Context Signals</h3>
              <div className="form-row">
                {Object.entries(CATEGORICAL).map(([key, opts]) => (
                  <div key={key} className="form-field">
                    <label htmlFor={`predict-${key}`}>{key.replace(/_/g, ' ')}</label>
                    <select
                      id={`predict-${key}`}
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                    >
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Numerical inputs */}
            <div className="form-group">
              <h3>Behavioral Metrics</h3>
              <div className="form-row">
                {NUMERICAL.map(n => (
                  <div key={n.key} className="form-field">
                    <label htmlFor={`predict-${n.key}`}>{n.label}</label>
                    <input
                      id={`predict-${n.key}`}
                      type="number"
                      min={n.min}
                      max={n.max}
                      step={n.step}
                      value={form[n.key]}
                      onChange={(e) => set(n.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Binary flags */}
            <div className="form-group">
              <h3>Network Indicators</h3>
              <div className="form-row form-toggles">
                <label className="toggle-item">
                  <input
                    type="checkbox"
                    checked={form.VPN_usage}
                    onChange={(e) => set('VPN_usage', e.target.checked)}
                  />
                  <span>VPN Usage</span>
                </label>
                <label className="toggle-item">
                  <input
                    type="checkbox"
                    checked={form.proxy_usage}
                    onChange={(e) => set('proxy_usage', e.target.checked)}
                  />
                  <span>Proxy Usage</span>
                </label>
              </div>
            </div>

            {/* Timestamp */}
            <div className="form-group">
              <div className="form-field full-width">
                <label htmlFor="predict-timestamp">Timestamp</label>
                <input
                  id="predict-timestamp"
                  type="text"
                  value={form.timestamp}
                  onChange={(e) => set('timestamp', e.target.value)}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-scan">
                {loading ? (
                  <>
                    <span className="spinner" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Radar size={16} />
                    Run Scan
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

      </div>

      {/* Analysis: Contributing Factors */}
      {result && (
        <section className="analysis-section">
          <div className="analysis-card">
            <h2>Contributing Factors</h2>
            <p className="text-dim text-sm mb-2">
              Top signals driving the verdict. The meta-learner weights base-model probabilities and binary decisions independently.
            </p>
            <div className="factors-grid">
              <div className="factor-block">
                <h4>High Bot Likelihood</h4>
                <span className="factor-value">{(form.bot_likelihood_score * 100).toFixed(0)}%</span>
                <span className={`factor-tag ${form.bot_likelihood_score > 0.7 ? 'tag fraud' : 'tag legit'}`}>
                  {form.bot_likelihood_score > 0.7 ? 'strong signal' : 'mild signal'}
                </span>
              </div>
              <div className="factor-block">
                <h4>Click Duration</h4>
                <span className="factor-value">{form.click_duration.toFixed(1)}s</span>
                <span className={`factor-tag ${form.click_duration < 0.5 ? 'tag fraud' : 'tag legit'}`}>
                  {form.click_duration < 0.5 ? 'suspicious' : 'normal'}
                </span>
              </div>
              <div className="factor-block">
                <h4>Click Frequency</h4>
                <span className="factor-value">{form.click_frequency}</span>
                <span className={`factor-tag ${form.click_frequency > 10 ? 'tag warn' : 'tag legit'}`}>
                  {form.click_frequency > 10 ? 'burst' : 'normal'}
                </span>
              </div>
              <div className="factor-block">
                <h4>Mouse Movement</h4>
                <span className="factor-value">{form.mouse_movement}</span>
                <span className={`factor-tag ${form.mouse_movement < 50 ? 'tag fraud' : 'tag legit'}`}>
                  {form.mouse_movement < 50 ? 'automated' : 'human'}
                </span>
              </div>
              <div className="factor-block">
                <h4>IP Reputation</h4>
                <span className="factor-value">{form.device_ip_reputation}</span>
                <span className={`factor-tag ${form.device_ip_reputation === 'Poor' || form.device_ip_reputation === 'Suspicious' ? 'tag fraud' : 'tag legit'}`}>
                  {form.device_ip_reputation === 'Poor' || form.device_ip_reputation === 'Suspicious' ? 'high risk' : 'trusted'}
                </span>
              </div>
              <div className="factor-block">
                <h4>VPN / Proxy</h4>
                <span className="factor-value">{form.VPN_usage || form.proxy_usage ? 'enabled' : 'disabled'}</span>
                <span className={`factor-tag ${form.VPN_usage || form.proxy_usage ? 'tag warn' : 'tag legit'}`}>
                  {form.VPN_usage || form.proxy_usage ? 'elevated' : 'clean'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
