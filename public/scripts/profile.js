
      // small toast helper for non-blocking messages
      function showToast(message, type = 'info', timeout = 1800) {
        let container = document.getElementById('toast-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'toast-container';
          container.style.position = 'fixed';
          container.style.top = '14px';
          container.style.right = '14px';
          container.style.zIndex = 9999;
          document.body.appendChild(container);
        }
        const t = document.createElement('div');
        t.innerText = message;
        t.style.padding = '8px 12px';
        t.style.marginBottom = '8px';
        t.style.borderRadius = '8px';
        t.style.color = '#fff';
        t.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
        t.style.opacity = '0';
        t.style.transition = 'opacity 160ms, transform 160ms';
        if (type === 'success') t.style.background = '#16a34a';
        else if (type === 'error') t.style.background = '#dc2626';
        else t.style.background = '#2563eb';
        container.appendChild(t);
        requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 180); }, timeout);
      }
      const userId = localStorage.getItem("userId");

      if (!userId) {
        window.location.href = "/login.html";
      } else {
        fetch(`/api/profile/${userId}`)
          .then((res) => res.json())
          .then((user) => {
            document.getElementById("avatar-preview").src =
              user.avatar || "/default-avatar.png";
            document.getElementById("display-name").value =
              user.displayName || "User";
            document.getElementById("high-score").innerText =
              user.highScore || 0;
          })
          .catch((err) => {
            console.error("Error loading profile:", err);
          });
      }

      document
        .getElementById("avatar-input")
        .addEventListener("change", function (event) {
          const file = event.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
              document.getElementById("avatar-preview").src = e.target.result;
            };
            reader.readAsDataURL(file);
          }
        });

      function cancel() {
        window.location.href = "/home.html";
      }

      function saveProfile() {
        const displayName = document.getElementById("display-name").value;
        const avatarFile = document.getElementById("avatar-input").files[0];

        const formData = new FormData();
        formData.append("displayName", displayName);
        if (avatarFile) {
          formData.append("avatar", avatarFile);
        }

        fetch(`/api/profile/${userId}`, {
          method: "PUT",
          body: formData,
        })
          .then((res) => res.json())
          .then(() => {
              showToast('Cập nhật hồ sơ thành công!', 'success');
              setTimeout(() => { window.location.href = '/home.html'; }, 700);
            })
          .catch((err) => {
            console.error("Error saving profile:", err);
          });
      }
    