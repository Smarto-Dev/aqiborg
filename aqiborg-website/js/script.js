class ResumeApp {
    constructor() {
        this.resumes = {};
        this.currentRole = null;
        this.typewriterTimer = null;
        this.init();
    }

    async init() {
        await this.loadResumes();
        this.setupDarkMode();
        this.setupScrollAnimations();
        this.loadFromHash();
        window.addEventListener('hashchange', () => this.loadFromHash());
    }

    async loadResumes() {
        try {
            const res = await fetch('data/resumes.json');
            this.resumes = await res.json();
        } catch (e) {
            console.error('Could not load resumes.json', e);
        }
        this.renderRolePills();
    }

    loadFromHash() {
        const hash = window.location.hash.slice(1);
        const roles = Object.keys(this.resumes);
        if (!roles.length) return;
        const role = roles.includes(hash) ? hash : roles[0];
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

        document.title = `Aqib | ${data.title}`;

        document.getElementById('hero-role-badge').textContent = data.title;
        document.getElementById('hero-tagline').textContent = data.tagline || '';
        this.typewrite(document.getElementById('hero-title'), data.subtitle || data.title);
        this.renderHeroLinks(data.contact);
        this.renderStats(data.stats || []);
        this.renderSkills(data.skills || {});
        this.renderEducation(data.education || []);
        this.renderContact(data.contact || {});
        document.getElementById('summary-content').textContent = data.summary || '';
        this.renderExperience(data.experience || []);
        this.renderProjects(data.projects || []);
    }

    renderHeroLinks(contact) {
        if (!contact) return;
        const container = document.getElementById('hero-links');
        const links = [
            contact.email   && { href: `mailto:${contact.email}`,                     text: `&#x2709; ${contact.email}` },
            contact.github  && { href: `https://${contact.github}`,  blank: true,     text: '&#x2316; GitHub' },
            contact.linkedin && { href: `https://${contact.linkedin}`, blank: true,   text: '&#x2606; LinkedIn' },
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
        document.querySelectorAll('.stat-value').forEach(el => {
            const raw = el.dataset.target;
            const num = parseInt(raw);
            if (isNaN(num)) return;
            const suffix = raw.replace(/[0-9]/g, '');
            let current = 0;
            const duration = 1000;
            const interval = 16;
            const step = num / (duration / interval);
            const timer = setInterval(() => {
                current = Math.min(current + step, num);
                el.textContent = Math.floor(current) + suffix;
                if (current >= num) clearInterval(timer);
            }, interval);
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

    renderEducation(education) {
        const container = document.getElementById('education-content');
        container.innerHTML = education.map(edu => {
            if (typeof edu === 'string') return `<div class="edu-item"><div class="edu-degree">${edu}</div></div>`;
            return `
                <div class="edu-item">
                    <div class="edu-degree">${edu.degree}</div>
                    ${edu.school  ? `<div class="edu-school">${edu.school}</div>` : ''}
                    ${edu.period  ? `<div class="edu-period">${edu.period}</div>` : ''}
                    ${edu.detail  ? `<div class="edu-detail">${edu.detail}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    renderContact(contact) {
        const container = document.getElementById('contact-content');
        const items = [
            contact.email    && { icon: '✉', href: `mailto:${contact.email}`,             text: contact.email },
            contact.location && { icon: '📍', text: contact.location },
            contact.github   && { icon: '⌥', href: `https://${contact.github}`,  ext: true, text: contact.github },
            contact.linkedin && { icon: '⚭', href: `https://${contact.linkedin}`, ext: true, text: contact.linkedin },
        ].filter(Boolean);

        container.innerHTML = items.map(item =>
            item.href
                ? `<a href="${item.href}" class="contact-item"${item.ext ? ' target="_blank" rel="noopener noreferrer"' : ''}>
                     <span class="contact-icon">${item.icon}</span>${item.text}
                   </a>`
                : `<div class="contact-item"><span class="contact-icon">${item.icon}</span>${item.text}</div>`
        ).join('');
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
        if (!projects || !projects.length) { card.style.display = 'none'; return; }
        card.style.display = '';
        document.getElementById('projects-content').innerHTML = projects.map(p => `
            <div class="project-card${p.highlight ? ' featured' : ''}">
                <div class="project-name">${p.name}</div>
                <div class="project-desc">${p.description}</div>
                ${p.tech ? `<div class="project-tech">${p.tech.map(t => `<span class="tech-tag">${t}</span>`).join('')}</div>` : ''}
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

    setupScrollAnimations() {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
        }, { threshold: 0.08 });
        document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
    }

    triggerVisibleAnimations() {
        document.querySelectorAll('.fade-in').forEach(el => {
            if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible');
        });
    }

    setupDarkMode() {
        const toggle = document.getElementById('dark-toggle');
        const apply = (theme) => {
            document.documentElement.dataset.theme = theme;
            toggle.textContent = theme === 'dark' ? '☀' : '◑';
            localStorage.setItem('theme', theme);
        };
        apply(localStorage.getItem('theme') || 'light');
        toggle.addEventListener('click', () => {
            apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new ResumeApp());
