import { useState } from 'react'
import { ShieldAlert, ShieldCheck, Radar, Zap } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { predictSingle } from '../services/api'

/* ── Circular Gauge ─────────────────────────────────────────── */
function Gauge({ probability, threshold, onThresholdChange }) {
  const r = 90
  const cx = 120, cy = 120
  const stroke = 14
  const circumference = 2 * Math.PI * r
  const probFrac = probability ?? 0
  const dash = circumference * probFrac
  const thresholdAngle = threshold * 360
  const probAngle = probFrac * 360

  const color = probFrac >= 0.7 ? 'var(--danger)'
    : probFrac >= 0.35 ? 'var(--warn)'
    : 'var(--safe)'

  return (
    <div className="gauge-container">
      <svg width="240" height="240" viewBox="0 0 240 240">
        {/* Background track */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="var(--border)" strokeWidth={stroke} />
        {/* Threshold marker arc */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgba(255,181,40,0.3)" strokeWidth={stroke}
          strokeDasharray={`${circumference * threshold} ${circumference}`}
          transform={`rotate(-90 ${cx} ${cy})`} />
        {/* Risk arc */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.3s' }} />
        {/* Center text */}
        <text x={cx} y={cy - 8} textAnchor="middle"
          fontSize="42" fontWeight="800" fill="var(--fg)" fontFamily="var(--mono)">
          {(probFrac * 100).toFixed(0)}%
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle"
          fontSize="12" fill="var(--fg-muted)" letterSpacing="0.08em" textTransform="uppercase">
          P(fraud)
        </text>
        {/* Threshold label */}
        <text x={cx} y={cy + 38} textAnchor="middle"
          fontSize="11" fill="var(--fg-dim)">
          threshold: {(threshold * 100).toFixed(0)}%
        </text>
      </svg>
      <input
        type="range" min="0" max="1" step="0.01" value={threshold}
        onChange={e => onThresholdChange(parseFloat(e.target.value))}
        className="radar-threshold-slider"
      />
    </div>
  )
}

/* ── Form Constants ── */
const DEFAULTS = {
  device_type: 'Desktop', browser: 'Chrome', operating_system: 'Windows',
  ad_position: 'Top', device_ip_reputation: 'Good',
  click_duration: 1.5, scroll_depth: 45, mouse_movement: 200,
  keystrokes_detected: 10, click_frequency: 5, time_since_last_click: 120,
  bot_likelihood_score: 0.3, VPN_usage: false, proxy_usage: false,
  timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
}

const CATEGORICAL = {
  device_type: ['Desktop', 'Mobile', 'Tablet'],
  browser: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'],
  operating_system: ['Windows', 'macOS', 'Linux', 'Android', 'iOS'],
  ad_position: ['Top', 'Bottom', 'Side'],
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

export default function Predict() {
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
    setLoading(true); setError(null); setResult(null)
    try {
      const payload = { ...form, VPN_usage: form.VPN_usage ? 1 : 0, proxy_usage: form.proxy_usage ? 1 : 0 }
      const res = await predictSingle(payload, 'meta_learner', threshold)
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
      <Helmet>
        <title>Click Analysis | FraudGuard - Predict Fraud</title>
        <meta name="description" content="Analyze individual ad clicks in real-time using FraudGuard's stacked ensemble ML model." />
        <link rel="canonical" href="https://fraudguard.farazkiqbal.com/predict" />
        <meta property="og:title" content="Click Analysis | FraudGuard" />
        <meta property="og:description" content="Real-time click fraud prediction with visual risk assessment." />
        <meta property="og:url" content="https://fraudguard.farazkiqbal.com/predict" />
      </Helmet>

      <header className="predict-header">
        <div className="predict-header-left">
          <div className="predict-badge"><Radar size={12} /> LIVE SCAN</div>
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

      <div className="predict-grid">
        {/* Left: Gauge */}
        <section className="radar-section">
          <div className="radar-card">
            <div className="radar-card-header">
              <span className="radar-card-title">Risk Assessment</span>
              {result && (
                <span className={`threat-pill threat-${threatLevel.toLowerCase()}`}>{threatLevel}</span>
              )}
            </div>

            <Gauge
              probability={result?.fraud_probability}
              threshold={threshold}
              onThresholdChange={setThreshold}
            />

            {!result && (
              <div className="radar-verdict">
                <div style={{ textAlign: 'center', color: 'var(--fg-dim)', fontSize: 'var(--fs-sm)', padding: 'var(--s-2) 0' }}>
                  <p style={{ marginBottom: 'var(--s-1)' }}>Click "Run Scan" to assess risk</p>
                </div>
              </div>
            )}

            {result && (
              <div className="radar-verdict">
                {isFraud
                  ? <div className="verdict-fraud"><ShieldAlert size={20} /><span>FRAUD DETECTED</span></div>
                  : <div className="verdict-legit"><ShieldCheck size={20} /><span>LEGITIMATE</span></div>
                }
                <div className="verdict-detail">
                  <span>Confidence: <strong>{(result.confidence * 100).toFixed(1)}%</strong></span>
                  <span>Model: <strong>meta_learner</strong></span>
                </div>
              </div>
            )}

            {error && (
              <div className="verdict-error"><ShieldAlert size={16} /><span>{error}</span></div>
            )}
          </div>

          <div className="radar-presets">
            <button className="preset-btn preset-fraud" onClick={fillSuspicious} type="button">
              <Zap size={14} /> Load Suspicious
            </button>
            <button className="preset-btn preset-legit" onClick={fillLegitimate} type="button">
              <ShieldCheck size={14} /> Load Legitimate
            </button>
          </div>
        </section>

        {/* Right: Form */}
        <section className="form-section">
          <form onSubmit={handleSubmit} className="predict-form">
            <div className="form-group">
              <h3>Context Signals</h3>
              <div className="form-row">
                {Object.entries(CATEGORICAL).map(([key, opts]) => (
                  <div key={key} className="form-field">
                    <label htmlFor={`predict-${key}`}>{key.replace(/_/g, ' ')}</label>
                    <select id={`predict-${key}`} value={form[key]} onChange={(e) => set(key, e.target.value)}>
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <h3>Behavioral Metrics</h3>
              <div className="form-row">
                {NUMERICAL.map(n => (
                  <div key={n.key} className="form-field">
                    <label htmlFor={`predict-${n.key}`}>{n.label}</label>
                    <input id={`predict-${n.key}`} type="number" min={n.min} max={n.max} step={n.step}
                      value={form[n.key]} onChange={(e) => set(n.key, e.target.value)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <h3>Network Indicators</h3>
              <div className="form-row form-toggles">
                <label className="toggle-item">
                  <input type="checkbox" checked={form.VPN_usage} onChange={(e) => set('VPN_usage', e.target.checked)} />
                  <span>VPN Usage</span>
                </label>
                <label className="toggle-item">
                  <input type="checkbox" checked={form.proxy_usage} onChange={(e) => set('proxy_usage', e.target.checked)} />
                  <span>Proxy Usage</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <div className="form-field full-width">
                <label htmlFor="predict-timestamp">Timestamp</label>
                <input id="predict-timestamp" type="text" value={form.timestamp}
                  onChange={(e) => set('timestamp', e.target.value)} />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading} className="btn-scan">
                {loading ? <><span className="spinner" /> Scanning...</> : <><Radar size={16} /> Run Scan</>}
              </button>
            </div>
          </form>
        </section>
      </div>

      {result && (
        <section className="analysis-section">
          <div className="analysis-card">
            <h2>Contributing Factors</h2>
            <p className="text-dim text-sm mb-2">
              Top signals driving the verdict. The meta-learner weights base-model probabilities independently.
            </p>
            <div className="factors-grid">
              <div className="factor-block">
                <h4>Bot Likelihood</h4>
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
