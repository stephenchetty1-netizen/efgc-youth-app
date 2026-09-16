(() => {
  let pending = null,
    $ = (s) => document.querySelector(s),
    msg = (t) => ($("#loginMessage").textContent = t);
  async function bootAuth() {
    try {
      const a = await EFGCAuth.restoreCallback();
      if (!a?.access_token) return;
      const p = await EFGCAuth.getMyProfile();
      if (p) {
        session = {
          name: p.full_name || "EFGC Member",
          phone: p.phone || "",
          role: p.role,
          uid: p.id,
        };
        localStorage.setItem("efgcYouthSession", JSON.stringify(session));
        $("#adminMenu")?.classList.toggle("hidden", p.role !== "admin");
        msg("Email confirmed. Secure session restored.");
        render();
      } else {
        msg(
          "Email confirmed successfully. Your secure account is signed in; profile setup is ready to complete.",
        );
        $("#currentUser").textContent =
          "Verified account • profile setup pending";
      }
    } catch (e) {
      msg(`Session restore notice: ${e.message}`);
    }
  }
  window.loginUser = async () => {
    msg("");
    const d = {
      name: $("#loginName").value.trim(),
      phone: $("#loginPhone").value.trim(),
      email: $("#loginEmail")?.value.trim() || "",
      dob: $("#loginDob").value,
      role: loginRole,
    };
    if (!d.name || !d.phone)
      return msg("Name and cellphone number are required.");
    if (!d.email) return msg("Email address is required.");
    if (d.role !== "admin" && (!d.dob || !$("#loginPhoto").files.length))
      return msg("Birthday and a face photo are required.");
    if (
      d.role === "youth" &&
      (!$("#parentName").value.trim() ||
        !$("#parentPhone").value.trim() ||
        !$("#emergencyName").value.trim() ||
        !$("#emergencyPhone").value.trim())
    )
      return msg(
        "Parent / guardian and emergency contact details are required.",
      );
    try {
      d.email = await EFGCAuth.requestEmailOtp(d.email);
      pending = d;
      let box = $("#supabaseOtpBox");
      if (!box) {
        box = document.createElement("div");
        box.id = "supabaseOtpBox";
        box.className = "otp-box";
        box.innerHTML =
          '<label><span id="otpLabel">Verification code</span><input id="supabaseOtp" inputmode="numeric" maxlength="10" placeholder="Enter OTP"></label><button class="primary-login" type="button" onclick="verifySupabaseOtp()">Verify & Continue</button>';
        $("#loginMessage").before(box);
      }
      $("#otpLabel").textContent = "Email verification code";
      msg("Verification requested. Check your email and enter the code to continue.");
    } catch (e) {
      msg(`Secure sign-in could not start: ${e.message}`);
    }
  };
  window.verifySupabaseOtp = async () => {
    if (!pending) return msg("Request a verification code first.");
    const token = $("#supabaseOtp").value.trim();
    if (!/^\d{6,10}$/.test(token)) return msg("Enter the verification code.");
    try {
      const a = await EFGCAuth.verifyEmailOtp(pending.email, token),
        requested = pending.role === "admin" ? "youth" : pending.role,
        approval = requested === "leader" ? "pending" : "approved";
      await EFGCAuth.upsertProfile({
        full_name: pending.name,
        phone: EFGCAuth.normalizeZA(pending.phone),
        birthday: pending.dob || null,
        face_photo_path: null,
        role: requested,
        approval_status: approval,
        leader_role:
          requested === "leader"
            ? $("#loginRoleText").value.trim() || "EFGC Youth Leader"
            : null,
      });
      if (requested === "youth" && pending.role !== "admin")
        await EFGCAuth.upsertSafeguarding({
          parent_name: $("#parentName").value.trim(),
          parent_phone: $("#parentPhone").value.trim(),
          emergency_name: $("#emergencyName").value.trim(),
          emergency_phone: $("#emergencyPhone").value.trim(),
        });
      session = {
        name: pending.name,
        phone: pending.phone,
        role: requested,
        uid: a.user.id,
      };
      localStorage.setItem("efgcYouthSession", JSON.stringify(session));
      if (pending.role === "admin")
        msg(
          "Identity verified. This account is awaiting secure Admin activation.",
        );
      else if (requested === "leader")
        msg("Leader application submitted. Admin approval is required.");
      else {
        hideLogin();
        render();
      }
    } catch (e) {
      msg(`Verification failed: ${e.message}`);
    }
  };
  window.logoutUser = async () => {
    await EFGCAuth.signOut();
    session = null;
    localStorage.removeItem("efgcYouthSession");
    showLogin();
  };
  bootAuth();
})();
