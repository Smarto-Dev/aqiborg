// ===== Pure-JS SHA-256 (works on file://, http://, https://) =====
function sha256Sync(message) {
    const K = [
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const msg   = new TextEncoder().encode(message);
    const len   = msg.length;
    const total = Math.ceil((len + 9) / 64) * 64;
    const buf   = new Uint8Array(total);
    buf.set(msg);
    buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(total - 4, len * 8, false);
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    for (let i = 0; i < total; i += 64) {
        const w = new Uint32Array(64);
        for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4, false);
        for (let j = 16; j < 64; j++) {
            const s0 = rot(w[j-15],7)^rot(w[j-15],18)^(w[j-15]>>>3);
            const s1 = rot(w[j-2],17)^rot(w[j-2],19)^(w[j-2]>>>10);
            w[j] = (w[j-16]+s0+w[j-7]+s1)>>>0;
        }
        let [a,b,c,d,e,f,g,h] = H;
        for (let j = 0; j < 64; j++) {
            const S1   = rot(e,6)^rot(e,11)^rot(e,25);
            const ch   = (e&f)^(~e&g);
            const t1   = (h+S1+ch+K[j]+w[j])>>>0;
            const S0   = rot(a,2)^rot(a,13)^rot(a,22);
            const maj  = (a&b)^(a&c)^(b&c);
            const t2   = (S0+maj)>>>0;
            h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
        }
        H[0]=(H[0]+a)>>>0;H[1]=(H[1]+b)>>>0;H[2]=(H[2]+c)>>>0;H[3]=(H[3]+d)>>>0;
        H[4]=(H[4]+e)>>>0;H[5]=(H[5]+f)>>>0;H[6]=(H[6]+g)>>>0;H[7]=(H[7]+h)>>>0;
    }
    return H.map(x => x.toString(16).padStart(8,'0')).join('');
}

function sha256(text) {
    return sha256Sync(text);
}

// ===== Config =====
const ADMIN = {
    DEFAULT_HASH: '22a20875f50c1909712f37c9493df97115f136ca55b0db9f0c453b4c44762e58',
    SESSION_KEY:  'aqib_admin_session',
    DEFAULT_KEY:  'aqib_default_resume',
    HASH_KEY:     'aqib_admin_hash',
    HIDDEN_KEY:   'aqib_hidden_resumes',
};

// ===== Helpers =====
function getStoredHash()   { return localStorage.getItem(ADMIN.HASH_KEY) || ADMIN.DEFAULT_HASH; }
function isLoggedIn()      { return sessionStorage.getItem(ADMIN.SESSION_KEY) === 'true'; }
function getHiddenSet()    { try { return new Set(JSON.parse(localStorage.getItem(ADMIN.HIDDEN_KEY) || '[]')); } catch { return new Set(); } }
function saveHiddenSet(s)  { localStorage.setItem(ADMIN.HIDDEN_KEY, JSON.stringify([...s])); }

function hide(id) { document.getElementById(id).style.display = 'none'; }
function show(id, d) { document.getElementById(id).style.display = d || 'block'; }

// ===== Views =====
function showDashboard() {
    hide('login-view');
    show('dashboard-view');
    renderResumeList();
}

function showLogin(msg) {
    show('login-view');
    hide('dashboard-view');
    document.getElementById('password-input').value    = '';
    document.getElementById('login-error').textContent = msg || '';
}

// ===== Resume List =====
function renderResumeList() {
    const resumes   = window.RESUME_DATA || {};
    const hidden    = getHiddenSet();
    const defaultKey = localStorage.getItem(ADMIN.DEFAULT_KEY) || Object.keys(resumes)[0];
    const list      = document.getElementById('resume-list');
    const toast     = document.getElementById('save-toast');

    list.innerHTML = Object.entries(resumes).map(([key, data]) => {
        const isDefault = key === defaultKey;
        const isHidden  = hidden.has(key);
        return `
        <div class="resume-card ${isDefault && !isHidden ? 'is-default' : ''} ${isHidden ? 'is-hidden' : ''}">
            <div class="resume-info">
                <div class="resume-title">${data.title}</div>
                <div class="resume-slug">#${key}</div>
                <div class="resume-badges">
                    ${isDefault && !isHidden ? '<span class="badge-default">Default</span>' : ''}
                    ${isHidden ? '<span class="badge-hidden">Hidden</span>' : ''}
                </div>
            </div>
            <div class="resume-actions">
                <button class="btn-set" data-key="${key}" ${isDefault || isHidden ? 'disabled' : ''}>
                    ${isDefault && !isHidden ? '&#10003; Default' : 'Set Default'}
                </button>
                <label class="toggle-wrap" title="${isHidden ? 'Show resume' : 'Hide resume'}">
                    <input type="checkbox" class="toggle-input" data-key="${key}" ${isHidden ? '' : 'checked'}>
                    <span class="toggle-track">
                        <span class="toggle-thumb"></span>
                    </span>
                    <span class="toggle-label">${isHidden ? 'Hidden' : 'Visible'}</span>
                </label>
            </div>
        </div>`;
    }).join('');

    function flashToast() {
        toast.style.display = 'block';
        renderResumeList();
        setTimeout(() => { toast.style.display = 'none'; }, 2500);
    }

    // Set Default
    list.querySelectorAll('.btn-set:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.setItem(ADMIN.DEFAULT_KEY, btn.dataset.key);
            flashToast();
        });
    });

    // Visibility Toggle
    list.querySelectorAll('.toggle-input').forEach(cb => {
        cb.addEventListener('change', () => {
            const key = cb.dataset.key;
            const set = getHiddenSet();
            if (cb.checked) {
                set.delete(key);
            } else {
                set.add(key);
                if (localStorage.getItem(ADMIN.DEFAULT_KEY) === key) {
                    localStorage.removeItem(ADMIN.DEFAULT_KEY);
                }
            }
            saveHiddenSet(set);
            flashToast();
        });
    });
}

// ===== Login =====
document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const password  = document.getElementById('password-input').value;
    const loginErr  = document.getElementById('login-error');
    const loginBtn  = document.getElementById('login-btn');
    const loginText = document.getElementById('login-btn-text');
    const loginSpin = document.getElementById('login-spinner');

    if (!password) { loginErr.textContent = 'Enter your password.'; return; }

    loginText.style.display = 'none';
    loginSpin.style.display = 'inline-block';
    loginBtn.disabled       = true;
    loginErr.textContent    = '';

    try {
        const hash = sha256(password);
        if (hash === getStoredHash()) {
            sessionStorage.setItem(ADMIN.SESSION_KEY, 'true');
            showDashboard();
            return;
        } else {
            loginErr.textContent = 'Incorrect password.';
        }
    } catch (err) {
        loginErr.textContent = 'Error: ' + err.message;
    }

    loginText.style.display = 'inline';
    loginSpin.style.display = 'none';
    loginBtn.disabled       = false;
});

// ===== Change Password =====
document.getElementById('change-password-form').addEventListener('submit', e => {
    e.preventDefault();
    const pwErr     = document.getElementById('pw-error');
    const pwSuccess = document.getElementById('pw-success');
    const newPw     = document.getElementById('new-password').value;
    const confirmPw = document.getElementById('confirm-password').value;

    pwErr.textContent          = '';
    pwSuccess.style.display    = 'none';

    if (newPw.length < 6)    { pwErr.textContent = 'Password must be at least 6 characters.'; return; }
    if (newPw !== confirmPw) { pwErr.textContent = 'Passwords do not match.'; return; }

    localStorage.setItem(ADMIN.HASH_KEY, sha256(newPw));
    sessionStorage.removeItem(ADMIN.SESSION_KEY);
    document.getElementById('new-password').value     = '';
    document.getElementById('confirm-password').value = '';
    pwSuccess.style.display = 'block';
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
isLoggedIn() ? showDashboard() : showLogin();
