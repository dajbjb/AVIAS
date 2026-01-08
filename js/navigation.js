/**
 * Navigation Logic
 * Handles tab switching, the draggable indicator, and view transitions.
 */

const navItems = document.querySelectorAll('.nav-item');
const indicator = document.querySelector('.nav-indicator');
const views = document.querySelectorAll('.view');

let navState = {
    isDragging: false,
    startX: 0,
    currentX: 0,
    initialX: 0,
    rAF: null
};

function moveIndicatorToTab(tabElement) {
    if (!tabElement || !indicator) return;
    const navBar = document.querySelector('.glass-nav');
    if (!navBar) return;
    const navRect = navBar.getBoundingClientRect();
    const tabRect = tabElement.getBoundingClientRect();

    // Center logic
    const targetCenterX = tabRect.left + (tabRect.width / 2) - navRect.left;
    const targetLeftX = targetCenterX - (indicator.offsetWidth / 2);

    if (tabElement.classList.contains('plus-tab')) {
        indicator.classList.add('passing-center');
        indicator.style.width = '55px';
        indicator.style.height = '55px';
        indicator.style.borderRadius = '50%';
        indicator.style.transform = `translate(${targetLeftX}px, -50%) scale(1.1)`;
    } else {
        indicator.classList.remove('passing-center');
        indicator.style.width = '65px';
        indicator.style.height = '48px';
        indicator.style.borderRadius = '18px';
        indicator.style.transform = `translate(${targetLeftX}px, -50%) scale(1)`;
    }
    navState.currentX = targetLeftX;
}

const initNav = () => {
    const active = document.querySelector('.nav-item.active');
    if (active) {
        indicator.classList.add('interactive');
        moveIndicatorToTab(active);
    }
};
setTimeout(initNav, 200);
window.addEventListener('resize', initNav);

// Drag Events
if (indicator) {
    const navBar = document.querySelector('.glass-nav');
    indicator.addEventListener('pointerdown', (e) => {
        navState.isDragging = true;
        navState.startX = e.clientX;
        const transform = window.getComputedStyle(indicator).transform;
        const matrix = new DOMMatrix(transform);
        navState.initialX = matrix.m41;
        indicator.classList.add('dragging');
        indicator.setPointerCapture(e.pointerId);
        if (navState.rAF) cancelAnimationFrame(navState.rAF);
    });

    indicator.addEventListener('pointermove', (e) => {
        if (!navState.isDragging) return;
        e.preventDefault();
        const delta = e.clientX - navState.startX;
        let newX = navState.initialX + delta;
        const max = navBar.offsetWidth - indicator.offsetWidth - 10;
        newX = Math.max(0, Math.min(newX, max));

        if (navState.rAF) cancelAnimationFrame(navState.rAF);
        navState.rAF = requestAnimationFrame(() => {
            const navRect = navBar.getBoundingClientRect();
            const centerNav = navRect.width / 2;
            const indicatorCenter = newX + (indicator.offsetWidth / 2);
            const distFromCenter = Math.abs(centerNav - indicatorCenter);
            const threshold = 70;
            let scale = 1;
            indicator.classList.remove('passing-center');
            if (distFromCenter < threshold) {
                const factor = 1 - (distFromCenter / threshold);
                scale = 1 + (0.3 * factor);
                if (factor > 0.5) indicator.classList.add('passing-center');
            }
            indicator.style.transform = `translate(${newX}px, -50%) scale(${scale})`;
        });
    });

    indicator.addEventListener('pointerup', (e) => {
        if (!navState.isDragging) return;
        navState.isDragging = false;
        indicator.classList.remove('dragging');
        const transform = window.getComputedStyle(indicator).transform;
        const matrix = new DOMMatrix(transform);
        const finalX = matrix.m41;
        const closestTab = findClosestTab(finalX);
        if (closestTab) {
            closestTab.click();
        } else {
            const active = document.querySelector('.nav-item.active');
            if (active) moveIndicatorToTab(active);
        }
    });
}

function findClosestTab(x) {
    let closest = null;
    let minDiff = Infinity;
    const navBar = document.querySelector('.glass-nav');
    const navRect = navBar.getBoundingClientRect();
    navItems.forEach(item => {
        const iRect = item.getBoundingClientRect();
        const iX = iRect.left - navRect.left;
        const diff = Math.abs(iX - x);
        if (diff < minDiff) {
            minDiff = diff;
            closest = item;
        }
    });
    return closest;
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-tab');
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        moveIndicatorToTab(item);

        views.forEach(v => {
            if (v.id === target) {
                views.forEach(other => { if (other.id !== target) other.classList.remove('active'); });

                // Camera Handling
                if (target === 'create') {
                    setTimeout(() => { if (typeof startCamera === 'function') startCamera(); }, 300);
                    // Set mode default
                    window.activeCameraMode = 'story';
                } else {
                    if (typeof stopCamera === 'function') stopCamera();
                }

                if (!v.classList.contains('active')) {
                    setTimeout(() => {
                        v.classList.add('active');
                        if (v.classList.contains('scrollable')) v.scrollTop = 0;
                    }, 10);
                }

                // Refresh Chat if needed
                if (target === 'chat' && typeof renderChat === 'function') {
                    renderChat();
                    if (typeof scrollToBottom === 'function') scrollToBottom();
                }
            }
        });
        if (window.navigator.vibrate) window.navigator.vibrate(5);
    });
});
