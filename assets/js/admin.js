(function () {
  const $ = (id) => document.getElementById(id);
  let editingId = null;
  let currentImage = "";
  let allPosts = [];
  let activeFilter = "all";

  async function api(path, method = "GET", body) {
    const opt = { method, credentials: "same-origin", headers: {} };
    if (method !== "GET") opt.headers["Content-Type"] = "application/json";
    if (body !== undefined) opt.body = JSON.stringify(body);
    let r;
    try { r = await fetch(path, opt); }
    catch (_) {
      const local = location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
      throw new Error(local
        ? "The PHP admin API is not reachable. Start Apache in XAMPP, then open this site through http://localhost/SupportDirectly/admin.html"
        : "Can't reach the admin server. Please try again shortly.");
    }
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || "Request failed"), { status: r.status });
    return data;
  }

  const say = (id, msg, ok) => {
    const n = $(id);
    n.textContent = msg;
    n.className = "story-status " + (ok ? "ok" : "err");
  };

  const toLocalInput = (iso) => {
    const d = iso ? new Date(iso) : new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  function showLogin() {
    $("panel").hidden = true;
    $("login-view").hidden = false;
    const help = $("local-help");
    if (help) help.hidden = !(location.protocol === "file:" || location.hostname === "localhost" || location.hostname === "127.0.0.1");
  }
  function showPanel() { $("login-view").hidden = true; $("panel").hidden = false; resetForm(); loadList(); }

  async function init() {
    try {
      const s = await api("api.php?action=session");
      if (s.needsSetup) {
        showLogin();
        say("login-msg", "First-time setup required. Open setup-admin.php and create your admin password.", false);
      } else {
        s.admin ? showPanel() : showLogin();
      }
    } catch (e) {
      showLogin();
      say("login-msg", e.message, false);
    }
  }

  $("login-btn").onclick = async () => {
    try {
      await api("api.php?action=login", "POST", { password: $("pw").value });
      $("pw").value = "";
      say("login-msg", "", true);
      showPanel();
    } catch (e) { say("login-msg", e.message, false); }
  };
  $("pw").addEventListener("keydown", (e) => e.key === "Enter" && $("login-btn").click());
  $("logout-btn").onclick = async () => { await api("api.php?action=logout", "POST", {}).catch(() => {}); showLogin(); };

  function updateSaveLabel() {
    const draft = $("f-status-select").value === "draft";
    $("f-save").textContent = editingId ? (draft ? "Save draft" : "Save & publish") : (draft ? "Save draft" : "Publish post");
  }
  $("f-status-select").addEventListener("change", updateSaveLabel);

  function resetForm() {
    $("post-form").reset();
    $("f-date").value = toLocalInput();
    $("f-author").value = "Give-Directly Team";
    $("f-category").value = "Community Stories";
    $("f-status-select").value = "published";
    editingId = null;
    currentImage = "";
    $("ed-title").textContent = "Create a blog post";
    $("f-cancel").hidden = true;
    $("f-current").hidden = true;
    say("f-status", "", true);
    updateSaveLabel();
  }
  $("f-cancel").onclick = resetForm;

  function showCurrentImage() {
    const n = $("f-current");
    n.hidden = !currentImage;
    n.textContent = "";
    if (!currentImage) return;
    n.append("Current featured image: " + currentImage + " ");
    const b = document.createElement("button");
    b.type = "button"; b.className = "story-del"; b.textContent = "Remove image";
    b.onclick = () => { currentImage = ""; showCurrentImage(); };
    n.appendChild(b);
  }

  const readFile = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Couldn't read that file."));
    r.readAsDataURL(file);
  });

  function collectPost() {
    return {
      title: $("f-title").value,
      excerpt: $("f-excerpt").value,
      author: $("f-author").value,
      category: $("f-category").value,
      location: $("f-location").value,
      date: new Date($("f-date").value).toISOString(),
      image: currentImage,
      body: $("f-body").value,
      status: $("f-status-select").value,
      consent: $("f-consent").checked || !!editingId,
    };
  }

  $("f-save").onclick = async () => {
    const form = $("post-form");
    if (!form.reportValidity()) return;
    if (!editingId && !$("f-consent").checked) return say("f-status", "Please confirm consent before saving this post.", false);
    $("f-save").disabled = true;
    try {
      let image = currentImage;
      const file = $("f-file").files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB.");
        image = (await api("api.php?action=upload", "POST", { dataUrl: await readFile(file) })).path;
      }
      const post = collectPost();
      post.image = image;
      if (editingId) await api("api.php?action=update_story&id=" + encodeURIComponent(editingId), "POST", post);
      else await api("api.php?action=create_story", "POST", post);
      const wasDraft = post.status === "draft";
      resetForm();
      say("f-status", wasDraft ? "Draft saved." : "Saved. The post is published or scheduled for its publication date.", true);
      loadList();
    } catch (e) {
      if (e.status === 401) return showLogin();
      say("f-status", e.message, false);
    } finally { $("f-save").disabled = false; }
  };

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  }

  function previewHtml(p) {
    const body = String(p.body || "").split(/\n{2,}/).map(x => x.trim()).filter(Boolean).map(x => `<p>${escapeHtml(x).replace(/\n/g,"<br>")}</p>`).join("");
    return `<div class="blog-detail-head"><p class="eyebrow">${escapeHtml(p.category || "Stories")}</p><h1 id="preview-title">${escapeHtml(p.title || "Untitled post")}</h1><div class="blog-meta"><span>${escapeHtml(p.author || "Give-Directly Team")}</span><span>${new Date(p.date).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"})}</span>${p.location ? `<span>${escapeHtml(p.location)}</span>` : ""}</div><p class="blog-lead">${escapeHtml(p.excerpt || "")}</p></div>${p.image ? `<img class="blog-hero-img" src="${escapeHtml(p.image)}" alt="">` : ""}<div class="blog-article-body">${body}</div>`;
  }

  $("f-preview").onclick = async () => {
    if (!$("f-title").value.trim() || !$("f-body").value.trim()) return say("f-status", "Add a title and article text before previewing.", false);
    let image = currentImage;
    const file = $("f-file").files[0];
    if (file) image = await readFile(file);
    const p = collectPost(); p.image = image;
    $("preview-content").innerHTML = previewHtml(p);
    $("preview-modal").hidden = false;
    document.body.classList.add("modal-open");
  };
  const closePreview = () => { $("preview-modal").hidden = true; document.body.classList.remove("modal-open"); };
  $("preview-close").onclick = closePreview;
  $("preview-modal").addEventListener("click", (e) => { if (e.target === $("preview-modal")) closePreview(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("preview-modal").hidden) closePreview(); });

  function startEdit(p) {
    editingId = p.id;
    currentImage = p.image || "";
    $("f-title").value = p.title || "";
    $("f-excerpt").value = p.excerpt || p.update || "";
    $("f-author").value = p.author || "Give-Directly Team";
    $("f-category").value = p.category || "Community Stories";
    $("f-date").value = toLocalInput(p.date);
    $("f-status-select").value = p.status || "published";
    $("f-location").value = p.location || "";
    $("f-body").value = p.body || "";
    $("f-file").value = "";
    $("ed-title").textContent = "Edit blog post";
    $("f-cancel").hidden = false;
    showCurrentImage();
    say("f-status", "", true);
    updateSaveLabel();
    $("ed-title").scrollIntoView({ behavior: "smooth" });
  }

  function badgeFor(p) {
    if ((p.status || "published") === "draft") return ["Draft", "draft"];
    if (new Date(p.date) > new Date()) return ["Scheduled", "scheduled"];
    return ["Published", "published"];
  }

  function stateFor(p) {
    if ((p.status || "published") === "draft") return "draft";
    if (new Date(p.date) > new Date()) return "scheduled";
    return "published";
  }

  function updateStats(posts) {
    const counts = { published: 0, draft: 0, scheduled: 0 };
    posts.forEach((p) => { counts[stateFor(p)]++; });
    $("stat-published").textContent = counts.published;
    $("stat-drafts").textContent = counts.draft;
    $("stat-scheduled").textContent = counts.scheduled;
    $("stat-total").textContent = posts.length;
  }

  function filteredPosts() {
    const q = String($("post-search")?.value || "").trim().toLowerCase();
    return allPosts.filter((p) => {
      if (activeFilter !== "all" && stateFor(p) !== activeFilter) return false;
      if (!q) return true;
      return [p.title, p.excerpt || p.update, p.author, p.category, p.location]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }

  function renderList() {
    const box = $("admin-list");
    box.textContent = "";
    const posts = filteredPosts();
    if (!posts.length) {
      const p = document.createElement("p");
      p.className = "admin-empty";
      p.textContent = allPosts.length ? "No posts match this filter." : "No blog posts yet.";
      box.appendChild(p);
      return;
    }
    posts.forEach((p) => {
      const row = document.createElement("div"); row.className = "admin-row blog-admin-row";
      const info = document.createElement("div"); info.className = "blog-admin-info";
      const top = document.createElement("div"); top.className = "blog-admin-titleline";
      const t = document.createElement("strong"); t.textContent = p.title;
      const [label, cls] = badgeFor(p);
      const badge = document.createElement("span"); badge.className = "post-status-badge " + cls; badge.textContent = label;
      top.append(t, badge);
      const m = document.createElement("span"); m.textContent = `${p.category || "Stories"} · ${new Date(p.date).toLocaleString()}`;
      const ex = document.createElement("p"); ex.className = "admin-excerpt"; ex.textContent = p.excerpt || p.update || "";
      info.append(top, m, ex);

      const actions = document.createElement("div"); actions.className = "admin-row-actions";
      if ((p.status || "published") === "published" && new Date(p.date) <= new Date()) {
        const view = document.createElement("a"); view.className = "story-more"; view.href = "story.html?id=" + encodeURIComponent(p.id); view.target = "_blank"; view.rel = "noopener"; view.textContent = "View"; actions.append(view);
      }
      const edit = document.createElement("button"); edit.type = "button"; edit.className = "story-more"; edit.textContent = "Edit"; edit.onclick = () => startEdit(p);
      const del = document.createElement("button"); del.type = "button"; del.className = "story-del"; del.textContent = "Delete";
      del.onclick = async () => {
        if (!confirm("Delete “" + p.title + "”? This can't be undone.")) return;
        try {
          await api("api.php?action=delete_story&id=" + encodeURIComponent(p.id), "POST", {});
          if (editingId === p.id) resetForm();
          await loadList();
        } catch (e) { if (e.status === 401) showLogin(); else say("f-status", e.message, false); }
      };
      actions.append(edit, del);
      row.append(info, actions); box.appendChild(row);
    });
  }

  async function loadList() {
    const box = $("admin-list");
    box.textContent = "Loading posts…";
    try {
      allPosts = await api("api.php?action=admin_stories");
      updateStats(allPosts);
      renderList();
    } catch (e) {
      if (e.status === 401) return showLogin();
      box.textContent = e.message;
    }
  }

  $("post-search")?.addEventListener("input", renderList);
  document.querySelectorAll(".admin-filter").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter || "all";
      document.querySelectorAll(".admin-filter").forEach((x) => x.classList.toggle("is-active", x === btn));
      renderList();
    });
  });

  init();
})();
