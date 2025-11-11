const userId = localStorage.getItem("userId");

      if (!userId) {
        window.location.href = "/login.html";
      } else {
        fetch(`/api/profile/${userId}`)
          .then((res) => res.json())
          .then((user) => {
            document.getElementById("avatar").src =
              user.avatar || "/default-avatar.png";
            document.getElementById("display-name").innerText =
              user.displayName || "User";
            document.getElementById("high-score").innerText =
              user.highScore || 0;
          })
          .catch((err) => {
            console.error("Error loading profile:", err);
          });
      }

      // Background music control (default OFF when not set)
      const BGM_KEY = 'bgMusicEnabled';
        const bgSwitch = document.getElementById('bg-switch');
      const bgAudio = document.getElementById('bg-music-audio');
      try {
        const savedBg = localStorage.getItem(BGM_KEY) === 'true';
          if (bgSwitch) {
            // initialize UI
            bgSwitch.checked = !!savedBg;
            // if saved true, try to start playing (best-effort)
            if (savedBg) {
              bgAudio.play().catch(() => {
                // autoplay blocked; reflect off state and notify user
                bgSwitch.checked = false;
                localStorage.setItem(BGM_KEY, 'false');
                showToast('Trình duyệt chặn autoplay. Vui lòng tương tác để phát nhạc.', 'error');
              });
            }

            bgSwitch.addEventListener('change', async () => {
              if (bgSwitch.checked) {
                try {
                  await bgAudio.play();
                  localStorage.setItem(BGM_KEY, 'true');
                } catch (e) {
                  bgSwitch.checked = false;
                  localStorage.setItem(BGM_KEY, 'false');
                  showToast('Trình duyệt chặn autoplay. Vui lòng tương tác để phát nhạc.', 'error');
                }
              } else {
                bgAudio.pause();
                bgAudio.currentTime = 0;
                localStorage.setItem(BGM_KEY, 'false');
              }
            });

            // sync across pages/tabs: update UI and play/pause audio when storage changes
            window.addEventListener('storage', (ev) => {
              if (ev.key === BGM_KEY) {
                const val = ev.newValue === 'true';
                if (bgSwitch.checked !== val) bgSwitch.checked = val;
                if (val) {
                  bgAudio.play().catch(() => {});
                } else {
                  bgAudio.pause();
                  bgAudio.currentTime = 0;
                }
              }
            });
        }
      } catch (e) { console.debug('bg init err', e); }

      async function startQuiz() {
        const numQuestions = parseInt(document.getElementById("num-questions").value, 10);
        if (!numQuestions || numQuestions <= 0) {
          showToast("lựa chọn không hợp lệ mời chọn lại số lượng câu hỏi", "error");
          return;
        }
        try {
          // When starting a quiz, validate against the full question pool
          const res = await fetch(`/api/questions?all=true`);
          if (!res.ok) throw new Error('Network response was not ok');
          const data = await res.json();
          if (!Array.isArray(data)) throw new Error('Invalid response');
          if (data.length < numQuestions) {
            showToast("lựa chọn không hợp lệ mời chọn lại số lượng câu hỏi", "error");
            return;
          }
          localStorage.setItem("numQuestions", String(numQuestions));
          // give a small delay so toast (if any) is visible, then navigate
          setTimeout(() => { window.location.href = "/quiz.html"; }, 120);
        } catch (err) {
          console.error('Error validating questions:', err);
          showToast("Có lỗi khi kiểm tra số lượng câu hỏi. Vui lòng thử lại.", "error");
        }
      }

      function addQuestion() {
        window.location.href = "/add-question.html";
      }

      function editProfile() {
        window.location.href = "/profile.html";
      }

      function logout() {
        localStorage.removeItem("userId");
        window.location.href = "/login.html";
      }

      // Sound toggle: default OFF
      const SOUND_KEY = "soundEnabled";
      const soundSwitch = document.getElementById("sound-switch");

      // Initialize switch (default OFF)
      const saved = localStorage.getItem(SOUND_KEY);
      const enabled = saved === "true"; // default false
      soundSwitch.checked = !!enabled;

      soundSwitch.addEventListener("change", () => {
        localStorage.setItem(SOUND_KEY, soundSwitch.checked ? "true" : "false");
      });

      

      // Timer mode controls
      const MODE_KEY = 'timerMode'; // 'whole' or 'perq'
      const WHOLE_KEY = 'wholeTime'; // seconds
      const PERQ_KEY = 'perQuestionTime'; // seconds

      const modeWholeBtn = document.getElementById('mode-whole');
      const modePerqBtn = document.getElementById('mode-perq');
      const wholeSelect = document.getElementById('whole-time');
      const perqSelect = document.getElementById('perq-time');

      function setMode(mode) {
        localStorage.setItem(MODE_KEY, mode);
        if (mode === 'whole') {
          modeWholeBtn.classList.add('active');
          modePerqBtn.classList.remove('active');
          perqSelect.disabled = true;
          wholeSelect.disabled = false;
        } else {
          modePerqBtn.classList.add('active');
          modeWholeBtn.classList.remove('active');
          wholeSelect.disabled = true;
          perqSelect.disabled = false;
        }
      }

      // Initialize timer settings
  const savedMode = localStorage.getItem(MODE_KEY) || 'whole';
      const savedWhole = localStorage.getItem(WHOLE_KEY) || '300';
      const savedPerq = localStorage.getItem(PERQ_KEY) || '10';
      wholeSelect.value = savedWhole;
      perqSelect.value = savedPerq;
      setMode(savedMode);

      modeWholeBtn.addEventListener('click', () => setMode('whole'));
      modePerqBtn.addEventListener('click', () => setMode('perq'));

      wholeSelect.addEventListener('change', () => {
        localStorage.setItem(WHOLE_KEY, wholeSelect.value);
      });
      perqSelect.addEventListener('change', () => {
        localStorage.setItem(PERQ_KEY, perqSelect.value);
      });

      // Toast helper (same style as quiz)
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
      }