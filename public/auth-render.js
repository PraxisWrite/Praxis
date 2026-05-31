// auth-render.js
// Auth screen renderer + event bindings extracted from app.js (Phase 7).
// Reads appEl and authUiState via window.AppState. Calls bootApp,
// stopTeacherReviewPolling via window. Auth, AccountSecurity, escapeHtml,
// renderBrandGlyph, renderProductWordmark, PRODUCT_NAME, PRODUCT_TAGLINE
// are already on window.
// Exposes window.AuthRender plus individual function globals for back-compat.

(function () {
  function setAuthTab(tab) {
    const signinForm = document.getElementById("auth-signin-form");
    const signupForm = document.getElementById("auth-signup-form");
    const signinTab = document.getElementById("auth-tab-signin");
    const signupTab = document.getElementById("auth-tab-signup");
    if (!signinForm || !signupForm || !signinTab || !signupTab) return;
    signinForm.style.display = tab === "signin" ? "block" : "none";
    signupForm.style.display = tab === "signup" ? "block" : "none";
    signinTab.style.background = tab === "signin" ? "#fff" : "#eef4ff";
    signinTab.style.color = tab === "signin" ? "var(--accent)" : "#667063";
    signupTab.style.background = tab === "signup" ? "#fff" : "#eef4ff";
    signupTab.style.color = tab === "signup" ? "var(--accent)" : "#667063";
  }

  function setAuthSignupRole(role) {
    const { authUiState } = globalThis.AppState;
    authUiState.signupRole = role === "teacher" ? "teacher" : "student";
    const studentButton = document.getElementById("role-btn-student");
    const teacherButton = document.getElementById("role-btn-teacher");
    if (studentButton) {
      studentButton.style.border = authUiState.signupRole === "student" ? "2px solid var(--accent)" : "1px solid var(--line)";
      studentButton.style.background = authUiState.signupRole === "student" ? "#e7eeff" : "#fff";
      studentButton.style.color = authUiState.signupRole === "student" ? "var(--accent-deep)" : "#667063";
    }
    if (teacherButton) {
      teacherButton.style.border = authUiState.signupRole === "teacher" ? "2px solid var(--accent)" : "1px solid var(--line)";
      teacherButton.style.background = authUiState.signupRole === "teacher" ? "#e7eeff" : "#fff";
      teacherButton.style.color = authUiState.signupRole === "teacher" ? "var(--accent-deep)" : "#667063";
    }
  }

  function bindAuthScreenEvents(joinClassId = null) {
    const { appEl, authUiState } = globalThis.AppState;
    authUiState.signupRole = "student";
    const search = new URLSearchParams(globalThis.location.search);
    const wantsSignup = search.get("signup") === "1" || globalThis.location.hash === "#signup";
    const initialTab = wantsSignup ? "signup" : "signin";
    if (wantsSignup) {
      search.delete("signup");
      const cleanSearch = search.toString();
      const cleanHash = globalThis.location.hash === "#signup" ? "" : globalThis.location.hash;
      const cleanUrl = globalThis.location.pathname + (cleanSearch ? "?" + cleanSearch : "") + cleanHash;
      globalThis.history.replaceState(null, "", cleanUrl);
    }
    setAuthTab(initialTab);
    setAuthSignupRole("student");

    appEl.querySelectorAll("[data-auth-tab]").forEach((button) => {
      button.addEventListener("click", () => setAuthTab(button.dataset.authTab));
    });

    appEl.querySelectorAll("[data-auth-role]").forEach((button) => {
      button.addEventListener("click", () => setAuthSignupRole(button.dataset.authRole));
    });

    appEl.querySelector("[data-auth-action='signin']")?.addEventListener("click", async () => {
      const email = document.getElementById("auth-email").value.trim();
      const password = document.getElementById("auth-password").value;
      const errEl = document.getElementById("auth-error");
      errEl.style.display = "none";
      try {
        const stayLoggedIn = document.getElementById("stay-logged-in")?.checked !== false;
        const profile = await Auth.signIn(email, password, stayLoggedIn);
        await Auth.joinClassIfInvited();
        await bootApp(profile);
      } catch (error) {
        errEl.textContent = error.message;
        errEl.style.display = "block";
      }
    });

    appEl.querySelector("[data-auth-action='forgot-password']")?.addEventListener("click", async () => {
      const email = document.getElementById("auth-email").value.trim();
      const errEl = document.getElementById("auth-error");
      errEl.style.display = "none";
      if (!email) {
        errEl.textContent = "Enter your email first, then click forgot password.";
        errEl.style.display = "block";
        errEl.style.color = "var(--danger)";
        return;
      }
      try {
        await Auth.requestPasswordReset(email);
        errEl.textContent = "Password reset email sent. Check your inbox.";
        errEl.style.display = "block";
        errEl.style.color = "var(--sage)";
      } catch (error) {
        errEl.textContent = error.message;
        errEl.style.display = "block";
        errEl.style.color = "var(--danger)";
      }
    });

    appEl.querySelector("[data-auth-action='signup']")?.addEventListener("click", async () => {
      const name = document.getElementById("auth-signup-name").value.trim();
      const email = document.getElementById("auth-signup-email").value.trim();
      const password = document.getElementById("auth-signup-password").value;
      const errEl = document.getElementById("auth-signup-error");
      errEl.style.display = "none";
      if (!name || !email || !password) {
        errEl.textContent = "Please fill in all fields.";
        errEl.style.display = "block";
        return;
      }
      const validation = globalThis.AccountSecurity?.validatePassword(password);
      if (validation && !validation.ok) {
        errEl.textContent = validation.message;
        errEl.style.display = "block";
        return;
      }
      try {
        const profile = await Auth.signUp(email, password, name, joinClassId ? "student" : authUiState.signupRole);
        globalThis.AccountSecurity?.markPasswordUpdated(profile);
        await Auth.joinClassIfInvited();
        await bootApp(profile);
      } catch (error) {
        errEl.textContent = error.message;
        errEl.style.display = "block";
      }
    });
  }

  function renderAuthScreen(joinClassId = null, inviteInfo = null) {
    const { appEl } = globalThis.AppState;
    stopTeacherReviewPolling();
    document.title = PRODUCT_NAME;
    const teacherName = inviteInfo?.teacherName || "";
    const className = inviteInfo?.className || "";
    const inviteBanner = joinClassId ? `
      <div style="background:#edf4ea;border:1px solid #cbddc6;border-radius:12px;padding:14px 16px;margin-bottom:20px;color:#2e5c28;line-height:1.55;">
        <strong style="display:block;margin-bottom:4px;">You've been invited to join a class</strong>
        ${teacherName && className
          ? `You have been invited to join <strong>${escapeHtml(teacherName)}'s ${escapeHtml(className)}</strong> class.`
          : "Sign in or create a student account to join."}
        <span style="display:block;margin-top:6px;font-size:0.88rem;">Sign in or create a student account below to join automatically.</span>
      </div>
    ` : "";
    appEl.innerHTML = `
      <div style="min-height:100vh;display:grid;place-items:center;padding:20px;">
        <div style="width:100%;max-width:400px;background:rgba(255,255,255,0.92);border:1px solid rgba(217,227,240,0.92);border-radius:20px;padding:32px;box-shadow:0 18px 42px rgba(21,39,74,0.10);backdrop-filter:blur(16px);">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
            <div class="brand-mark brand-mark-auth">${renderBrandGlyph()}</div>
            <div>
              ${renderProductWordmark("h1", "brand-wordmark auth-wordmark")}
              <p style="margin:0;color:#667063;font-size:0.85rem;">${escapeHtml(PRODUCT_TAGLINE)}</p>
            </div>
          </div>
          ${inviteBanner}
          <div style="display:flex;gap:0;margin-bottom:24px;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#eef4ff;">
            <button id="auth-tab-signin" data-auth-tab="signin" style="flex:1;padding:10px;border:none;background:#fff;font-weight:700;cursor:pointer;color:var(--accent);">Sign in</button>
            <button id="auth-tab-signup" data-auth-tab="signup" style="flex:1;padding:10px;border:none;background:#eef4ff;font-weight:700;cursor:pointer;color:#667063;">Create account</button>
          </div>
          <div id="auth-signin-form">
            <div style="display:grid;gap:12px;">
              <input id="auth-email" type="email" placeholder="Email" style="border:1px solid #ddd2c2;border-radius:10px;padding:12px 14px;width:100%;font:inherit;box-sizing:border-box;" />
              <input id="auth-password" type="password" placeholder="Password" style="border:1px solid #ddd2c2;border-radius:10px;padding:12px 14px;width:100%;font:inherit;box-sizing:border-box;" />
              <label style="display:flex;align-items:center;gap:8px;font-size:0.88rem;color:var(--muted);cursor:pointer;">
                <input type="checkbox" id="stay-logged-in" checked style="cursor:pointer;" /> Stay logged in
              </label>
              <button type="button" data-auth-action="forgot-password" style="background:none;border:none;padding:0;text-align:left;color:var(--accent);font-weight:600;cursor:pointer;">Forgot password?</button>
              <button type="button" data-auth-action="signin" style="background:linear-gradient(135deg,var(--accent),var(--accent-deep));color:white;border:none;border-radius:999px;padding:12px 24px;font:inherit;font-weight:700;cursor:pointer;box-shadow:0 10px 24px rgba(63,109,246,0.24);">Sign in</button>
              <p id="auth-error" style="color:#b34949;font-size:0.85rem;margin:0;display:none;"></p>
            </div>
          </div>
          <div id="auth-signup-form" style="display:none;">
            <div style="display:grid;gap:12px;">
              <input id="auth-signup-name" type="text" placeholder="Full name" style="border:1px solid #ddd2c2;border-radius:10px;padding:12px 14px;width:100%;font:inherit;box-sizing:border-box;" />
              <input id="auth-signup-email" type="email" placeholder="Email" style="border:1px solid #ddd2c2;border-radius:10px;padding:12px 14px;width:100%;font:inherit;box-sizing:border-box;" />
              <input id="auth-signup-password" type="password" placeholder="Password (8+ characters, 1 number)" style="border:1px solid #ddd2c2;border-radius:10px;padding:12px 14px;width:100%;font:inherit;box-sizing:border-box;" />
              <p class="subtle" style="font-size:0.8rem;margin:-4px 0 0;">${escapeHtml(globalThis.AccountSecurity?.PASSWORD_REQUIREMENT_TEXT || "Use at least 8 characters and 1 number.")}</p>
              <div style="display:flex;gap:8px;">
                <button type="button" data-auth-role="student" id="role-btn-student" style="flex:1;padding:10px;border:2px solid var(--accent);border-radius:10px;background:#e7eeff;font:inherit;font-weight:700;cursor:pointer;color:var(--accent-deep);">Student</button>
                ${joinClassId ? '' : `<button type="button" data-auth-role="teacher" id="role-btn-teacher" style="flex:1;padding:10px;border:1px solid #ddd2c2;border-radius:10px;background:#fff;font:inherit;font-weight:700;cursor:pointer;color:#667063;">Teacher</button>`}
                </div>
              <button type="button" data-auth-action="signup" style="background:linear-gradient(135deg,var(--accent),var(--accent-deep));color:white;border:none;border-radius:999px;padding:12px 24px;font:inherit;font-weight:700;cursor:pointer;box-shadow:0 10px 24px rgba(63,109,246,0.24);">Create account</button>
              <p id="auth-signup-error" style="color:#b34949;font-size:0.85rem;margin:0;display:none;"></p>
            </div>
          </div>
        </div>
      </div>
    `;
    bindAuthScreenEvents(joinClassId);
  }

  const AuthRender = {
    setAuthTab,
    setAuthSignupRole,
    bindAuthScreenEvents,
    renderAuthScreen,
  };

  if (globalThis.window !== undefined) {
    globalThis.AuthRender = AuthRender;
    Object.assign(globalThis, AuthRender);
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = AuthRender;
  }
})();
