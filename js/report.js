const contentEl = document.getElementById('report-content');

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showLoginRequired() {
  contentEl.innerHTML = `
    <div class="report-login-required">
      <div class="lock-icon">🔒</div>
      <h2>Login Required</h2>
      <p>You need to sign in with Discord to submit a report.</p>
      <a href="/login" class="btn primary">Login with Discord</a>
    </div>`;
}

function showForm(user) {
  contentEl.innerHTML = `
    <div class="report-card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
        <img src="${esc(user.avatar)}" style="width:44px;height:44px;border-radius:50%;border:2px solid var(--green-light);" />
        <div>
          <div style="font-weight:700;color:#fff;">${esc(user.username)}</div>
          <div style="font-size:0.82rem;color:var(--text-muted);">Reporting as this user</div>
        </div>
      </div>

      <div id="report-msg" class="report-msg"></div>

      <form id="report-form">
        <div class="form-group">
          <label>Subject</label>
          <input type="text" name="subject" placeholder="What is this report about?" maxlength="100" required />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" placeholder="Describe the issue in detail..." maxlength="1500" required></textarea>
        </div>
        <div class="form-group">
          <label>Photo / Video (optional)</label>
          <div class="file-upload-area" id="file-upload-area">
            <input type="file" name="media" id="media-input" accept="image/*,video/*" />
            <div class="file-upload-icon">📎</div>
            <div>Click to upload a photo or video</div>
            <div id="file-upload-name" class="file-upload-name" style="display:none"></div>
          </div>
        </div>
        <button type="submit" class="btn primary" style="width:100%;margin-top:6px;" id="submit-btn">Submit Report</button>
      </form>
    </div>`;

  const mediaInput = document.getElementById('media-input');
  const uploadArea = document.getElementById('file-upload-area');
  const uploadName = document.getElementById('file-upload-name');

  mediaInput.addEventListener('change', () => {
    const file = mediaInput.files[0];
    if (file) {
      uploadArea.classList.add('has-file');
      uploadName.style.display = 'block';
      uploadName.textContent = '✅ ' + file.name;
    } else {
      uploadArea.classList.remove('has-file');
      uploadName.style.display = 'none';
    }
  });

  uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      mediaInput.files = e.dataTransfer.files;
      mediaInput.dispatchEvent(new Event('change'));
    }
  });

  document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const msg = document.getElementById('report-msg');
    btn.textContent = 'Sending...';
    btn.disabled = true;
    msg.style.display = 'none';
    msg.className = 'report-msg';

    try {
      const fd = new FormData(e.target);
      const res = await fetch(`${BOT_API_URL}/api/report`, {
        method: 'POST',
        credentials: 'include',
        body: fd
      });
      const data = await res.json();
      if (data.ok) {
        msg.textContent = '✅ Report submitted successfully! We will look into it.';
        msg.classList.add('success');
        e.target.reset();
        uploadArea.classList.remove('has-file');
        uploadName.style.display = 'none';
      } else {
        msg.textContent = '❌ ' + (data.error || 'Something went wrong.');
        msg.classList.add('error');
      }
    } catch {
      msg.textContent = '❌ Could not send report. Please try again.';
      msg.classList.add('error');
    }
    msg.style.display = 'block';
    btn.textContent = 'Submit Report';
    btn.disabled = false;
  });
}

document.addEventListener('navReady', (e) => {
  if (e.detail.loggedIn) {
    showForm(e.detail.user);
  } else {
    showLoginRequired();
  }
});
