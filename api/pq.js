export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { id, name, mode } = req.query;
  if (!id) return res.status(400).send('Missing file id');

  const safeName = (name || 'past-questions').toString().replace(/[^a-z0-9.\-_]/gi, '_');

  try {
    let driveRes = await fetch(`https://drive.google.com/uc?export=download&id=${id}`);
    let buffer = Buffer.from(await driveRes.arrayBuffer());
    const contentType = driveRes.headers.get('content-type') || '';

    // Large files Google can't virus-scan show an HTML confirmation page instead
    // of the file itself — extract the confirm token and retry once.
    if (contentType.includes('text/html')) {
      const html = buffer.toString('utf8');
      const match = html.match(/confirm=([0-9A-Za-z_]+)/);
      const cookie = driveRes.headers.get('set-cookie') || '';
      if (match) {
        driveRes = await fetch(`https://drive.google.com/uc?export=download&confirm=${match[1]}&id=${id}`, {
          headers: cookie ? { Cookie: cookie } : {}
        });
        buffer = Buffer.from(await driveRes.arrayBuffer());
      }
    }

    if (!driveRes.ok) return res.status(502).send('Could not fetch file from Drive');

    const disposition = mode === 'view' ? 'inline' : 'attachment';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}.pdf"`);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    res.status(200).send(buffer);
  } catch (e) {
    res.status(500).send('Error fetching file');
  }
}
