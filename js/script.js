class ResumeApp {
    constructor() {
        this.serverConfig = { default_resume: '', hidden_resumes: [] };
        this.init();
    }

    async init() {
        await this.loadServerConfig();
        const data = await this.loadResume();
        if (data) this.render(data);
        this.setupDarkMode();
        this.setupScrollTop();
    }

    // ----- Data -----
    async loadServerConfig() {
        if (window.location.protocol === 'file:') return;
        try {
            const r = await fetch('data/config.json?t=' + Date.now());
            if (r.ok) this.serverConfig = await r.json();
        } catch (_) {}
    }

    async loadResume() {
        let all = {};
        try {
            if (window.location.protocol === 'file:') {
                all = window.RESUME_DATA || {};
            } else {
                const res = await fetch('data/resumes.json', { cache: 'no-store' });
                all = res.ok ? await res.json() : (window.RESUME_DATA || {});
            }
        } catch (_) { all = window.RESUME_DATA || {}; }

        const hidden = new Set(this.serverConfig.hidden_resumes || []);
        const keys = Object.keys(all).filter(k => !hidden.has(k));
        if (!keys.length) return null;
        const def = this.serverConfig.default_resume;
        const key = (def && keys.includes(def)) ? def : keys[0];
        return all[key];
    }

    // ----- Helpers -----
    icon(name) { return `<svg aria-hidden="true"><use href="#i-${name}"></use></svg>`; }

    normalizeUrl(u) {
        if (!u) return '#';
        return /^https?:\/\//i.test(u) ? u : 'https://' + u.replace(/^\/+/, '');
    }
    phoneHref(p) { return (p || '').replace(/[^0-9+]/g, ''); }
    esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    set(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }

    // ----- Render -----
    render(d) {
        document.title = `${d.name} | ${d.title}`;

        // Brand
        if (d.brand) {
            this.set('brand-name', this.esc(d.brand.name || d.name));
            this.set('brand-tag', this.esc(d.brand.tagline || ''));
        }

        // Masthead
        this.set('name', this.esc(d.name || ''));
        this.set('title', this.esc(d.title || ''));
        this.set('roles', (d.roles || []).map(r =>
            `<span class="role-chip">${this.icon('leaf')}${this.esc(r)}</span>`).join(''));

        this.renderStats(d.stats || []);
        this.set('profile-content', this.esc(d.profile || ''));
        this.renderStrengths(d.strengths || []);
        this.renderExperience(d.experience || []);
        this.renderEducation(d.education || []);
        this.renderPublication(d.publication);
        this.renderProjects(d.projects || []);

        // Sidebar
        this.renderContact(d.contact || {});
        this.renderCheckList('licences-content', d.licences || []);
        this.renderCheckList('certs-content', d.certifications || []);
        this.renderSkills(d.skills || {});
        this.set('memberships-content', (d.memberships || []).map(m =>
            `<li>${this.esc(m)}</li>`).join(''));

        // Footer
        const f = d.footer || {};
        this.set('foot-based', this.esc(f.based || ''));
        this.set('foot-note', this.esc(f.note || ''));
        this.set('foot-motto', this.esc(f.motto || ''));
    }

    renderStats(stats) {
        this.set('stats-row', stats.map(s => `
            <button class="stat" data-target="${this.esc(s.target || '')}" type="button">
                <span class="stat-value">${this.esc(s.value)}</span>
                <span class="stat-label">${this.esc(s.label)}</span>
            </button>`).join(''));

        document.querySelectorAll('.stat').forEach(btn => {
            btn.addEventListener('click', () => this.jumpTo(btn.dataset.target));
        });
    }

    renderStrengths(items) {
        this.set('strengths-content', items.map(s => `
            <div class="strength">
                <div class="strength-ic">${this.icon(s.icon || 'leaf')}</div>
                <div class="strength-title">${this.esc(s.title)}</div>
                <div class="strength-text">${this.esc(s.text)}</div>
            </div>`).join(''));
    }

    renderExperience(items) {
        this.set('experience-content', items.map(x => `
            <div class="xp-item">
                <div class="xp-node">${this.icon(x.icon || 'leaf')}</div>
                <div class="xp-head">
                    <div class="xp-role">${this.esc(x.role)}</div>
                    <div class="xp-meta">${this.esc(x.period || '')}${x.location ? `<br>${this.esc(x.location)}` : ''}</div>
                </div>
                <div class="xp-company">${this.esc(x.company)}</div>
                <ul class="xp-bullets">${(x.highlights || []).map(h => `<li>${this.esc(h)}</li>`).join('')}</ul>
            </div>`).join(''));
    }

    renderEducation(items) {
        this.set('education-content', items.map(e => `
            <div class="edu-item">
                <div class="edu-top">
                    <div class="edu-degree">${this.esc(e.degree)}</div>
                    ${e.period ? `<div class="edu-period">${this.esc(e.period)}</div>` : ''}
                </div>
                ${e.school ? `<div class="edu-school">${this.esc(e.school)}</div>` : ''}
                ${e.detail ? `<div class="edu-detail">${this.esc(e.detail)}</div>` : ''}
            </div>`).join(''));
    }

    renderPublication(pub) {
        if (!pub) { this.set('publication-content', ''); return; }
        // Bold the leading author/year portion up to the first sentence end.
        const m = String(pub).match(/^(.*?\(\d{4}\)\.)\s*(.*)$/);
        const html = m ? `<b>${this.esc(m[1])}</b> ${this.esc(m[2])}` : this.esc(pub);
        this.set('publication-content', `<div class="pub-card">${html}</div>`);
    }

    renderProjects(items) {
        this.set('projects-content', items.map(p => `
            <div class="ach">
                <div class="ach-ic">${this.icon(p.icon || 'leaf')}</div>
                <div>
                    <div class="ach-name">${this.esc(p.name)}</div>
                    <div class="ach-text">${this.esc(p.description)}</div>
                </div>
            </div>`).join(''));
    }

    renderContact(c) {
        const rows = [];
        if (c.phone) rows.push(`<div class="contact-row"><span class="contact-ic">${this.icon('phone')}</span><a href="tel:${this.phoneHref(c.phone)}">${this.esc(c.phone)}</a></div>`);
        if (c.email) rows.push(`<div class="contact-row"><span class="contact-ic">${this.icon('mail')}</span><a href="mailto:${this.esc(c.email)}">${this.esc(c.email)}</a></div>`);
        if (c.location) rows.push(`<div class="contact-row"><span class="contact-ic">${this.icon('pin')}</span><span>${this.esc(c.location)}${c.travel ? `<span class="contact-sub">${this.esc(c.travel)}</span>` : ''}</span></div>`);
        if (c.vehicle) rows.push(`<div class="contact-row"><span class="contact-ic">${this.icon('car')}</span><span>${this.esc(c.vehicle)}</span></div>`);
        if (c.linkedin) rows.push(`<div class="contact-row"><span class="contact-ic">${this.icon('link')}</span><a href="${this.normalizeUrl(c.linkedin)}" target="_blank" rel="noopener noreferrer">${this.esc(c.linkedin)}</a></div>`);
        this.set('contact-content', rows.join(''));
    }

    renderCheckList(id, items) {
        this.set(id, items.map(i =>
            `<li><span class="check-ic">${this.icon('check')}</span><span>${this.esc(i)}</span></li>`).join(''));
    }

    renderSkills(groups) {
        const map = { 'Ecology & Field': 'leaf', 'GIS & Spatial': 'map', 'Software & Analysis': 'laptop' };
        this.set('skills-content', Object.entries(groups).map(([name, items]) => `
            <div class="skill-group">
                <div class="skill-group-name">${this.icon(map[name] || 'leaf')}${this.esc(name)}</div>
                <ul class="mini-list">${items.map(t => `<li>${this.esc(t)}</li>`).join('')}</ul>
            </div>`).join(''));
    }

    // ----- Jump + glow -----
    jumpTo(targetId) {
        const el = document.getElementById(targetId);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.remove('glow-highlight');
        void el.offsetWidth;           // restart animation
        el.classList.add('glow-highlight');
        setTimeout(() => el.classList.remove('glow-highlight'), 5100);
    }

    // ----- Dark mode -----
    setupDarkMode() {
        const btn = document.getElementById('dark-toggle');
        const apply = theme => {
            document.documentElement.dataset.theme = theme;
            if (btn) btn.innerHTML = theme === 'dark' ? '&#9728;' : '&#9680;';
            localStorage.setItem('theme', theme);
        };
        apply(localStorage.getItem('theme') || 'light');
        btn?.addEventListener('click', () =>
            apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
    }

    // ----- Scroll to top -----
    setupScrollTop() {
        const btn = document.getElementById('scroll-top-btn');
        if (!btn) return;
        window.addEventListener('scroll', () => {
            btn.classList.toggle('visible', window.scrollY > 300);
        }, { passive: true });
        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
}

document.addEventListener('DOMContentLoaded', () => new ResumeApp());
