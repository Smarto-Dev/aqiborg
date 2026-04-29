const ADMIN = {
    DEFAULT_HASH: '22a20875f50c1909712f37c9493df97115f136ca55b0db9f0c453b4c44762e58',
    SESSION_KEY:  'aqib_admin_session',
    DEFAULT_KEY:  'aqib_default_resume',
    HASH_KEY:     'aqib_admin_hash',
};

async function sha256(text) {
    const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStoredHash() {
    return localStorage.getItem(ADMIN.HASH_KEY) || ADMIN.DEFAULT_HASH;
}

function isLoggedIn() {
    return sessionStorage.getItem(ADMIN.SESSION_KEY) === 'true';
}

function showDashboard() {
    document.getElementById('login-view').hidden    = true;
    document.getElementById('dashboard-view').hidden = false;
    renderResumeList();
}

function showLogin(msg) {
    document.getElementById('login-view').hidden    = false;
    document.getElementById('dashboard-view').hidden = true;
    document.getElementById('password-input').value  = '';
    if (msg) document.getElementById('login-error').textContent = msg;
}

// ===== Resume List =====
function renderResumeList() {
    const resumes = window.RESUME_DATA || {};
    const current = localStorage.getItem(ADMIN.DEFAULT_KEY) || Object.keys(resumes)[0];
    const list    = document.getElementById('resume-list');
    const toast   = document.getElementById('save-toast');

    list.innerHTML = Object.entries(resumes).map(([key, data]) => {
        const isDefault = key === current;
        return `
            <div class="resume-card ${isDefault ? 'is-default' : ''}">
                <div class="resume-info">
                    <div class="resume-title">${data.title}</div>
                    <div class="resume-slug">#${key}</div>
                    ${isDefault ? '<span class="badge-default">Current Default</span>' : ''}
                </div>
                <button class="btn-set" data-key="${key}" ${isDefault ? 'disabled' : ''}>
                    ${isDefault ? '&#10003; Default' : 'Set as Default'}
                </button>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.btn-set:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.setItem(ADMIN.DEFAULT_KEY, btn.dataset.key);
            toast.hidden = false;
            renderResumeList();
            setTimeout(() => { toast.hidden = true; }, 2500);
        });
    });
}

// ===== Login Form =====
const loginForm = document.getElementById('login-form');
const loginBtn  = document.getElementById('login-btn');
const loginText = document.getElementById('login-btn-text');
const loginSpin = document.getElementById('login-spinner');
const loginErr  = document.getElementById('login-error');

loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const password = document.getElementById('password-input').value;
    if (!password) { loginErr.textContent = 'Enter your password.'; return; }

    loginText.hidden = true;
    loginSpin.hidden = false;
    loginBtn.disabled = true;
    loginErr.textContent = '';

    const hash = await sha256(password);

    // Tiny artificial delay so the spinner is visible
    await new Promise(r => setTimeout(r, 350));

    if (hash === getStoredHash()) {
        sessionStorage.setItem(ADMIN.SESSION_KEY, 'true');
        showDashboard();
    } else {
        loginErr.textContent = 'Incorrect password.';
    }

    loginText.hidden = false;
    loginSpin.hidden = true;
    loginBtn.disabled = false;
});

// ===== Change Password Form =====
document.getElementById('change-password-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pwErr     = document.getElementById('pw-error');
    const pwSuccess = document.getElementById('pw-success');
    const newPw     = document.getElementById('new-password').value;
    const confirmPw = document.getElementById('confirm-password').value;

    pwErr.textContent = '';
    pwSuccess.hidden  = true;

    if (newPw.length < 6) {
        pwErr.textContent = 'Password must be at least 6 characters.';
        return;
    }
    if (newPw !== confirmPw) {
        pwErr.textContent = 'Passwords do not match.';
        return;
    }

    const hash = await sha256(newPw);
    localStorage.setItem(ADMIN.HASH_KEY, hash);
    sessionStorage.removeItem(ADMIN.SESSION_KEY);

    document.getElementById('new-password').value     = '';
    document.getElementById('confirm-password').value = '';
    pwSuccess.hidden = false;

    setTimeout(() => showLogin('Password changed. Please log in again.'), 1800);
});

// ===== Logout =====
document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(ADMIN.SESSION_KEY);
    showLogin();
});

// ===== Dark Mode =====
function setupDarkMode() {
    const apply = theme => {
        document.documentElement.dataset.theme = theme;
        ['dark-toggle-login', 'dark-toggle-dash'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = theme === 'dark' ? '&#9728;' : '&#9681;';
        });
        localStorage.setItem('theme', theme);
    };

    apply(localStorage.getItem('theme') || 'light');

    ['dark-toggle-login', 'dark-toggle-dash'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
        });
    });
}

// ===== Init =====
setupDarkMode();
if (isLoggedIn()) {
    showDashboard();
} else {
    showLogin();
}
