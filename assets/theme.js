// light/dark theme; the initial class is set by the inline script in base.njk.
// The stored preference is "light", "dark", or absent (follow the system).
const root = document.documentElement;
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const modes = ["system", "light", "dark"];
const labels = { system: "System", light: "Light", dark: "Dark" };

function getMode() {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch (e) {}
  return "system";
}

function apply(mode) {
  const dark = mode === "dark" || (mode === "system" && systemDark.matches);
  root.classList.toggle("theme-dark", dark);

  const button = document.getElementById("theme-toggle");
  if (button) {
    button.dataset.mode = mode;
    button.querySelector(".theme-toggle-label").textContent = labels[mode];
    button.setAttribute("aria-label", `Theme: ${labels[mode]}`);
  }
}

systemDark.addEventListener("change", () => {
  if (getMode() === "system") apply("system");
});

const button = document.getElementById("theme-toggle");
if (button) {
  button.addEventListener("click", () => {
    const next = modes[(modes.indexOf(getMode()) + 1) % modes.length];
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch (e) {}
    apply(next);
  });
}

apply(getMode());
