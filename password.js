(() => {
  const form = document.querySelector(".entrance-card");
  const passwordField = form.elements.password;
  const button = form.querySelector("button");
  const status = document.querySelector("#entrance-status");
  let submitting = false;

  passwordField.addEventListener("input", () => {
    const digits = passwordField.value.normalize("NFKC").replace(/\D/g, "").slice(0, 4);
    if (passwordField.value !== digits) passwordField.value = digits;
    passwordField.removeAttribute("aria-invalid");
    status.textContent = "";
  });

  function showInvalid(message) {
    passwordField.readOnly = false;
    passwordField.setAttribute("aria-invalid", "true");
    status.textContent = message;
    passwordField.focus();
    passwordField.select();
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitting) return;
    const password = passwordField.value;
    if (!/^[0-9]{4}$/.test(password)) {
      showInvalid("请输入四位数字。");
      return;
    }

    submitting = true;
    passwordField.removeAttribute("aria-invalid");
    passwordField.readOnly = true;
    button.disabled = true;
    button.textContent = "正在解锁…";
    status.textContent = "";

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (response.ok && (await response.json()).ok === true) {
        location.reload();
        return;
      }
      if (response.status === 401) showInvalid("密码不对，再试一次。");
      else if (response.status === 429) status.textContent = "尝试次数太多，请稍后再试。";
      else status.textContent = "暂时无法解锁，请再试一次。";
    } catch {
      status.textContent = "连接失败，请再试一次。";
    }

    passwordField.readOnly = false;
    button.disabled = false;
    button.textContent = "解锁派对";
    submitting = false;
  });
})();
