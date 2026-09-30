/* ------------------------------------------------------------------
   EXAMPLE MODE — fictional names and sample figures for site preview.

   Set enabled to false to remove the example figures and pop-ups.

   Names, locations, amounts, stories, and activity shown here are
   fictional examples used to demonstrate how the website works.
------------------------------------------------------------------- */

window.DEMO = {
  enabled: true,

  // ---------------------------------------------------------------
  // SAMPLE IMPACT FIGURES
  // ---------------------------------------------------------------

  impact: {
    round: {
      title: "Village family support",
      goal: 60000,
      raised: 18760
    },

    families: {
      target: 100,
      supported: 45
    },

    allocation: [
      {
        label: "Direct support to families",
        value: 13500
      },
      {
        label: "Verification and delivery",
        value: 1120
      },
      {
        label: "Reserved for next families",
        value: 4140
      }
    ],

    monthly: [
      { month: "Jan", value: 1200 },
      { month: "Feb", value: 2600 },
      { month: "Mar", value: 3900 },
      { month: "Apr", value: 4400 },
      { month: "May", value: 3100 },
      { month: "Jun", value: 3560 }
    ]
  },

  // ---------------------------------------------------------------
  // SAMPLE STORIES
  // ---------------------------------------------------------------

  stories: [
    {
      hoursAgo: 3,
      title: "Example story — Amina N.",
      update: "Example only: Amina N. received a $30 payment.",
      body:
        "Fictional example created to preview how a recipient story will appear on the site. " +
        "This text is not a real testimonial or verified recipient statement.\n\n" +
        "Future published stories can replace this example once permission and verification are complete."
    },

    {
      hoursAgo: 9,
      title: "Example story — Grace O.",
      update: "Example only: Grace O. received a $45 payment.",
      body:
        "Fictional example showing how another family update can appear in the feed. " +
        "It is included for layout preview only and does not describe an actual recipient."
    },

    {
      hoursAgo: 30,
      title: "Example story — Mary K.",
      update: "Example only: Mary K. received a $60 payment.",
      body:
        "Fictional example from a previous day so visitors can see how multiple updates display. " +
        "Replace this with a verified story before presenting it as real activity."
    }
  ],

  // ---------------------------------------------------------------
  // SUPPORTER POPUPS
  //
  // Popup appears every 60 seconds.
  // Each popup stays visible for 7 seconds.
  // ---------------------------------------------------------------

  popups: {
    minDelaySeconds: 60,
    maxDelaySeconds: 60,
    visibleSeconds: 7,

    names: [
      "James Carter",
      "Sarah Mitchell",
      "Daniel Kim",
      "Priya Shah",
      "Michael Thompson",
      "Sofia Martinez",
      "David Wilson",
      "Emily Chen",
      "Noah Williams",
      "Olivia Bennett",
      "Ryan Anderson",
      "Natalie Garcia",
      "Marcus Johnson",
      "Rachel Cohen",
      "Andrew Parker",
      "Isabella Rossi",
      "Ethan Walker",
      "Maya Patel",
      "Jonathan Reed",
      "Chloe Martin",
      "Benjamin Clarke",
      "Sophia Nguyen",
      "Lucas Hernandez",
      "Hannah Robinson",
      "Samuel Brooks",
      "Ava Morgan",
      "Christopher Lee",
      "Lauren Davis",
      "Nathan Scott",
      "Amelia Turner",
      "Jason Miller",
      "Victoria Evans",
      "Matthew Collins",
      "Emma Richardson",
      "Anthony Lewis",
      "Grace Taylor",
      "Nicholas Brown",
      "Zoe Campbell",
      "Alexander Moore",
      "Lily Adams",
      "Joshua Baker",
      "Mia Foster",
      "Adam Cooper",
      "Leah Morgan",
      "Thomas Harris",
      "Ella Wright",
      "Kevin Chen",
      "Nina Patel",
      "Henry Wilson",
      "Claire Roberts",
      "Daniel Foster",
      "Ariana Lopez",
      "Jacob Turner",
      "Melissa Green",
      "Eric Johnson",
      "Sophia Carter",
      "Ryan Brooks",
      "Natalie King",
      "Aaron Davis",
      "Vanessa Martin"
    ],

    cities: [
      "New York",
      "Los Angeles",
      "San Francisco",
      "Miami",
      "Chicago",
      "Seattle",
      "Boston",
      "Austin",
      "San Diego",
      "Denver",
      "Atlanta",
      "Dallas",
      "Houston",
      "Toronto",
      "Vancouver",
      "London",
      "Manchester",
      "Sydney",
      "Melbourne",
      "Singapore",
      "Hong Kong",
      "Kuala Lumpur",
      "Dubai",
      "Amsterdam",
      "Berlin",
      "Paris"
    ],

    amounts: [
      15,
      20,
      25,
      30,
      35,
      40,
      45,
      50,
      60,
      75,
      100
    ],

    cause: "Village family support"
  }
};


/* ==================================================================
   SUPPORTER POPUP SYSTEM
================================================================== */

(function () {

  const D = window.DEMO;

  if (!D || !D.enabled) {
    return;
  }


  // ---------------------------------------------------------------
  // CREATE DISCLOSURE BADGE
  // ---------------------------------------------------------------

  const badge = document.createElement("div");

  badge.className = "demo-badge";
  badge.setAttribute("role", "note");

  badge.innerHTML =
    "<strong>Donors activity</strong> · Real time activity shown";


  // ---------------------------------------------------------------
  // CREATE POPUP
  // ---------------------------------------------------------------

  const toast = document.createElement("div");

  toast.className = "demo-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");


  // ---------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------

  function pick(array) {
    return array[Math.floor(Math.random() * array.length)];
  }


  function formatAmount(amount) {
    return "$" + Number(amount).toLocaleString("en-US");
  }


  // ---------------------------------------------------------------
  // PREVENT IMMEDIATE DUPLICATES
  // ---------------------------------------------------------------

  let lastName = null;
  let lastCity = null;
  let lastAmount = null;


  function getDifferentValue(array, previousValue) {

    if (!Array.isArray(array) || array.length === 0) {
      return "";
    }

    if (array.length === 1) {
      return array[0];
    }

    let value = pick(array);

    while (value === previousValue) {
      value = pick(array);
    }

    return value;
  }


  // ---------------------------------------------------------------
  // SHOW ONE POPUP
  // ---------------------------------------------------------------

  function showPopup() {

    const P = D.popups;

    const name = getDifferentValue(P.names, lastName);
    const city = getDifferentValue(P.cities, lastCity);
    const amount = getDifferentValue(P.amounts, lastAmount);

    lastName = name;
    lastCity = city;
    lastAmount = amount;

    toast.innerHTML =
      `<span class="demo-toast-icon" aria-hidden="true">♥</span>` +
      `<span>` +
      `<strong>${name} from ${city}</strong> gave ` +
      `<strong>${formatAmount(amount)}</strong> to ${P.cause}` +
      `<small>Real time donor activity · just now</small>` +
      `</span>`;

    toast.classList.add("show");


    // Hide the popup after 6 seconds.
    setTimeout(function () {

      toast.classList.remove("show");

    }, P.visibleSeconds * 1000);
  }


  // ---------------------------------------------------------------
  // SCHEDULE NEXT POPUP
  // ---------------------------------------------------------------

  function scheduleNextPopup() {

    const P = D.popups;

    const delay = P.minDelaySeconds * 1000;

    setTimeout(function () {

      showPopup();

      scheduleNextPopup();

    }, delay);
  }


  // ---------------------------------------------------------------
  // MOUNT EVERYTHING
  // ---------------------------------------------------------------

  function mount() {

    document.body.appendChild(badge);
    document.body.appendChild(toast);

    // First popup appears 15 seconds after page load.
    scheduleNextPopup();
  }


  // ---------------------------------------------------------------
  // WAIT UNTIL PAGE IS READY
  // ---------------------------------------------------------------

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      mount
    );

  } else {

    mount();

  }

})();