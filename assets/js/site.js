const menuButton = document.querySelector(".menu-button");
const nav = document.querySelector("#site-nav");
if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });
}

const frequencyButtons = document.querySelectorAll(".frequency-button");
const amountButtons = document.querySelectorAll(".amount-button");
const donateButton = document.querySelector("#donate-button");

let selectedFrequency = "once";
let selectedAmount = "60";

const PAYPAL_DONATE_URL = "https://www.paypal.com/donate/?business=6YTHHPS2YY6SE&no_recurring=0&item_name=Your+gift+helps+families+across+Africa+access+food%2C+clean+water%2C+and+essential+support%E2%80%94delivered+with+dignity+and+choice.&currency_code=USD";

function updateDonationButton() {
  if (!donateButton) return;
  const amountText =
    selectedAmount === "Other" ? "another amount" : `$${selectedAmount}`;
  donateButton.textContent = `Give ${amountText} ${selectedFrequency}`;
}

frequencyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    frequencyButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    selectedFrequency = button.dataset.frequency;
    updateDonationButton();
  });
});

amountButtons.forEach((button) => {
  button.addEventListener("click", () => {
    amountButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    selectedAmount = button.dataset.amount;
    updateDonationButton();
  });
});

function buildPayPalDonateUrl() {
  const url = new URL(PAYPAL_DONATE_URL);

  // For preset amounts, ask PayPal to prefill the selected donation amount.
  // For "Other", PayPal lets the donor enter the amount on its donation page.
  if (selectedAmount !== "Other") {
    url.searchParams.set("amount", selectedAmount);
  } else {
    url.searchParams.delete("amount");
  }

  return url.toString();
}

if (donateButton) {
  donateButton.addEventListener("click", () => {
    const paypalUrl = buildPayPalDonateUrl();
    window.open(paypalUrl, "_blank", "noopener,noreferrer");
  });
}
