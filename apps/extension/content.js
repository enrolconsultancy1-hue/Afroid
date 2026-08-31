/**
 * AfroID ፩</> Content Script — Grant Form Detection & Autofill Injection
 */

const DEFAULT_STARTUP_DATA = {
  name: "AfroHealth Technologies",
  legal_name: "AfroHealth Technologies Ltd.",
  founder_name: "Amina Diallo",
  email: "founder@afrohealth.africa",
  country: "Nigeria",
  city: "Lagos",
  sector: "HealthTech / FinTech",
  stage: "Seed",
  team_size: "12",
  annual_revenue: "180000",
  funding_sought: "250000",
  problem: "High maternal mortality in rural communities due to fragmented primary care records.",
  solution: "Sovereign AI diagnostic telemedicine platform connecting community health workers with specialist physicians.",
  website: "https://afrohealth.africa",
};

// Listen for autofill request
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "AUTOFILL_GRANT_FORM") {
    const filledCount = autofillForm();
    sendResponse({ success: true, filledCount });
  }
  return true;
});

function autofillForm() {
  const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
  let filledCount = 0;

  inputs.forEach((el) => {
    if (el.type === "hidden" || el.type === "submit" || el.type === "button") return;

    const labelText = getFieldLabel(el).toLowerCase();
    const name = (el.name || "").toLowerCase();
    const id = (el.id || "").toLowerCase();
    const placeholder = (el.placeholder || "").toLowerCase();
    const key = `${labelText} ${name} ${id} ${placeholder}`;

    let val = null;
    if (key.includes("startup") || key.includes("company") || key.includes("organization") || key.includes("venture")) {
      val = DEFAULT_STARTUP_DATA.name;
    } else if (key.includes("founder") || key.includes("applicant") || key.includes("full name") || key.includes("your name")) {
      val = DEFAULT_STARTUP_DATA.founder_name;
    } else if (key.includes("email")) {
      val = DEFAULT_STARTUP_DATA.email;
    } else if (key.includes("country")) {
      val = DEFAULT_STARTUP_DATA.country;
    } else if (key.includes("city") || key.includes("location")) {
      val = DEFAULT_STARTUP_DATA.city;
    } else if (key.includes("sector") || key.includes("industry")) {
      val = DEFAULT_STARTUP_DATA.sector;
    } else if (key.includes("revenue") || key.includes("turnover")) {
      val = DEFAULT_STARTUP_DATA.annual_revenue;
    } else if (key.includes("grant") || key.includes("amount") || key.includes("funding")) {
      val = DEFAULT_STARTUP_DATA.funding_sought;
    } else if (key.includes("problem") || key.includes("challenge")) {
      val = DEFAULT_STARTUP_DATA.problem;
    } else if (key.includes("solution") || key.includes("description") || key.includes("summary")) {
      val = DEFAULT_STARTUP_DATA.solution;
    } else if (key.includes("website") || key.includes("url")) {
      val = DEFAULT_STARTUP_DATA.website;
    }

    if (val !== null && !el.value) {
      el.value = val;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.style.borderColor = "#33FF66";
      el.style.backgroundColor = "rgba(51, 255, 102, 0.05)";
      filledCount++;
    }
  });

  return filledCount;
}

function getFieldLabel(el) {
  if (el.labels && el.labels.length > 0) {
    return el.labels[0].innerText || "";
  }
  const parent = el.closest("label, .form-group, .field, div");
  if (parent) {
    const label = parent.querySelector("label, .label");
    if (label) return label.innerText || "";
  }
  return "";
}

// Inject Floating geezcodE Button on grant portals
function injectFloatingCopilot() {
  if (document.getElementById("geezcode-floating-copilot")) return;

  const btn = document.createElement("div");
  btn.id = "geezcode-floating-copilot";
  btn.innerHTML = `
    <div class="geezcode-float-icon">
      <span>&lt;</span><span class="geez-numeral">፩</span><span>/&gt;</span>
    </div>
    <span class="geezcode-float-text">AfroID</span>
  `;

  btn.addEventListener("click", () => {
    const count = autofillForm();
    if (count > 0) {
      btn.classList.add("autofilled");
      setTimeout(() => btn.classList.remove("autofilled"), 2500);
    } else {
      window.open("http://localhost:3000/dashboard/ide", "_blank");
    }
  });

  document.body.appendChild(btn);
}

// Inject after page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectFloatingCopilot);
} else {
  injectFloatingCopilot();
}
