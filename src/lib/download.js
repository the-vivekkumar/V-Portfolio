// Saves a PDF from the site as a real file with the right name.
// The file is fetched first and checked: if the host answers with a web page instead of the PDF (a missing file, a
// redirect to the home page), that is never saved as "Resume.html". The page is told to show a notice instead.
const notice = (message, ms = 2400) => window.dispatchEvent(new CustomEvent('site:notice', { detail: { message, ms } }));

function candidates(file) {
  const list = [new URL(file, document.baseURI).href];
  // the site's root, found from where the app's own script lives, in case the page address differs from the root
  const script = [...document.scripts].find((s) => s.type === 'module' && s.src);
  if (script) list.push(new URL(`../${file}`, script.src).href);
  return [...new Set(list)];
}

export async function saveDocument(file, name = file) {
  for (const url of candidates(file)) {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) continue;
      const blob = await res.blob();
      if ((await blob.slice(0, 5).text()) !== '%PDF-') continue;
      const href = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = href; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 15000);
      notice(`Saving ${name}`);
      return true;
    } catch { /* try the next address */ }
  }
  notice('The file could not be downloaded. Please try again, or email me and I will send it.', 5200);
  return false;
}
