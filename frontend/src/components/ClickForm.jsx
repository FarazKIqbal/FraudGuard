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

import { useEffect, useState } from 'react'

export default function ClickForm({ onSubmit, loading, initialData }) {
  const [form, setForm] = useState(initialData || DEFAULTS)

  useEffect(() => {
    if (initialData) setForm(initialData)
  }, [initialData])

  const set = (key, raw) => {
    let val = raw
    if (NUMERICAL.find(n => n.key === key)) val = parseFloat(raw) || 0
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      VPN_usage:   form.VPN_usage ? 1 : 0,
      proxy_usage: form.proxy_usage ? 1 : 0,
    }
    onSubmit(payload)
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

  return (
    <form onSubmit={handleSubmit}>
      {/* Categorical */}
      <div className="form-grid">
        {Object.entries(CATEGORICAL).map(([key, opts]) => (
          <div className="field" key={key}>
            <label>{key.replace(/_/g, ' ')}</label>
            <select value={form[key]} onChange={e => set(key, e.target.value)}>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}

        {/* Numerical */}
        {NUMERICAL.map(n => (
          <div className="field" key={n.key}>
            <label>{n.label}</label>
            <input
              type="number" min={n.min} max={n.max} step={n.step}
              value={form[n.key]}
              onChange={e => set(n.key, e.target.value)}
            />
          </div>
        ))}

        <div className="field">
          <label>Timestamp</label>
          <input
            type="text" value={form.timestamp}
            onChange={e => set('timestamp', e.target.value)}
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="toggle-row mt-1">
        <label>
          <input type="checkbox" checked={form.VPN_usage}
                 onChange={e => set('VPN_usage', e.target.checked)} />
          VPN Usage
        </label>
        <label>
          <input type="checkbox" checked={form.proxy_usage}
                 onChange={e => set('proxy_usage', e.target.checked)} />
          Proxy Usage
        </label>
      </div>

      {/* Buttons */}
      <div className="btn-group">
        <button className="btn btn-primary" disabled={loading} type="submit">
          {loading ? <><span className="spinner" /> Analysing...</> : 'Analyse Click'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={fillSuspicious}>
          Fill Suspicious
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={fillLegitimate}>
          Fill Legitimate
        </button>
      </div>
    </form>
  )
}
