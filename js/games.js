/**
 * Games Tab Logic (Interactive features)
 * Currently Empty Slots awaiting content.
 */

// --- Global Audio Helper ---
const playSound = (id) => {
    const el = document.getElementById(id);
    if (el) {
        el.currentTime = 0;
        el.play().catch(e => console.log('Audio blocked', e));
    }
};

function initGames() {
    // --- Tab Switching Logic ---
    const gameTabs = document.querySelectorAll('.game-tab');
    const gameViews = document.querySelectorAll('.game-view');
    const gameIndicator = document.querySelector('.game-tab-indicator');

    function moveGameIndicator(el) {
        if (!el || !gameIndicator) return;
        const rect = el.getBoundingClientRect();
        const tabsBox = document.querySelector('.game-tabs');
        if (!tabsBox) return;
        const x = rect.left - tabsBox.getBoundingClientRect().left - 6;
        gameIndicator.style.transform = `translateX(${x}px)`;
        gameIndicator.style.width = `${rect.width}px`;
    }

    setTimeout(() => {
        const active = document.querySelector('.game-tab.active');
        if (active) moveGameIndicator(active);
    }, 200);

    gameTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            gameTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            moveGameIndicator(tab);
            const target = tab.getAttribute('data-game');
            gameViews.forEach(v => {
                v.classList.remove('active');
                if (v.id === `game-${target}`) {
                    v.classList.add('active');
                }
            });
            playSound('click-sound');
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initGames();
});
