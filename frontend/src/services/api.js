const API_BASE = '/api';
const REQUEST_TIMEOUT_MS = 15000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      signal: controller.signal,
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw { status: res.status, ...data };
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw { status: 0, message: `Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s` };
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Health ----
export const getHealth = () => request('/health');
export const getReadiness = () => request('/health/ready');

// ---- Prediction ----
export const predictSingle = (clickData, model = 'meta_learner', threshold = null) => {
  const params = new URLSearchParams({ model });
  if (threshold !== null) params.append('threshold', threshold);
  return request(`/predict?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify(clickData),
  });
};

export const predictAllModels = (clickData, threshold = null) => {
  const params = new URLSearchParams({});
  if (threshold !== null) params.append('threshold', threshold);
  return request(`/predict/all-models?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify(clickData),
  });
};

export const predictBatch = (clicks, model = 'meta_learner', threshold = null) => {
  const params = new URLSearchParams({ model });
  if (threshold !== null) params.append('threshold', threshold);
  return request(`/predict/batch?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify({ clicks }),
  });
};

// ---- Models ----
export const getModels = () => request('/models');
export const getMetrics = () => request('/models/metrics');
export const getFeatures = () => request('/models/features');

// ---- Analytics ----
export const getRiskScore = (clickData, threshold = 50) =>
  request(`/analytics/risk-score?threshold=${threshold}`, {
    method: 'POST',
    body: JSON.stringify(clickData),
  });

export const getDatasetStats = () => request('/analytics/dataset/stats');
