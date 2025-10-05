 
 document.addEventListener("keydown", function (event) {
          if (event.key === "Enter") {
            // If register modal open, try to submit registration (if valid)
            const modal = document.getElementById('register-modal');
            if (modal && modal.style.display === 'flex') {
              event.preventDefault();
              const submit = document.getElementById('reg-submit');
              if (submit && !submit.disabled) {
                submit.click();
              }
              return;
            }
            event.preventDefault();
            login();
          }
        });

      function openRegisterModal() {
        document.getElementById('register-modal').style.display = 'flex';
        document.getElementById('reg-error').innerText = '';
        document.getElementById('reg-username').value = '';
        document.getElementById('reg-password').value = '';
        document.getElementById('reg-password2').value = '';
        document.getElementById('reg-submit').disabled = true;
        document.getElementById('reg-submit').style.background = '#9ca3af';
      }

      function closeRegisterModal() {
        document.getElementById('register-modal').style.display = 'none';
      }

      // validation for register modal
      function validateRegisterFields() {
        const u = document.getElementById('reg-username').value.trim();
        const p = document.getElementById('reg-password').value;
        const p2 = document.getElementById('reg-password2').value;
        const submit = document.getElementById('reg-submit');
        const err = document.getElementById('reg-error');
        const confirmErr = document.getElementById('reg-confirm-error');
        err.innerText = '';
        confirmErr.style.display = 'none';
        confirmErr.innerText = '';
        if (!u || !p || !p2) {
          submit.disabled = true;
          submit.style.background = '#9ca3af';
          return false;
        }
        if (p !== p2) {
          confirmErr.style.display = 'block';
          confirmErr.innerText = 'Mật khẩu xác nhận không khớp';
          submit.disabled = true;
          submit.style.background = '#9ca3af';
          return false;
        }
        // minimum password length
        if (p.length < 4) {
          err.innerText = 'Mật khẩu phải có ít nhất 4 ký tự';
          submit.disabled = true;
          submit.style.background = '#9ca3af';
          return false;
        }
        submit.disabled = false;
        submit.style.background = '#4caf50';
        return true;
      }

      document.getElementById('reg-username').addEventListener('input', validateRegisterFields);
      document.getElementById('reg-password').addEventListener('input', validateRegisterFields);
      document.getElementById('reg-password2').addEventListener('input', validateRegisterFields);

      document.getElementById('reg-submit').addEventListener('click', async () => {
        if (!validateRegisterFields()) return;
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value;
        try {
          const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          const data = await res.json();
          if (res.ok) {
            showToast('Đăng ký thành công, mời bạn đăng nhập', 'success');
            closeRegisterModal();
          } else {
            document.getElementById('reg-error').innerText = data.error || 'Đăng ký thất bại';
            showToast(data.error || 'Đăng ký thất bại', 'error');
          }
        } catch (err) {
          document.getElementById('reg-error').innerText = 'Lỗi mạng';
          showToast('Lỗi mạng khi đăng ký', 'error');
        }
      });
      async function login() {
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!username || !password) {
          document.getElementById("error-msg").innerText = "Vui lòng nhập đầy đủ thông tin";
          return;
        }

        const res = await fetch("/api/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok) {
          showToast("Đăng nhập thành công", "success");
          localStorage.setItem("userId", data.userId);
          // ensure sound is OFF by default when logging in
          localStorage.setItem("soundEnabled", "false");
          // ensure background music default OFF on login
          try { localStorage.setItem('bgMusicEnabled','false'); } catch (e) {}
          // ensure whole-quiz timer is the default on login
          localStorage.setItem('timerMode', 'whole');
          // ensure a sensible default wholeTime exists (5 minutes) so results show correctly
          if (!localStorage.getItem('wholeTime')) localStorage.setItem('wholeTime', '300');
          setTimeout(() => { window.location.href = "/home.html"; }, 400);
        } else {
          const msg = data.error || "Đăng nhập thất bại";
          document.getElementById("error-msg").innerText = msg;
          showToast(msg, "error");
        }
      }

      async function register() {
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!username || !password) {
          document.getElementById("error-msg").innerText = "Vui lòng nhập đầy đủ thông tin";
          return;
        }

        const res = await fetch("/api/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (res.ok) {
          showToast("Đăng ký thành công, mời bạn đăng nhập", "success");
        } else {
          const msg = data.error || "Đăng ký thất bại";
          document.getElementById("error-msg").innerText = msg;
          showToast(msg, "error");
        }
      }

    // Toast helper (same as other pages)
    function showToast(message, type = "info", timeout = 2000) {
      const container = document.getElementById("toast-container");
      if (!container) return;
      const toast = document.createElement("div");
      toast.className = "toast-item";
      toast.style.minWidth = "220px";
      toast.style.marginBottom = "8px";
      toast.style.padding = "10px 14px";
      toast.style.borderRadius = "8px";
      toast.style.boxShadow = "0 6px 18px rgba(0,0,0,0.12)";
      toast.style.color = "#fff";
      toast.style.fontSize = "14px";
      toast.style.opacity = "0";
      toast.style.transition = "opacity 200ms, transform 200ms";
      toast.style.transform = "translateY(-6px)";

      if (type === "success") toast.style.background = "#16a34a"; // green
      else if (type === "error") toast.style.background = "#dc2626"; // red
      else toast.style.background = "#2563eb"; // blue

      toast.innerText = message;
      container.appendChild(toast);

      // animate in
      requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
      });

      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-6px)";
        setTimeout(() => container.removeChild(toast), 220);
      }, timeout);
    };

    