let loginRole = "youth",
  session = (() => {
    try {
      return JSON.parse(localStorage.getItem("efgcYouthSession") || "null");
    } catch {
      return null;
    }
  })();
const $ = (s) => document.querySelector(s);
function selectRole(r) {
  loginRole = r;
  document
    .querySelectorAll(".login-type")
    .forEach((b) => b.classList.toggle("active", b.dataset.role === r));
  $("#loginTitle").textContent =
    r === "leader"
      ? "Leader Login / Application"
      : r === "admin"
        ? "Admin Login"
        : "Youth Login";
  $("#loginHint").textContent =
    r === "leader"
      ? "New Leader access requires Admin approval."
      : r === "admin"
        ? "Secure Admin sign-in uses an email verification code. Cellphone remains part of the profile."
        : "Create your youth profile to get started.";
  $("#youthSafeguardingFields").classList.toggle("hidden", r !== "youth");
  $("#roleField").classList.toggle("hidden", r !== "leader");
  $("#photoField").classList.toggle("hidden", r === "admin");
  $("#dobField").classList.toggle("hidden", r === "admin");
  $("#emailField").classList.remove("hidden");
}
document.addEventListener("click", (e) => {
  const b = e.target.closest(".login-type");
  if (b) selectRole(b.dataset.role);
});
function showLogin() {
  $("#login").classList.remove("hidden");
}
function hideLogin() {
  $("#login").classList.add("hidden");
}
function render() {
  const authenticated = Boolean(session);
  document
    .querySelectorAll("#mainMenu, .userbar")
    .forEach((el) => el.classList.toggle("hidden", !authenticated));
  if (!authenticated) {
    document
      .querySelectorAll(
        "#home, #events, #news, #scripture, #mine, #leaders, #profile, #security, #admin",
      )
      .forEach((el) => el.classList.add("hidden"));
  }
  if (session) {
    $("#currentUser").textContent = `${session.name} • ${session.role}`;
    $("#adminMenu")?.classList.toggle("hidden", session.role !== "admin");
    $("#home").classList.remove("hidden");
    hideLogin();
  } else {
    $("#currentUser").textContent = "Not signed in";
    $("#adminMenu")?.classList.add("hidden");
  }
}
function renderNews() {}
function logoutUser() {
  session = null;
  localStorage.removeItem("efgcYouthSession");
  showLogin();
  render();
}
selectRole("youth");
render();
