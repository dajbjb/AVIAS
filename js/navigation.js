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
    const navInner = document.getElementById('nav-main-items'); // Use inner container for calculation

    if (!navBar || !navInner) return;

    // We calc relative to the inner container now because the items are inside it
    const innerRect = navInner.getBoundingClientRect();
    const tabRect = tabElement.getBoundingClientRect();

    // Center logic relative to the inner container
    const targetCenterX = tabRect.left + (tabRect.width / 2) - innerRect.left;
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
    // We bind drag events, but calculations must respect navInner
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
        const navInner = document.getElementById('nav-main-items');
        if (!navInner) return;

        e.preventDefault();
        const delta = e.clientX - navState.startX;
        let newX = navState.initialX + delta;

        // Calculate max based on inner width
        const max = navInner.offsetWidth - indicator.offsetWidth;
        newX = Math.max(0, Math.min(newX, max));

        if (navState.rAF) cancelAnimationFrame(navState.rAF);
        navState.rAF = requestAnimationFrame(() => {
            const innerRect = navInner.getBoundingClientRect();
            const centerNav = innerRect.width / 2;
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
    const navInner = document.getElementById('nav-main-items');
    if (!navInner) return null;

    const navRect = navInner.getBoundingClientRect();
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

// --- NAV MODE SWITCHING ---
const mainNavItems = document.getElementById('nav-main-items');
const navFilters = document.getElementById('nav-filters-container');
const navFilterBack = document.getElementById('nav-filter-back');
const glassNav = document.getElementById('main-nav'); // Get the main nav element

function setNavMode(mode) {
    if (!glassNav) return;

    if (mode === 'filters') {
        glassNav.classList.add('filters-active');
    } else {
        glassNav.classList.remove('filters-active');
        // Re-init indicator position if returning to main
        setTimeout(initNav, 300); // Wait for transition roughly
    }
}

if (navFilterBack) {
    navFilterBack.addEventListener('click', () => {
        setNavMode('main');
    });
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const target = item.getAttribute('data-tab');

        // Only update active state if NOT going to create/filter mode (visually safer)
        if (target !== 'create') {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            moveIndicatorToTab(item);
        } else {
            // If clicking create, we keep 'home' or previous active visually or just let the slide happen
            // Actually, let's allow it to be active for a second before sliding away
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            moveIndicatorToTab(item);
        }

        views.forEach(v => {
            if (v.id === target) {
                views.forEach(other => { if (other.id !== target) other.classList.remove('active'); });

                // Camera Handling
                if (target === 'create') {
                    console.log("Nav: Switching to Create. Starting Camera...");

                    // Delay slightly to allow UI transition
                    setTimeout(() => {
                        if (window.AppCamera && window.AppCamera.startSequence) {
                            window.AppCamera.startSequence();
                        } else if (typeof startCamera === 'function') {
                            startCamera();
                        } else {
                            console.error("Nav: Camera start function not found!");
                        }
                        setNavMode('filters');
                    }, 50);

                    if (window.activeCameraMode !== 'story') window.activeCameraMode = 'story';

                } else {
                    console.log("Nav: Leaving Create. Stopping Camera...");
                    if (window.AppCamera && window.AppCamera.stopSequence) {
                        window.AppCamera.stopSequence();
                    } else if (typeof stopCamera === 'function') {
                        stopCamera();
                    }
                    setNavMode('main');
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
