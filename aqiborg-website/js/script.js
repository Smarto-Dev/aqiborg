class ResumeApp {
    constructor() {
        this.accessCode = 'aqib123'; // Simple hardcoded password, change later
        this.resumes = {};
        this.currentProfession = 'software-engineer';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadResumes();
        this.checkLoginStatus();
    }

    bindEvents() {
        const loginForm = document.getElementById('login-form');
        const professionSwitcher = document.getElementById('profession-switcher');
        const logoutBtn = document.getElementById('logout');

        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        professionSwitcher.addEventListener('change', (e) => this.switchProfession(e.target.value));
        logoutBtn.addEventListener('click', () => this.logout());
    }

    async loadResumes() {
        try {
            const response = await fetch('../data/resumes.json');
            this.resumes = await response.json();
            this.populateProfessionSwitcher();
        } catch (error) {
            console.error('Failed to load resumes:', error);
            // Fallback data
            this.resumes = {
                'software-engineer': this.getDefaultResume()
            };
            this.populateProfessionSwitcher();
        }
    }

    populateProfessionSwitcher() {
        const select = document.getElementById('profession-switcher');
        select.innerHTML = '';
        Object.keys(this.resumes).forEach(profession => {
            const option = document.createElement('option');
            option.value = profession;
            option.textContent = this.resumes[profession].title;
            select.appendChild(option);
        });
    }

    getDefaultResume() {
        return {
            title: 'Software Engineer',
            summary: 'Full-stack developer with expertise in modern web technologies, passionate about building scalable applications.',
            experience: [
                'Senior Software Engineer at TechCorp (2020-Present): Led development of microservices architecture using Node.js and React.',
                'Software Developer at Innovate Inc (2018-2020): Built responsive web apps with HTML/CSS/JS and Python backends.',
                'Junior Developer at StartUpX (2016-2018): Contributed to mobile-first designs and database optimization.'
            ],
            skills: ['JavaScript (ES6+)', 'React', 'Node.js', 'Python', 'SQL', 'Git', 'Docker', 'AWS'],
            education: [
                'B.S. Computer Science, University of Excellence (2012-2016)'
            ],
            contact: {
                email: 'aqib@aqib.org',
                linkedin: 'linkedin.com/in/aqib',
                github: 'github.com/aqiborg'
            }
        };
    }

    handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');

        if (password === this.accessCode) {
            localStorage.setItem('loggedIn', 'true');
            this.showResume();
        } else {
            errorEl.textContent = 'Invalid access code. Try: aqib123';
            errorEl.classList.remove('hidden');
        }
    }

    checkLoginStatus() {
        if (localStorage.getItem('loggedIn') === 'true') {
            this.showResume();
        }
    }

    showResume() {
        document.getElementById('login-container').classList.add('hidden');
        document.getElementById('resume-container').classList.remove('hidden');
        this.renderResume();
    }

    switchProfession(profession) {
        this.currentProfession = profession;
        this.renderResume();
    }

    renderResume() {
        const resume = this.resumes[this.currentProfession];
        if (!resume) return;

        document.querySelector('header h1').textContent = resume.title || 'Aqib';

        const content = document.getElementById('resume-content');
        content.innerHTML = `
            ${resume.summary ? `<div class="resume-section"><h2>Professional Summary</h2><p>${resume.summary}</p></div>` : ''}
            
            ${resume.experience ? `
                <div class="resume-section">
                    <h2>Experience</h2>
                    <ul>${resume.experience.map(exp => `<li>${exp}</li>`).join('')}</ul>
                </div>
            ` : ''}
            
            ${resume.skills ? `
                <div class="resume-section">
                    <h2>Skills</h2>
                    <div class="skills">${resume.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div>
                </div>
            ` : ''}
            
            ${resume.education ? `
                <div class="resume-section">
                    <h2>Education</h2>
                    <ul>${resume.education.map(edu => `<li>${edu}</li>`).join('')}</ul>
                </div>
            ` : ''}
            
            ${resume.contact ? `
                <div class="resume-section">
                    <h2>Contact</h2>
                    <ul>
                        ${resume.contact.email ? `<li>Email: <a href="mailto:${resume.contact.email}">${resume.contact.email}</a></li>` : ''}
                        ${resume.contact.linkedin ? `<li>LinkedIn: <a href="https://${resume.contact.linkedin}" target="_blank">${resume.contact.linkedin}</a></li>` : ''}
                        ${resume.contact.github ? `<li>GitHub: <a href="https://${resume.contact.github}" target="_blank">${resume.contact.github}</a></li>` : ''}
                    </ul>
                </div>
            ` : ''}
        `;
    }

    logout() {
        localStorage.removeItem('loggedIn');
        document.getElementById('login-container').classList.remove('hidden');
        document.getElementById('resume-container').classList.add('hidden');
        document.getElementById('password').value = '';
        document.getElementById('login-error').classList.add('hidden');
    }
}

// Initialize app when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    new ResumeApp();
});
