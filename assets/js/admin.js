(function () {
  const $ = (id) => document.getElementById(id);
  let editingId = null;
  let currentImage = "";

  async function api(path, method = "GET", body) {
    const opt = { method, credentials: "same-origin", headers: {} };
    if (method !== "GET") opt.headers["Content-Type"] = "application/json";
    if (body !== undefined) opt.body = JSON.stringify(body);
    let r;
    try {
      r = await fetch(path, opt);
    } catch (e) {
      throw new Error("Can't reach the server. Start it with: node server.js");
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
  }
  function showPanel() {
    $("login-view").hidden = true;
    $("panel").hidden = false;
    resetForm();
    loadList();
  }

  async function init() {
    try {
      const s = await api("/api/admin/session");
      s.admin ? showPanel() : showLogin();
    } catch (e) {
      $("login-view").hidden = false;
      say("login-msg", e.message, false);
    }
  }

  $("login-btn").onclick = async () => {
    try {
      await api("/api/admin/login", "POST", { password: $("pw").value });
      $("pw").value = "";
      say("login-msg", "", true);
      showPanel();
    } catch (e) {
      say("login-msg", e.message, false);
    }
  };
  $("pw").addEventListener("keydown", (e) => e.key === "Enter" && $("login-btn").click());
  $("logout-btn").onclick = async () => {
    await api("/api/admin/logout", "POST", {}).catch(() => {});
    showLogin();
  };

  function resetForm() {
    $("post-form").reset();
    $("f-date").value = toLocalInput();
    editingId = null;
    currentImage = "";
    $("ed-title").textContent = "Add a post";
    $("f-save").textContent = "Publish post";
    $("f-cancel").hidden = true;
    $("f-current").hidden = true;
    say("f-status", "", true);
  }
  $("f-cancel").onclick = resetForm;

  function showCurrentImage() {
    const n = $("f-current");
    n.hidden = !currentImage;
    n.textContent = "";
    if (!currentImage) return;
    n.append("Current photo: " + currentImage + " ");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "story-del";
    b.textContent = "Remove photo";
    b.onclick = () => {
      currentImage = "";
      showCurrentImage();
    };
    n.appendChild(b);
  }

  const readFile = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error("Couldn't read that file."));
      r.readAsDataURL(file);
    });

  $("f-save").onclick = async () => {
    const form = $("post-form");
    if (!form.reportValidity()) return;
    if (!editingId && !$("f-consent").checked) return say("f-status", "Please confirm consent before publishing.", false);
    $("f-save").disabled = true;
    try {
      let image = currentImage;
      const file = $("f-file").files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB.");
        image = (await api("/api/admin/upload", "POST", { dataUrl: await readFile(file) })).path;
      }
      const post = {
        title: $("f-title").value,
        update: $("f-update").value,
        location: $("f-location").value,
        date: new Date($("f-date").value).toISOString(),
        image,
        body: $("f-body").value,
        consent: true,
      };
      if (editingId) await api("/api/admin/stories/" + editingId, "PUT", post);
      else await api("/api/admin/stories", "POST", post);
      resetForm();
      say("f-status", "Saved. It is now live on the Stories page.", true);
      loadList();
    } catch (e) {
      if (e.status === 401) return showLogin();
      say("f-status", e.message, false);
    } finally {
      $("f-save").disabled = false;
    }
  };

  function startEdit(p) {
    editingId = p.id;
    currentImage = p.image || "";
    $("f-title").value = p.title;
    $("f-date").value = toLocalInput(p.date);
    $("f-update").value = p.update || "";
    $("f-location").value = p.location || "";
    $("f-body").value = p.body;
    $("f-file").value = "";
    $("ed-title").textContent = "Edit post";
    $("f-save").textContent = "Save changes";
    $("f-cancel").hidden = false;
    showCurrentImage();
    say("f-status", "", true);
    $("ed-title").scrollIntoView({ behavior: "smooth" });
  }

  async function loadList() {
    const box = $("admin-list");
    box.textContent = "";
    let posts = [];
    try {
      posts = await api("/api/stories");
    } catch (e) {
      box.textContent = e.message;
      return;
    }
    if (!posts.length) {
      const p = document.createElement("p");
      p.className = "admin-empty";
      p.textContent = "No posts yet.";
      box.appendChild(p);
      return;
    }
    posts.forEach((p) => {
      const row = document.createElement("div");
      row.className = "admin-row";
      const info = document.createElement("div");
      const t = document.createElement("strong");
      t.textContent = p.title;
      const m = document.createElement("span");
      m.textContent = new Date(p.date).toLocaleString();
      info.append(t, m);
      const actions = document.createElement("div");
      actions.className = "admin-row-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "story-more";
      edit.textContent = "Edit";
      edit.onclick = () => startEdit(p);
      const del = document.createElement("button");
      del.type = "button";
      del.className = "story-del";
      del.textContent = "Delete";
      del.onclick = async () => {
        if (!confirm("Delete “" + p.title + "”? This can't be undone.")) return;
        try {
          await api("/api/admin/stories/" + p.id, "DELETE");
          if (editingId === p.id) resetForm();
          loadList();
        } catch (e) {
          if (e.status === 401) showLogin();
          else say("f-status", e.message, false);
        }
      };
      actions.append(edit, del);
      row.append(info, actions);
      box.appendChild(row);
    });
  }

  init();
})();
