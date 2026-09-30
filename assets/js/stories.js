/* Public blog index. Published posts only. */
(function () {
  const list = document.getElementById("story-list");
  const empty = document.getElementById("story-empty");
  if (!list) return;
  const fallback = typeof PUBLISHED_STORIES !== "undefined" ? PUBLISHED_STORIES : [];

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const prettyDate = (iso) => new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  function card(p) {
    const a = el("article", "blog-card");
    if (p.image) {
      const link = el("a", "blog-card-image-link"); link.href = "story.html?id=" + encodeURIComponent(p.id);
      const img = el("img", "blog-card-image"); img.src = p.image; img.alt = ""; img.loading = "lazy"; img.onerror = () => link.remove(); link.appendChild(img); a.appendChild(link);
    }
    const body = el("div", "blog-card-body");
    const meta = el("div", "blog-card-meta");
    meta.append(el("span", "blog-category", p.category || "Stories"), el("span", null, prettyDate(p.date)));
    body.appendChild(meta);
    const h = el("h2", "blog-card-title"); const hl = el("a", null, p.title); hl.href = "story.html?id=" + encodeURIComponent(p.id); h.appendChild(hl); body.appendChild(h);
    if (p.excerpt || p.update) body.appendChild(el("p", "blog-card-excerpt", p.excerpt || p.update));
    const by = el("p", "blog-card-byline", "By " + (p.author || "Give-Directly Team")); body.appendChild(by);
    const read = el("a", "blog-read-more", "Read full story →"); read.href = "story.html?id=" + encodeURIComponent(p.id); body.appendChild(read);
    a.appendChild(body); return a;
  }

  function render(posts) {
    list.textContent = "";
    const now = Date.now();
    const live = posts.filter(p => (p.status || "published") === "published" && new Date(p.date).getTime() <= now).sort((a,b) => new Date(b.date)-new Date(a.date));
    live.forEach(p => list.appendChild(card(p)));
    if (empty) empty.hidden = live.length > 0;
  }

  async function load() {
    try { const r = await fetch("api.php?action=stories", { cache: "no-store" }); if (!r.ok) throw new Error(); return await r.json(); }
    catch (_) { return fallback; }
  }
  load().then(render);
})();
