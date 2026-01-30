/**
 * Unsplash Search API: fetch real image URLs for fashion keywords.
 * No OAuth; uses Access Key only (server-side, Play Store safe).
 */

async function fetchImagesForKeyword(keyword, count = 4, accessKey) {
  if (!accessKey || accessKey === 'your_unsplash_access_key_here') {
    throw new Error('UNSPLASH_ACCESS_KEY is required. Set it in .env');
  }

  const query = encodeURIComponent(keyword);
  const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=${Math.min(count, 10)}&client_id=${accessKey}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Unsplash API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const results = data.results || [];
  const urls = results
    .slice(0, count)
    .map((p) => p.urls?.regular || p.urls?.small || p.urls?.thumb)
    .filter(Boolean);

  return urls;
}

module.exports = {
  fetchImagesForKeyword,
};
