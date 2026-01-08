
document.addEventListener('DOMContentLoaded', () => {
    const loginOverlay = document.getElementById('login-overlay');
    const mainContent = document.getElementById('content');
    const glassNav = document.querySelector('.glass-nav');
    const userButtons = document.querySelectorAll('.user-btn');
    const waitingScreen = document.getElementById('waiting-screen');
    const waitingUser = document.getElementById('waiting-user-name');

    // Check if user is already logged in
    const currentUser = localStorage.getItem('kingdom_current_user');

    if (currentUser) {
        // Show main app immediately if already logged in
        loginOverlay.style.display = 'none';
        mainContent.style.visibility = 'visible';
        mainContent.style.opacity = '1';
        if (glassNav) {
            glassNav.style.visibility = 'visible';
            glassNav.style.opacity = '1';
        }
        updateUserContext(currentUser);
    } else {
        // Prepare login screen
        mainContent.style.visibility = 'hidden';
        if (glassNav) glassNav.style.visibility = 'hidden';
    }

    userButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const userName = btn.getAttribute('data-user');
            loginUser(userName);
        });
    });

    function loginUser(name) {
        // Save to localStorage
        localStorage.setItem('kingdom_current_user', name);

        // Show waiting screen with grand name display
        const stylizedName = name === 'Aviya' ? 'Aviya' : 'David';
        const hebrewName = name === 'Aviya' ? 'אביה' : 'דוד';

        const nameDisplay = document.getElementById('waiting-user-name');
        if (nameDisplay) {
            nameDisplay.textContent = stylizedName;
            nameDisplay.classList.add('grand-entry');
        }

        const hebrewDisplay = document.createElement('div');
        hebrewDisplay.className = 'hebrew-name-fade';
        hebrewDisplay.textContent = hebrewName;
        waitingScreen.appendChild(hebrewDisplay);

        document.getElementById('user-selection').style.transition = 'all 0.8s ease';
        document.getElementById('user-selection').style.opacity = '0';
        document.getElementById('user-selection').style.transform = 'scale(1.1)';

        setTimeout(() => {
            document.getElementById('user-selection').style.display = 'none';
            waitingScreen.style.display = 'flex';
            waitingScreen.style.opacity = '0';
            setTimeout(() => {
                waitingScreen.style.opacity = '1';
                waitingScreen.style.transition = 'opacity 1.5s ease';
            }, 50);
        }, 800);

        // Simulate "Beautiful Waiting"
        setTimeout(() => {
            fadeOutLogin();
        }, 4500);
    }

    function fadeOutLogin() {
        loginOverlay.style.transition = 'opacity 1s ease, filter 1s ease';
        loginOverlay.style.opacity = '0';
        loginOverlay.style.filter = 'blur(20px)';

        mainContent.style.visibility = 'visible';
        mainContent.style.opacity = '0';
        mainContent.style.transition = 'opacity 1s ease';

        setTimeout(() => {
            loginOverlay.style.display = 'none';
            mainContent.style.opacity = '1';
            if (glassNav) {
                glassNav.style.visibility = 'visible';
                glassNav.style.opacity = '0';
                glassNav.style.animation = 'fadeIn 1s forwards';
            }
            updateUserContext(localStorage.getItem('kingdom_current_user'));
        }, 1000);
    }

    function updateUserContext(name) {
        console.log(`Current session user: ${name}`);
        const welcomeEl = document.getElementById('personal-welcome');
        if (welcomeEl && name) {
            const displayName = name === 'Aviya' ? 'Aviya' : 'David';
            welcomeEl.textContent = `Hey ${displayName}`;
            welcomeEl.style.opacity = '1';
        }
        if (typeof window.renderHomeHighlights === 'function') window.renderHomeHighlights();
    }

    // Temporary logout functionality
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('kingdom_current_user');
            location.reload();
        });
    }
});
