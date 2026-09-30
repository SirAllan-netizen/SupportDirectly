/* ------------------------------------------------------------------
   IMPACT DATA — edit ONLY this block with verified figures.
   Everything on the Impact page (progress bars, donut, bar chart)
   is drawn from these numbers.
------------------------------------------------------------------- */
const IMPACT = {
  round: {
    title: "Village family support",
    goal: 60000, // funding goal for this round (USD)
    raised: 0, // total received so far (USD)
  },
  families: { target: 100, supported: 0 },
  // How funds were used (USD). Should add up to the amount spent/reserved.
  allocation: [
    { label: "Direct support to families", value: 0 },
    { label: "Verification and delivery", value: 0 },
    { label: "Reserved for next families", value: 0 },
  ],
  // Funds received per month (USD)
  monthly: [
    { month: "Jan", value: 0 },
    { month: "Feb", value: 0 },
    { month: "Mar", value: 0 },
    { month: "Apr", value: 0 },
    { month: "May", value: 0 },
    { month: "Jun", value: 0 },
  ],
};
/* ---------------------------- end of data ---------------------------- */
if (window.DEMO && window.DEMO.enabled) Object.assign(IMPACT, window.DEMO.impact);

(function () {
  const $ = (id) => document.getElementById(id);
  if (!$("round-raised")) return;
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const pct = (a, b) => (b > 0 ? Math.min(100, (a / b) * 100) : 0);
  const COLORS = ["#112847", "#4a86b8", "#b9cc4a"];

  // Funding progress
  const { goal, raised } = IMPACT.round;
  const p = pct(raised, goal);
  $("round-title").textContent = IMPACT.round.title;
  $("round-raised").textContent = money(raised);
  $("round-goal").textContent = money(goal);
  $("round-pct").textContent = Math.round(p) + "%";
  $("round-fill").style.width = p + "%";
  $("round-bar").setAttribute("aria-valuenow", String(Math.round(p)));
  $("round-togo").innerHTML =
    raised >= goal
      ? "<strong>Goal reached.</strong> Thank you to everyone who gave."
      : `<strong>${money(goal - raised)} to go.</strong> ` +
        (raised === 0 ? "Be the first to give." : "Every gift moves this forward.");

  // Families progress
  const f = IMPACT.families;
  const fp = pct(f.supported, f.target);
  $("fam-count").textContent = f.supported.toLocaleString("en-US");
  $("fam-target").textContent = f.target.toLocaleString("en-US");
  $("fam-pct").textContent = Math.round(fp) + "%";
  $("fam-fill").style.width = fp + "%";
  $("fam-bar").setAttribute("aria-valuenow", String(Math.round(fp)));

  // Donut chart
  const total = IMPACT.allocation.reduce((s, a) => s + a.value, 0);
  const ns = "http://www.w3.org/2000/svg";
  const svg = $("donut");
  const mk = (color, dash, offset) => {
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", "21");
    c.setAttribute("cy", "21");
    c.setAttribute("r", "15.9155");
    c.setAttribute("fill", "none");
    c.setAttribute("stroke", color);
    c.setAttribute("stroke-width", "5.5");
    c.setAttribute("stroke-dasharray", dash);
    c.setAttribute("stroke-dashoffset", offset);
    return c;
  };
  svg.appendChild(mk("#e3e9e7", "100 0", "0"));
  let acc = 0;
  if (total > 0) {
    IMPACT.allocation.forEach((a, i) => {
      const share = (a.value / total) * 100;
      if (share <= 0) return;
      svg.appendChild(mk(COLORS[i % 3], `${share} ${100 - share}`, String(25 - acc)));
      acc += share;
    });
  }
  $("donut-total").textContent = total > 0 ? money(total) : "$0";
  $("legend").innerHTML = IMPACT.allocation
    .map(
      (a, i) =>
        `<li><span class="dot" style="background:${COLORS[i % 3]}"></span>` +
        `<span class="lg-label">${a.label}</span>` +
        `<span class="lg-val">${money(a.value)} <em>${total ? Math.round((a.value / total) * 100) : 0}%</em></span></li>`,
    )
    .join("");

  // Monthly bar chart
  const max = Math.max(...IMPACT.monthly.map((m) => m.value), 0);
  $("bars").innerHTML = IMPACT.monthly
    .map((m) => {
      const h = max > 0 ? Math.max((m.value / max) * 100, m.value > 0 ? 3 : 0) : 0;
      return (
        `<div class="bar-col"><span class="bar-val">${m.value ? money(m.value) : ""}</span>` +
        `<div class="bar-track"><div class="bar-fill" style="height:${h}%"></div></div>` +
        `<span class="bar-label">${m.month}</span></div>`
      );
    })
    .join("");
  $("bars-empty").hidden = max > 0;

  // Hide the "no totals yet" note once real money is recorded
  const note = $("no-totals");
  if (note && (raised > 0 || total > 0)) note.hidden = true;
})();
