(function () {
  const root = document.getElementById("story-detail");
  if (!root) return;
  const id = new URLSearchParams(location.search).get("id");
  const fallback = typeof PUBLISHED_STORIES !== "undefined" ? PUBLISHED_STORIES : [];
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  function render(p) {
    if (!p) { root.innerHTML = "<h1>Story not found</h1><p>This story may have been removed or is not published yet.</p>"; document.title = "Story not found | Give-Directly"; return; }
    document.title = p.title + " | Give-Directly";
    root.textContent = "";
    const head = el("header", "blog-detail-head");
    head.appendChild(el("p", "eyebrow", p.category || "Stories"));
    head.appendChild(el("h1", null, p.title));
    const meta = el("div", "blog-meta"); meta.append(el("span", null, "By " + (p.author || "Give-Directly Team")), el("span", null, new Date(p.date).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"}))); if (p.location) meta.appendChild(el("span", null, p.location)); head.appendChild(meta);
    if (p.excerpt || p.update) head.appendChild(el("p", "blog-lead", p.excerpt || p.update));
    root.appendChild(head);
    if (p.image) { const img = el("img", "blog-hero-img"); img.src = p.image; img.alt = ""; img.onerror = () => img.remove(); root.appendChild(img); }
    const body = el("div", "blog-article-body");
    String(p.body || "").split(/\n{2,}/).map(x=>x.trim()).filter(Boolean).forEach(par => { const pp = el("p"); par.split("\n").forEach((line,i)=>{ if(i) pp.appendChild(document.createElement("br")); pp.append(document.createTextNode(line)); }); body.appendChild(pp); });
    root.appendChild(body);
  }

  async function load() {
    if (!id) return null;
    try { const r = await fetch("api.php?action=story&id=" + encodeURIComponent(id), { cache: "no-store" }); if (!r.ok) throw new Error(); return await r.json(); }
    catch (_) { return fallback.find(p => p.id === id && (p.status || "published") === "published") || null; }
  }
  load().then(render);
})();
