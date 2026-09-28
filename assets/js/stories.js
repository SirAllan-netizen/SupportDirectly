/* Public Stories page — READ ONLY. Posts are created in admin.html. */
(function () {
  const list = document.getElementById("story-list");
  if (!list) return;

  const fallback = typeof PUBLISHED_STORIES !== "undefined" ? PUBLISHED_STORIES : [];
  const demoOn = !!(window.DEMO && window.DEMO.enabled && window.DEMO.stories);
  const samples = demoOn
    ? window.DEMO.stories.map((s, i) => ({
        id: "sample-" + i,
        title: s.title,
        update: s.update,
        body: s.body,
        date: new Date(Date.now() - s.hoursAgo * 3600 * 1000).toISOString(),
        sample: true,
      }))
    : [];

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  function timeAgo(iso) {
    const t = new Date(iso).getTime();
    if (isNaN(t)) return "";
    const s = Math.max(0, (Date.now() - t) / 1000);
    const u = (n, w) => `${n} ${w}${n === 1 ? "" : "s"} ago`;
    if (s < 60) return "just now";
    if (s < 3600) return u(Math.floor(s / 60), "minute");
    if (s < 86400) return u(Math.floor(s / 3600), "hour");
    if (s < 2592000) return u(Math.floor(s / 86400), "day");
    if (s < 31536000) return u(Math.floor(s / 2592000), "month");
    return u(Math.floor(s / 31536000), "year");
  }

  const CLOCK =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function item(s) {
    const a = el("article", "feed-item");
    const head = el("div", "feed-head");
    head.appendChild(el("h3", null, s.title));
    const time = el("span", "feed-time");
    time.innerHTML = CLOCK;
    const label = el("time", null, timeAgo(s.date));
    label.dateTime = s.date;
    label.dataset.iso = s.date;
    time.appendChild(label);
    head.appendChild(time);
    a.appendChild(head);

    if (s.update) a.appendChild(el("p", "feed-update", s.update));
    if (s.location) a.appendChild(el("p", "feed-loc", s.location));
    if (s.image) {
      const img = el("img", "feed-img");
      img.src = s.image;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = () => img.remove();
      a.appendChild(img);
    }
    const q = el("blockquote", "feed-quote");
    String(s.body || "")
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p) => q.appendChild(el("p", null, p)));
    a.appendChild(q);
    return a;
  }

  function render(posts) {
    list.textContent = "";
    const all = [...posts, ...samples].sort((a, b) => new Date(b.date) - new Date(a.date));
    all.forEach((s) => list.appendChild(item(s)));
    const empty = document.querySelector(".empty");
    if (empty) empty.hidden = all.length > 0;
  }

  async function load() {
    try {
      const r = await fetch("/api/stories", { cache: "no-store" });
      if (!r.ok) throw new Error("no api");
      return await r.json();
    } catch (e) {
      return fallback; // opened without the server
    }
  }

  load().then(render);
  setInterval(() => {
    document.querySelectorAll("time[data-iso]").forEach((t) => (t.textContent = timeAgo(t.dataset.iso)));
  }, 60000);
})();
