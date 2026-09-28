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

if (donateButton) {
  donateButton.addEventListener("click", () => {
    alert("Secure online giving is coming soon. Please check back shortly.");
  });
}
