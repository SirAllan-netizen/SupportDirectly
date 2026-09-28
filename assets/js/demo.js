/* ------------------------------------------------------------------
   EXAMPLE MODE — fictional names and sample figures for site preview.
   Set enabled to false to remove the example figures and pop-ups.
   Names and activity shown here are fictional examples, not verified donations.
------------------------------------------------------------------- */
window.DEMO = {
  enabled: true,

  // Sample figures used by the Impact page (replaces the zeros in impact.js)
  impact: {
    round: { title: "Village family support", goal: 60000, raised: 18760 },
    families: { target: 100, supported: 45 },
    allocation: [
      { label: "Direct support to families", value: 13500 },
      { label: "Verification and delivery", value: 1120 },
      { label: "Reserved for next families", value: 4140 },
    ],
    monthly: [
      { month: "Jan", value: 1200 },
      { month: "Feb", value: 2600 },
      { month: "Mar", value: 3900 },
      { month: "Apr", value: 4400 },
      { month: "May", value: 3100 },
      { month: "Jun", value: 3560 },
    ],
  },

  // Example newsfeed posts for the Stories page (fictional names, clearly labeled as examples)
  stories: [
    {
      hoursAgo: 3,
      title: "Example story — Amina N.",
      update: "Example only: Amina N. received a $30 payment.",
      body: "Fictional example created to preview how a recipient story will appear on the site. This text is not a real testimonial or verified recipient statement.\n\nFuture published stories can replace this example once permission and verification are complete.",
    },
    {
      hoursAgo: 9,
      title: "Example story — Grace O.",
      update: "Example only: Grace O. received a $45 payment.",
      body: "Fictional example showing how another family update can appear in the feed. It is included for layout preview only and does not describe an actual recipient.",
    },
    {
      hoursAgo: 30,
      title: "Example story — Mary K.",
      update: "Example only: Mary K. received a $60 payment.",
      body: "Fictional example from a previous day so visitors can see how multiple updates display. Replace this with a verified story before presenting it as real activity.",
    },
  ],

  // Example pop-up notifications (fictional supporter names shown one at a time)
  popups: {
    minDelaySeconds: 6,
    maxDelaySeconds: 10,
    visibleSeconds: 5,
    names: ["James Carter", "Maria Lopez", "Daniel Kim", "Priya Shah", "Michael Thompson", "Sofia Martinez", "David Wilson", "Emily Chen", "Noah Williams"],
    cities: ["Nairobi", "Thika", "Mombasa", "Kampala", "Lagos", "London", "Toronto", "San Francisco", "Sydney"],
    amounts: [15, 30, 45, 60, 75, 100],
    cause: "Village family support",
  },
};

(function () {
  const D = window.DEMO;
  if (!D || !D.enabled) return;

  // Persistent disclosure so visitors know the displayed activity is illustrative
  const badge = document.createElement("div");
  badge.className = "demo-badge";
  badge.setAttribute("role", "note");
  badge.innerHTML = "<strong>Real time supporty</strong> · Showing donors names and respective amounts";

  const toast = document.createElement("div");
  toast.className = "demo-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");

  function mount() {
    document.body.appendChild(badge);
    document.body.appendChild(toast);
    schedule();
  }

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rand = (a, b) => a + Math.random() * (b - a);

  function show() {
    const P = D.popups;
    toast.innerHTML =
      `<span class="demo-toast-icon" aria-hidden="true">♥</span>` +
      `<span><strong>${pick(P.names)} from ${pick(P.cities)}</strong> gave ` +
      `<strong>$${pick(P.amounts)}</strong> to ${P.cause}` +
      `<small>Donor Activity · just now</small></span>`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), P.visibleSeconds * 1000);
  }

  function schedule() {
    const P = D.popups;
    setTimeout(() => {
      show();
      schedule();
    }, rand(P.minDelaySeconds, P.maxDelaySeconds) * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
