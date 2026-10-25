# Deploying FraudGuard

FraudGuard is a two-part app: a Flask API (backend) and a React dashboard (frontend).
Both are static enough to deploy on free tiers. This guide covers the recommended
platforms, from easiest to most control.

---

## Recommended platforms (all free tiers)

| Platform | Best for | Free tier limits |
|----------|----------|-----------------|
| **Railway** | Easiest — one command, auto-deploys on push | 512 MB RAM, 5,000 build hours/month |
| **Render** | Zero-config, free HTTPS, background workers | 512 MB RAM, 750 free hours/month |
| **Fly.io** | Global edge deployment, closest to users | 256 MB shared VMs, ~$0-2/month |

Railway and Render are the simplest for this project. Fly.io is best if you want
the API to run close to your ad-network partners.

---

## Option 1: Railway (recommended)

Railway detects the `Procfile` and deploys automatically.

### Deploy the backend

```bash
# Install the Railway CLI
npm i -g @railway/cli

# Sign in and create a project
railway login
railway new

# Deploy
railway up
```

Railway reads `Procfile` and runs `gunicorn wsgi:app`. Set these environment
variables in the Railway dashboard:

- `FLASK_ENV=production`
- `DEFAULT_MODEL=meta_learner`

### Deploy the frontend

Railway can also host the static frontend. Build it locally and deploy the `dist/`
folder to [Netlify](https://netlify.com) (free tier, custom domain, global CDN):

```bash
cd frontend && npm run build
# Drag dist/ into Netlify, or:
netlify deploy --dir=dist --prod
```

---

## Option 2: Render

Render is zero-config. Push your repo, connect it, and Render detects the
`Dockerfile`.

1. Go to [render.com](https://render.com) and sign up.
2. Click "New Web Service" → connect your GitHub repo.
3. Render builds the `Dockerfile` and deploys. It assigns a free HTTPS URL.
4. Set environment variables in the Render dashboard:
   - `FLASK_ENV=production`
   - `DEFAULT_MODEL=meta_learner`

For the frontend, use Render's **Static Site** service pointing at the
`frontend/dist` directory after a build step.

---

## Option 3: Fly.io (global edge)

```bash
# Install the Fly CLI
curl -L https://fly.io/install.sh | sh
fly launch
```

Fly.io asks a few questions and generates `fly.toml`. It deploys the
`Dockerfile` to the nearest region. Free tier gives you 256 MB shared VMs.

---

## Pre-deploy checklist

Before deploying, make sure these are in order:

1. **Train the models** (if not already done):
   ```bash
   python scripts/preprocess_data.py
   python scripts/train_models.py
   python scripts/train_metalearner.py
   ```
   The trained `.joblib` files in `models/` are needed at runtime.

2. **Build the frontend**:
   ```bash
   cd frontend && npm run build
   ```

3. **Set environment variables** on your platform:
   - `FLASK_ENV=production` — disables debug mode
   - `DEFAULT_MODEL=meta_learner` — default model for predictions
   - `REDIS_URL` (optional) — enables distributed rate limiting

4. **Verify the health endpoint** after deploy:
   ```bash
   curl https://your-app.railway.app/api/health
   curl https://your-app.railway.app/api/health/ready
   ```

   `/api/health/ready` returns 200 only when all models are loaded.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  React SPA      │────▶│  Flask + Gunicorn │
│  (Netlify/      │     │  (Railway/       │
│   Render/Fly)   │     │   Render/Fly)     │
└─────────────────┘     └────────┬─────────┘
                                │
                        ┌───────┴───────┐
                        │  models/*.joblib│
                        │  dataset/       │
                        └────────────────┘
```

The frontend is a static site (no backend needed). The backend serves the API
and reads model files from disk. Both can run on the same platform or be split
across two.
