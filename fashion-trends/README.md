# Fashion Trends (Static JSON for GitHub Pages)

Fashion trend data is **generated every 6 hours** by GitHub Actions and served as static JSON. No server, no Express — 100% GitHub (Pages + Actions).

---

## Architecture

- **GitHub Actions** runs on a cron every 6 hours (`0 */6 * * *`).
- A **Node.js script** fetches Google Trends + Unsplash, computes scores, and writes `data/trends.json`.
- The workflow **commits** the updated file back to the repo.
- **GitHub Pages** serves the JSON over HTTPS.

**Public URL (after you enable Pages):**  
`https://madhavsapkota.github.io/FashionAIApi/fashion-trends/data/trends.json`

---

## What You Need To Do Next

### 1. Use this as its own repo (recommended)

If you want a **standalone repo** that only contains this project:

1. Create a **new empty repo** on GitHub (e.g. `fashion-trends`).
2. Copy the **contents** of this `fashion-trends` folder into the new repo root (so the repo root has `data/`, `scripts/`, `.github/`, `package.json`, `README.md`).
3. In the workflow file (`.github/workflows/update-trends.yml`):
   - Remove `working-directory: fashion-trends` from the "Install dependencies" and "Generate trends" steps.
   - Change `git add fashion-trends/data/trends.json` to `git add data/trends.json`.
4. Push to GitHub.

### 2. Add GitHub secret

1. Repo → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret**: name = `UNSPLASH_ACCESS_KEY`, value = your [Unsplash Access Key](https://unsplash.com/developers).

### 3. Enable GitHub Pages

1. Repo → **Settings** → **Pages**.
2. **Source**: Deploy from a **branch**.
3. **Branch**: `main` (or your default), folder **/ (root)**.
4. Save. Your JSON will be at:  
   `https://<username>.github.io/<repo>/data/trends.json`

### 4. Run the workflow once

- **Actions** → **Update trends** → **Run workflow**.  
- After it finishes, `data/trends.json` will be updated and the workflow will run automatically every 6 hours.

---

## JSON format

One file with **many fashion trends** (no country split). Data from Google Trends (US) + Unsplash images.

```json
{
  "generatedAt": "2025-01-27T12:00:00.000Z",
  "updateFrequency": "6 hours",
  "trends": [
    {
      "name": "linen summer dress",
      "score": 72,
      "averageInterest": 65.2,
      "trendSlope": 1.1,
      "images": ["https://..."],
      "whyTrending": "Strong search interest for \"linen summer dress\" on Google Trends this period.",
      "season": "summer"
    }
  ]
}
```

---

## Limitations

- **Read-only**: Clients only GET the JSON; no POST/PUT/DELETE.
- **Not real-time**: Data refreshes every 6 hours.
- **Optimized for** fashion trend cadence (hours/days), not live feeds.

---

## Local run (optional)

```bash
cd fashion-trends
npm install
UNSPLASH_ACCESS_KEY=your_key npm run generate
# Writes data/trends.json
```

---

## If this folder lives inside another repo (e.g. FashionAIApi)

Keep the workflow as-is (with `working-directory: fashion-trends` and `git add fashion-trends/data/trends.json`). Enable Pages from the **root** of that repo; the URL will be:

`https://<username>.github.io/FashionAIApi/fashion-trends/data/trends.json`

**This repo:** `https://madhavsapkota.github.io/FashionAIApi/fashion-trends/data/trends.json`
