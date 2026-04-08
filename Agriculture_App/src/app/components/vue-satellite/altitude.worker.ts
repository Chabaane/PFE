/// <reference lib="webworker" />

addEventListener('message', async ({ data }) => {

  const { points } = data;

  const BATCH = 50;
  const API_DELAY_MS = 700;

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  let lastCall = 0;

  const results: any[] = [];

  for (let i = 0; i < points.length; i += BATCH) {

    const batch = points.slice(i, i + BATCH);

    const now = Date.now();
    const wait = API_DELAY_MS - (now - lastCall);
    if (wait > 0) await sleep(wait);

    try {
      const lats = batch.map((p: any) => p.lat).join(',');
      const lngs = batch.map((p: any) => p.lng).join(',');

      const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`;

      const res = await fetch(url);
      const data = await res.json();

      lastCall = Date.now();

      batch.forEach((p: any, idx: number) => {
        results.push({
          lat: p.lat,
          lng: p.lng,
          altitude: data.elevation?.[idx] ?? 0
        });
      });

    } catch (e) {
      // fallback simple
      batch.forEach((p: any) => {
        results.push({ lat: p.lat, lng: p.lng, altitude: 0 });
      });
    }
  }

  postMessage(results);
});
