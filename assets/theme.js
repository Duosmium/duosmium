// light/dark theme; the initial class is set by the inline script in base.njk.
// Until the switch is flipped, the theme follows the system preference.
const root = document.documentElement;
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function storedTheme() {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch (e) {}
  return null;
}

function setSwitch(dark) {
  const toggle = document.getElementById("theme-toggle");
  if (toggle) toggle.setAttribute("aria-checked", String(dark));
}

function apply(dark) {
  root.classList.toggle("theme-dark", dark);
  setSwitch(dark);
}

// fade the whole page to the new theme in one step
function applyWithFade(dark) {
  if (!document.startViewTransition || reducedMotion.matches) {
    apply(dark);
    return;
  }
  document.startViewTransition(() => apply(dark));
}

systemDark.addEventListener("change", (e) => {
  if (!storedTheme()) apply(e.matches);
});

const toggle = document.getElementById("theme-toggle");
if (toggle) {
  toggle.addEventListener("click", () => {
    const dark = toggle.getAttribute("aria-checked") !== "true";
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch (e) {}
    applyWithFade(dark);
  });
}

const stored = storedTheme();
apply(stored ? stored === "dark" : systemDark.matches);
