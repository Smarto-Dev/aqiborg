class ResumeApp {
    constructor() {
        this.resumes = {};
        this.currentRole = null;
        this.typewriterTimer = null;
        this.toastTimer = null;
        this.init();
    }

    async init() {
        await this.loadResumes();
        this.setupDarkMode();
        this.setupScrollBehavior();
        this.setupScrollAnimations();
        this.setupSectionNav();
        this.loadFromHash();
        window.addEventListener('hashchange', () => this.loadFromHash());
    }

    async loadResumes() {
        const fallbackResumes = window.RESUME_DATA || {};
        try {
            if (window.location.protocol === 'file:') {
                this.resumes = fallbackResumes;
                return;
            }
            const res = await fetch('data/resumes.json', { cache: 'no-store' });
            if (!res.ok) throw new Error(`Resume data request failed with ${res.status}`);
            this.resumes = await res.json();
        } catch (e) {
            console.error('Could not load resumes.json', e);
            this.resumes = fallbackResumes;
        } finally {
            this.renderRolePills();
        }
    }

    loadFromHash() {
        const hash  = window.location.hash.slice(1);
        const roles = Object.keys(this.resumes);
        if (!roles.length) return;
        const saved = localStorage.getItem('aqib_default_resume');
        let role;
        if (hash && roles.includes(hash))        role = hash;
        else if (saved && roles.includes(saved)) role = saved;
        else                                     role = roles[0];
        this.switchRole(role);
    }

    renderRolePills() {
        const container = document.getElementById('role-pills');
        container.innerHTML = '';
        Object.entries(this.resumes).forEach(([key, data]) => {
            const btn = document.createElement('button');
            btn.className = 'role-pill';
            btn.textContent = data.title;
            btn.dataset.role = key;
            btn.addEventListener('click', () => { window.location.hash = key; });
            container.appendChild(btn);
        });
    }

    switchRole(role) {
        if (role === this.currentRole) return;
        this.currentRole = role;

        document.querySelectorAll('.role-pill').forEach(p => {
            p.classList.toggle('active', p.dataset.role === role);
        });

        const fadeEls = [document.getElementById('layout'), document.getElementById('stats-row')];
        fadeEls.forEach(el => { if (el) el.style.opacity = '0'; });

        setTimeout(() => {
            this.renderResume(this.resumes[role]);
            fadeEls.forEach(el => { if (el) el.style.opacity = '1'; });
            setTimeout(() => this.triggerVisibleAnimations(), 60);
        }, 180);
    }

    renderResume(data) {
        if (!data) return;

        const name = data.name || 'Aqib';
        document.title = `${name} | ${data.title}`;

        // Avatar initials
        const avatar = document.getElementById('hero-avatar');
        if (avatar) {
            const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
            avatar.textContent = initials;
        }

        document.getElementById('hero-name').textContent = name;
        document.getElementById('hero-role-badge').textContent = data.title;
        document.getElementById('hero-tagline').textContent = data.tagline || '';
        this.typewrite(document.getElementById('hero-title'), data.subtitle || data.title);
        this.renderHeroLinks(data.contact || {});
        this.renderStats(data.stats || []);
        this.renderSkills(data.skills || {});
        this.renderEducation(data.education || []);
        this.renderContact(data.contact || {});
        document.getElementById('summary-content').textContent = data.summary || '';
        this.renderExperience(data.experience || []);
        this.renderProjects(data.projects || []);
    }

    renderHeroLinks(contact) {
        const container = document.getElementById('hero-links');
        const links = [
            contact.email    && { href: `mailto:${contact.email}`,                  text: `&#9993; ${contact.email}` },
            contact.phone    && { href: `tel:${this.phoneHref(contact.phone)}`,      text: `&#9742; ${contact.phone}` },
            contact.website  && { href: this.normalizeUrl(contact.website),  blank: true, text: '&#9737; Website' },
            contact.github   && { href: this.normalizeUrl(contact.github),   blank: true, text: '&#8984; GitHub' },
            contact.linkedin && { href: this.normalizeUrl(contact.linkedin), blank: true, text: '&#9734; LinkedIn' },
        ].filter(Boolean);

        container.innerHTML = links.map(l =>
            `<a href="${l.href}" class="hero-link"${l.blank ? ' target="_blank" rel="noopener noreferrer"' : ''}>${l.text}</a>`
        ).join('');
    }

    renderStats(stats) {
        const grid = document.getElementById('stats-grid');
        grid.innerHTML = stats.map(s => `
            <div class="stat-item">
                ${s.icon ? `<span class="stat-icon">${s.icon}</span>` : ''}
                <span class="stat-value" data-target="${s.value}">${s.value}</span>
                <span class="stat-label">${s.label}</span>
            </div>
        `).join('');
        this.animateCounters();
    }

    animateCounters() {
        const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
        document.querySelectorAll('.stat-value').forEach(el => {
            const raw = el.dataset.target;
            const num = parseInt(raw);
            if (isNaN(num)) return;
            const suffix = raw.replace(/[0-9]/g, '');
            const duration = 1300;
            const start = performance.now();
            const tick = now => {
                const t = Math.min((now - start) / duration, 1);
                el.textContent = Math.floor(easeOutQuart(t) * num) + suffix;
                if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }

    renderSkills(skills) {
        const container = document.getElementById('skills-content');
        if (Array.isArray(skills)) {
            container.innerHTML = `<div class="skill-tags">${skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}</div>`;
        } else {
            container.innerHTML = Object.entries(skills).map(([group, tags]) => `
                <div class="skill-group">
                    <div class="skill-group-name">${group}</div>
                    <div class="skill-tags">${tags.map(t => `<span class="skill-tag">${t}</span>`).join('')}</div>
                </div>
            `).join('');
        }
    }

    staggerSkillTags(card) {
        const tags = [...card.querySelectorAll('.skill-tag:not(.visible)')];
        tags.forEach((tag, i) => {
            tag.style.transitionDelay = `${i * 38}ms`;
        });
        requestAnimationFrame(() => {
            tags.forEach(tag => tag.classList.add('visible'));
        });
        // Clear delays after animations finish so hover is instant
        const clearDelay = tags.length * 38 + 350;
        setTimeout(() => tags.forEach(tag => { tag.style.transitionDelay = ''; }), clearDelay);
    }

    renderEducation(education) {
        const container = document.getElementById('education-content');
        container.innerHTML = education.map(edu => {
            if (typeof edu === 'string') return `<div class="edu-item"><div class="edu-degree">${edu}</div></div>`;
            return `
                <div class="edu-item">
                    <div class="edu-degree">${edu.degree}</div>
                    ${edu.school  ? `<div class="edu-school">${edu.school}</div>`    : ''}
                    ${edu.period  ? `<div class="edu-period">${edu.period}</div>`    : ''}
                    ${edu.detail  ? `<div class="edu-detail">${edu.detail}</div>`    : ''}
                </div>
            `;
        }).join('');
    }

    renderContact(contact) {
        const container = document.getElementById('contact-content');
        const items = [
            contact.email    && { icon: '&#9993;', href: `mailto:${contact.email}`,               text: contact.email,    copy: contact.email },
            contact.phone    && { icon: '&#9742;', href: `tel:${this.phoneHref(contact.phone)}`,   text: contact.phone,    copy: contact.phone },
            contact.location && { icon: '&#9673;',                                                 text: contact.location },
            contact.website  && { icon: '&#9737;', href: this.normalizeUrl(contact.website),  ext: true, text: contact.website,  copy: contact.website },
            contact.github   && { icon: '&#8984;', href: this.normalizeUrl(contact.github),   ext: true, text: contact.github,   copy: contact.github },
            contact.linkedin && { icon: '&#9734;', href: this.normalizeUrl(contact.linkedin), ext: true, text: contact.linkedin, copy: contact.linkedin },
        ].filter(Boolean);

        container.innerHTML = items.map(item =>
            item.href
                ? `<a href="${item.href}" class="contact-item copyable" data-copy="${item.copy || ''}"${item.ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>
                     <span class="contact-icon">${item.icon}</span>${item.text}
                   </a>`
                : `<div class="contact-item"><span class="contact-icon">${item.icon}</span>${item.text}</div>`
        ).join('');

        container.querySelectorAll('.contact-item.copyable[data-copy]').forEach(el => {
            el.addEventListener('click', e => {
                e.preventDefault();
                const text = el.dataset.copy;
                if (!text) return;
                navigator.clipboard.writeText(text)
                    .then(() => this.showToast(`Copied: ${text}`))
                    .catch(() => this.showToast('Copy not supported in this browser'));
            });
        });
    }

    renderExperience(experience) {
        const container = document.getElementById('experience-content');
        container.innerHTML = experience.map(exp => {
            if (typeof exp === 'string') {
                return `<div class="timeline-item"><div class="timeline-role">${exp}</div></div>`;
            }
            return `
                <div class="timeline-item">
                    <div class="timeline-header">
                        <span class="timeline-role">${exp.role}</span>
                        ${exp.period ? `<span class="timeline-period">${exp.period}</span>` : ''}
                    </div>
                    ${exp.company ? `<div class="timeline-company">${exp.company}${exp.location ? ' &middot; ' + exp.location : ''}</div>` : ''}
                    ${Array.isArray(exp.highlights) ? `
                        <ul class="timeline-highlights">
                            ${exp.highlights.map(h => `<li>${h}</li>`).join('')}
                        </ul>` : ''}
                </div>
            `;
        }).join('');
    }

    renderProjects(projects) {
        const card = document.getElementById('projects-card');
        if (!projects || !projects.length) {
            card.style.display = 'none';
            return;
        }
        card.style.display = '';
        document.getElementById('projects-content').innerHTML = projects.map(p => `
            <div class="project-card${p.highlight ? ' featured' : ''}">
                <div class="project-name">${p.name}</div>
                <div class="project-desc">${p.description}</div>
                ${p.tech ? `<div class="project-tech">${p.tech.map(t => `<span class="tech-tag">${t}</span>`).join('')}</div>` : ''}
                ${p.url ? `<a href="${this.normalizeUrl(p.url)}" class="project-link" target="_blank" rel="noopener noreferrer">View Project &#8599;</a>` : ''}
            </div>
        `).join('');
    }

    typewrite(el, text) {
        clearTimeout(this.typewriterTimer);
        el.textContent = '';
        el.classList.remove('typewriter-cursor');
        let i = 0;
        const type = () => {
            if (i < text.length) {
                el.textContent += text[i++];
                this.typewriterTimer = setTimeout(type, 35 + Math.random() * 35);
            } else {
                el.classList.add('typewriter-cursor');
            }
        };
        setTimeout(type, 250);
    }

    setupScrollBehavior() {
        const progress = document.getElementById('scroll-progress');
        const topBtn   = document.getElementById('scroll-top-btn');

        window.addEventListener('scroll', () => {
            const scrolled  = window.scrollY;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            if (progress) progress.style.width = `${maxScroll > 0 ? (scrolled / maxScroll) * 100 : 0}%`;
            if (topBtn)   topBtn.classList.toggle('visible', scrolled > 300);
        }, { passive: true });

        topBtn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    setupSectionNav() {
        const dots = document.querySelectorAll('.section-dot');
        if (!dots.length) return;

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const dot = document.querySelector(`.section-dot[data-section="${entry.target.id}"]`);
                if (dot) dot.classList.toggle('active', entry.isIntersecting);
            });
        }, { threshold: 0.35 });

        dots.forEach(dot => {
            const section = document.getElementById(dot.dataset.section);
            if (section) observer.observe(section);
            dot.addEventListener('click', () => {
                section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    showToast(msg) {
        clearTimeout(this.toastTimer);
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        this.toastTimer = setTimeout(() => toast.classList.remove('show'), 2300);
    }

    setupScrollAnimations() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    if (e.target.id === 'skills-card') this.staggerSkillTags(e.target);
                }
            });
        }, { threshold: 0.08 });
        document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
    }

    triggerVisibleAnimations() {
        document.querySelectorAll('.fade-in').forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight) {
                el.classList.add('visible');
                if (el.id === 'skills-card') this.staggerSkillTags(el);
            }
        });
    }

    setupDarkMode() {
        const toggle = document.getElementById('dark-toggle');
        const apply = theme => {
            document.documentElement.dataset.theme = theme;
            toggle.innerHTML = theme === 'dark' ? '&#9728;' : '&#9681;';
            localStorage.setItem('theme', theme);
        };
        apply(localStorage.getItem('theme') || 'light');
        toggle.addEventListener('click', () => {
            apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
        });
    }

    normalizeUrl(value) {
        if (!value) return '';
        return /^https?:\/\//i.test(value) ? value : `https://${value}`;
    }

    phoneHref(value) {
        return String(value || '').replace(/[^\d+]/g, '');
    }
}

document.addEventListener('DOMContentLoaded', () => new ResumeApp());
