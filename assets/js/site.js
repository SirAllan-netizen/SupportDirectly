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
const cryptoDonateButton = document.querySelector("#crypto-donate-button");
const customAmountWrap = document.querySelector("#custom-amount-wrap");
const customAmountInput = document.querySelector("#custom-amount");
const donationPaymentNote = document.querySelector("#donation-payment-note");
const donationStatus = document.querySelector("#donation-status");

let selectedFrequency = "once";
let selectedAmount = "60";

const PAYPAL_DONATE_URL = "https://www.paypal.com/donate/?business=6YTHHPS2YY6SE&no_recurring=0&item_name=Your+gift+helps+families+across+Africa+access+food%2C+clean+water%2C+and+essential+support%E2%80%94delivered+with+dignity+and+choice.&currency_code=USD";

function getDonationAmount() {
  if (selectedAmount !== "Other") return Number(selectedAmount);
  const custom = Number(customAmountInput?.value || 0);
  return Number.isFinite(custom) && custom > 0 ? custom : null;
}

function amountLabel() {
  const amount = getDonationAmount();
  if (amount) return `$${amount.toLocaleString("en-US")}`;
  return selectedAmount === "Other" ? "another amount" : `$${selectedAmount}`;
}

function updateDonationButtons() {
  const label = amountLabel();
  if (donateButton) donateButton.textContent = `Give ${label} with PayPal`;

  if (cryptoDonateButton) {
    const monthly = selectedFrequency === "monthly";
    cryptoDonateButton.disabled = monthly;
    cryptoDonateButton.textContent = monthly
      ? "Crypto available for one-time gifts"
      : `Give ${label} with crypto`;
  }

  if (donationPaymentNote) {
    donationPaymentNote.textContent = selectedFrequency === "monthly"
      ? "Monthly gifts are currently completed through PayPal. Select Once to donate with cryptocurrency."
      : "Choose PayPal or crypto for a one-time gift. Crypto checkout is securely hosted by NOWPayments.";
  }
}

frequencyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    frequencyButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    selectedFrequency = button.dataset.frequency;
    updateDonationButtons();
  });
});

amountButtons.forEach((button) => {
  button.addEventListener("click", () => {
    amountButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    selectedAmount = button.dataset.amount;
    if (customAmountWrap) customAmountWrap.hidden = selectedAmount !== "Other";
    if (selectedAmount === "Other") customAmountInput?.focus();
    updateDonationButtons();
  });
});

customAmountInput?.addEventListener("input", updateDonationButtons);

function buildPayPalDonateUrl() {
  const url = new URL(PAYPAL_DONATE_URL);
  const amount = getDonationAmount();
  if (amount) url.searchParams.set("amount", String(amount));
  else url.searchParams.delete("amount");
  return url.toString();
}

if (donateButton) {
  donateButton.addEventListener("click", () => {
    if (selectedAmount === "Other" && !getDonationAmount()) {
      donationStatus.textContent = "Enter a donation amount first.";
      customAmountInput?.focus();
      return;
    }
    const paypalUrl = buildPayPalDonateUrl();
    window.open(paypalUrl, "_blank", "noopener,noreferrer");
  });
}

async function startCryptoDonation() {
  if (selectedFrequency !== "once") return;
  const amount = getDonationAmount();
  if (!amount || amount < 1 || amount > 10000) {
    donationStatus.textContent = "Enter a donation amount between $1 and $10,000.";
    customAmountInput?.focus();
    return;
  }

  const originalText = cryptoDonateButton.textContent;
  cryptoDonateButton.disabled = true;
  cryptoDonateButton.textContent = "Opening secure crypto checkout…";
  donationStatus.textContent = "Creating your NOWPayments checkout…";

  try {
    const response = await fetch("crypto.php?action=create-invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok || !data.invoice_url) {
      throw new Error(data.error || "Unable to start crypto checkout.");
    }
    donationStatus.textContent = "Redirecting to NOWPayments…";
    window.location.href = data.invoice_url;
  } catch (error) {
    donationStatus.textContent = error.message || "Unable to start crypto checkout. Please try again.";
    cryptoDonateButton.disabled = false;
    cryptoDonateButton.textContent = originalText;
  }
}

cryptoDonateButton?.addEventListener("click", startCryptoDonation);

const params = new URLSearchParams(window.location.search);
if (donationStatus && params.get("crypto") === "success") {
  donationStatus.textContent = "Your crypto checkout was completed. Blockchain confirmation may take a little time.";
} else if (donationStatus && params.get("crypto") === "cancel") {
  donationStatus.textContent = "Crypto checkout was cancelled. No problem—you can try again whenever you are ready.";
}

updateDonationButtons();
