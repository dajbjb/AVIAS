/**
 * Kingdom - Background Logic
 * Generates floating hearts for the 'Tech & Love' vibe.
 */

function createHeart() {
    const heart = document.createElement('div');
    heart.classList.add('heart');

    // Randomize Position
    heart.style.left = Math.random() * 100 + "vw";

    // Randomize Animation Duration (Speed)
    const duration = Math.random() * 5 + 5; // 5s to 10s
    heart.style.animationDuration = duration + "s";

    // Randomize Size
    heart.style.opacity = Math.random() * 0.5 + 0.1;

    const bg = document.getElementById('love-background');
    if (bg) bg.appendChild(heart);

    // Remove after animation
    setTimeout(() => {
        heart.remove();
    }, duration * 1000);
}

// Generate hearts periodically
setInterval(createHeart, 800);

/**
 * Navigation Logic
 */
const navItems = document.querySelectorAll('.nav-item');
const indicator = document.querySelector('.nav-indicator');
const views = document.querySelectorAll('.view');

/**
 * Optimized Draggable Navigation Logic
 */
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

    // Relative X position
    const targetX = tabRect.left - navRect.left;

    indicator.style.transform = `translate(${targetX}px, -50%)`;

    // Store state
    navState.currentX = targetX;
    indicator.setAttribute('data-target-x', targetX);
}

// Init & Resize
const initNav = () => {
    const active = document.querySelector('.nav-item.active');
    if (active) {
        indicator.classList.add('interactive'); // Enable touch
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
        // Logic fix: initialX should be current CSS transform X
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

        // Bounds
        const max = navBar.offsetWidth - indicator.offsetWidth - 10;
        newX = Math.max(0, Math.min(newX, max)); // Bounds check simplified

        // Use rAF for smooth visual update
        if (navState.rAF) cancelAnimationFrame(navState.rAF);
        navState.rAF = requestAnimationFrame(() => {
            // Dynamic Jelly Effect Logic
            const navRect = navBar.getBoundingClientRect();
            const centerNav = navRect.width / 2;
            const indicatorCenter = newX + (indicator.offsetWidth / 2);

            // Distance from true center (where PLUS button is)
            const distFromCenter = Math.abs(centerNav - indicatorCenter);
            const threshold = 70; // Range of effect

            let scale = 1;

            // Remove passing class first to reset
            indicator.classList.remove('passing-center');

            if (distFromCenter < threshold) {
                // Factor 0 to 1 (1 being exactly at center)
                const factor = 1 - (distFromCenter / threshold);

                // Effect: Grow slightly and 'jelly' logic
                // We add a class for color/shadow change, but scale manually
                scale = 1 + (0.3 * factor); // Grow up to 1.3x

                if (factor > 0.5) {
                    indicator.classList.add('passing-center');
                }
            }

            indicator.style.transform = `translate(${newX}px, -50%) scale(${scale})`;
        });
    });

    indicator.addEventListener('pointerup', (e) => {
        if (!navState.isDragging) return;
        navState.isDragging = false;
        indicator.classList.remove('dragging');

        // Snap to closest
        const transform = window.getComputedStyle(indicator).transform;
        const matrix = new DOMMatrix(transform);
        const finalX = matrix.m41;

        const closestTab = findClosestTab(finalX);
        if (closestTab) {
            closestTab.click(); // Trigger click logic
        } else {
            const active = document.querySelector('.nav-item.active');
            if (active) moveIndicatorToTab(active);
        }
    });
}

function moveIndicatorToTab(tabElement) {
    if (!tabElement || !indicator) return;
    const navBar = document.querySelector('.glass-nav');
    if (!navBar) return;

    const navRect = navBar.getBoundingClientRect();
    const tabRect = tabElement.getBoundingClientRect();

    // 1. Calculate Center Position
    // We want the indicator centered on the tab
    const targetCenterX = tabRect.left + (tabRect.width / 2) - navRect.left;

    // 2. Adjust for Indicator Width (since transform is usually top-left based, but here we center)
    // Actually, our CSS uses translate(X, -50%) where -50% is Y centering. 
    // We calculate left X based on the current/target WIDTH of the indicator.

    let targetWidth = 65; // Default Pill
    if (tabElement.classList.contains('plus-tab')) {
        targetWidth = 55; // Circle
    }

    const targetLeftX = targetCenterX - (targetWidth / 2);

    // 3. Special Handling for PLUS TAB (The Circle)
    if (tabElement.classList.contains('plus-tab')) {
        // Morph into Circle
        indicator.classList.add('passing-center'); // Resets shape to circle via CSS
        indicator.style.width = '55px'; // Match circle size
        indicator.style.height = '55px';
        indicator.style.borderRadius = '50%';
        indicator.style.transform = `translate(${targetLeftX}px, -50%) scale(1.1)`; // Slightly larger
    } else {
        // Morph back to Pill
        indicator.classList.remove('passing-center');
        indicator.style.width = '65px'; // Reset width
        indicator.style.height = '48px'; // Reset height
        indicator.style.borderRadius = '18px';
        indicator.style.transform = `translate(${targetLeftX}px, -50%) scale(1)`;
    }

    navState.currentX = targetLeftX;
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

        // RESTORED LOGIC with Circular Handling
        moveIndicatorToTab(item);

        views.forEach(v => {
            // Simple logic: remove active, add active after delay for effect
            if (v.id === target) {
                // Hide others
                views.forEach(other => {
                    if (other.id !== target) other.classList.remove('active');
                });

                // Show this one
                if (!v.classList.contains('active')) {
                    setTimeout(() => {
                        v.classList.add('active');
                        if (v.classList.contains('scrollable')) v.scrollTop = 0;
                    }, 10);
                }
            }
        });

        if (window.navigator.vibrate) window.navigator.vibrate(5);
    });
});

/**
 * Home Section Logic (Boutique Header with AI Intelligence)
 */

let GEMINI_API_KEY = "AIzaSyAXKu7u_nvbjEKT6xTZUIkXHTcJ6Fqn6-U";

function updateClock() {
    const now = new Date();
    const hour = now.getHours();

    const hours = String(hour).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const clockElement = document.getElementById('digital-clock');
    if (clockElement) {
        clockElement.textContent = `${hours}:${minutes}`;
    }

    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options).toUpperCase();
    const dateElement = document.getElementById('digital-date');
    if (dateElement) {
        dateElement.textContent = dateString;
    }

    const ambientLight = document.getElementById('ambient-light');
    const statusText = document.getElementById('status-text');
    const statusIcon = document.querySelector('#status-widget i');

    if (ambientLight) {
        if (hour >= 6 && hour < 18) {
            ambientLight.classList.add('day');
            ambientLight.classList.remove('night');
            if (statusText) statusText.textContent = "Luxury Living";
            if (statusIcon) {
                statusIcon.className = "fa-solid fa-sun";
                statusIcon.style.color = "#FFD700";
            }
        } else {
            ambientLight.classList.add('night');
            ambientLight.classList.remove('day');
            if (statusText) statusText.textContent = "Sweet Dreams";
            if (statusIcon) {
                statusIcon.className = "fa-solid fa-moon";
                statusIcon.style.color = "#A5B4FC";
            }
        }
    }

    updateSkyState(hour);
}

function updateSkyState(hour) {
    const body = document.body;
    body.classList.remove('sky-night', 'sky-dawn', 'sky-day', 'sky-dusk', 'sky-evening');

    if (hour >= 5 && hour < 7) {
        body.classList.add('sky-dawn');
    } else if (hour >= 7 && hour < 17) {
        body.classList.add('sky-day');
    } else if (hour >= 17 && hour < 20) {
        body.classList.add('sky-dusk');
    } else if (hour >= 20 && hour < 22) {
        body.classList.add('sky-evening');
    } else {
        body.classList.add('sky-night');
    }
}


// Helper to determine time context
function getTimeContext() {
    const hour = new Date().getHours();
    if (hour < 5) return "night";
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
}

function renderHomeHighlights() {
    updateClock();
    setInterval(updateClock, 1000); // 1-second interval
    fetchAIGreeting();

    // Personal Greeting Update
    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
    const namePlaceholder = document.getElementById('name-placeholder');
    if (namePlaceholder) {
        namePlaceholder.textContent = currentUser;
    }

    // Filter Status Rings: Show ONLY the logged-in user
    const statusItems = document.querySelectorAll('.status-item');
    statusItems.forEach(item => {
        const nameSpan = item.querySelector('.status-name');
        if (nameSpan) {
            if (nameSpan.textContent.trim() === currentUser) {
                item.style.display = 'flex'; // Show logged in user
            } else {
                item.style.display = 'none'; // Hide others
            }
        }
    });
}

// AI Greeting Generation via Gemini
async function generateAIGreeting() {
    if (!GEMINI_API_KEY) {
        const setup = document.getElementById('api-setup');
        if (setup) setup.style.display = 'flex';
        return;
    }

    const greetingEl = document.getElementById('ai-greeting');
    if (greetingEl) {
        greetingEl.innerHTML = '<span class="loading-dots">AI is crafting your welcome...</span>';
    }

    const currentTimeContext = getTimeContext();
    const cachedData = JSON.parse(localStorage.getItem('kingdom_cached_greeting') || "{}");

    // Check if we have a valid cache (less than 4 hours old AND same time context)
    const cacheAge = Date.now() - (cachedData.timestamp || 0);
    const fourHours = 4 * 60 * 60 * 1000;

    if (cachedData.text && cacheAge < fourHours && cachedData.context === currentTimeContext) {
        if (greetingEl) greetingEl.textContent = cachedData.text;
        return;
    }

    // If no cache or cache is old, ask AI
    if (greetingEl) {
        greetingEl.innerHTML = '<span class="loading-dots">AI is crafting your welcome...</span>';
    }

    const prompt = `Act as a luxury boutique hotel concierge. Write a very short, poetic, and sophisticated greeting (max 8 words) for David and Aviya. 
    It is currently ${currentTimeContext}. The vibe should be "Everyday Elegance & Warmth". 
    Do not use hashtags. Be classy and welcoming.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const aiText = data.candidates[0].content.parts[0].text.trim();

            // Save to cache
            localStorage.setItem('kingdom_cached_greeting', JSON.stringify({
                text: aiText,
                context: currentTimeContext,
                timestamp: Date.now()
            }));

            typeWriter(aiText, "ai-greeting");
        } else {
            throw new Error("Invalid API response");
        }
    } catch (error) {
        console.error("AI Greeting Error:", error);
        if (greetingEl) greetingEl.textContent = cachedData.text || "Welcome to your sanctuary";
    }
}

function typeWriter(text, elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = "";
    let i = 0;
    function type() {
        if (i < text.length) {
            el.textContent += text.charAt(i);
            i++;
            setTimeout(type, 50);
        }
    }
    type();
}

// Initial load
setInterval(updateClock, 1000);
updateClock();
setTimeout(generateAIGreeting, 1000);

/**
 * Gallery & Memories Logic - PERSISTENCE & COMPRESSION
 */
let memories = (typeof getInitialMemories === 'function') ? getInitialMemories() : (JSON.parse(localStorage.getItem('kingdom_memories')) || []);

// Add Sample Data if empty
// Initial data handled by memories-data.js or logic above
if (!memories || memories.length === 0) {
    // Fallback if needed
    memories = [];
}

let currentDraftImages = [];

function syncStorage() {
    try {
        localStorage.setItem('kingdom_memories', JSON.stringify(memories));
    } catch (e) {
        console.error("Storage limit reached.");
    }
}

/**
 * AI Image Compression Logic
 * Ensures images load fast and don't break LocalStorage limits.
 */
async function compressImage(base64Str, maxWidth = 800) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = maxWidth / img.width;
            if (scale < 1) {
                canvas.width = maxWidth;
                canvas.height = img.height * scale;
            } else {
                canvas.width = img.width;
                canvas.height = img.height;
            }
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
    });
}

const galleryUpload = document.getElementById('gallery-upload');
const reorderList = document.getElementById('reorder-list');
const previewArea = document.getElementById('create-preview-area');
const saveImagesBtn = document.getElementById('save-images-btn');
const textModal = document.getElementById('text-modal');
const galleryText = document.getElementById('gallery-text');
const charCount = document.getElementById('char-count');
const confirmPostBtn = document.getElementById('confirm-post');
const cancelPostBtn = document.getElementById('cancel-post');
const memoriesList = document.getElementById('memories-list');

// 1. Image Selection & Preview
if (galleryUpload) {
    galleryUpload.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files).slice(0, 5 - currentDraftImages.length);
        const aiLoader = document.getElementById('ai-loader');
        if (aiLoader) aiLoader.style.display = 'flex';

        for (const file of files) {
            const reader = new FileReader();
            const rawData = await new Promise(r => {
                reader.onload = (ev) => r(ev.target.result);
                reader.readAsDataURL(file);
            });
            const compressed = await compressImage(rawData);
            currentDraftImages.push(compressed);
        }

        if (aiLoader) aiLoader.style.display = 'none';
        renderDraftPreview();
        if (previewArea) previewArea.style.display = 'block';
    });
}

function renderDraftPreview() {
    if (!reorderList) return;
    reorderList.innerHTML = '';
    currentDraftImages.forEach((imgSrc, index) => {
        const div = document.createElement('div');
        div.className = 'reorder-item';
        div.draggable = true;
        div.innerHTML = `<img src="${imgSrc}"><button class="delete-img-btn" onclick="removeDraftImage(${index})"><i class="fa-solid fa-xmark"></i></button>`;
        div.addEventListener('dragstart', () => div.classList.add('dragging'));
        div.addEventListener('dragend', () => div.classList.remove('dragging'));
        reorderList.appendChild(div);
    });
}

window.removeDraftImage = (index) => {
    currentDraftImages.splice(index, 1);
    if (currentDraftImages.length === 0 && previewArea) previewArea.style.display = 'none';
    renderDraftPreview();
};

// 2. Drag to Reorder
if (reorderList) {
    reorderList.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        const siblings = [...reorderList.querySelectorAll('.reorder-item:not(.dragging)')];
        let nextSibling = siblings.find(sib => e.clientY <= sib.getBoundingClientRect().top + sib.getBoundingClientRect().height / 2);
        reorderList.insertBefore(draggingItem, nextSibling);
        currentDraftImages = [...reorderList.querySelectorAll('.reorder-item img')].map(img => img.src);
    });
}

// 3. Save Logic
if (saveImagesBtn) saveImagesBtn.addEventListener('click', () => { if (textModal) textModal.style.display = 'flex'; });
if (galleryText && charCount) galleryText.addEventListener('input', (e) => charCount.textContent = e.target.value.length);
if (cancelPostBtn) cancelPostBtn.addEventListener('click', () => { if (textModal) textModal.style.display = 'none'; });

if (confirmPostBtn) {
    confirmPostBtn.addEventListener('click', () => {
        const aiLoader = document.getElementById('ai-loader');
        if (aiLoader) aiLoader.style.display = 'flex';

        setTimeout(() => {
            const frameStyles = ['frame-classic-gold', 'frame-polaroid', 'frame-modern-glass', 'frame-minimal-rose'];
            const themeColors = ['rgba(224, 191, 184, 0.4)', 'rgba(242, 210, 189, 0.4)', 'rgba(44, 62, 80, 0.4)', 'rgba(76, 161, 175, 0.4)'];

            const newMemory = {
                id: Date.now(),
                images: currentDraftImages.map((img, idx) => ({
                    src: img,
                    frame: frameStyles[Math.floor(Math.random() * frameStyles.length)],
                    filter: `ai-filter-${idx % 4}`
                })),
                text: galleryText.value,
                themeColor: themeColors[Math.floor(Math.random() * themeColors.length)],
                isCollapsed: false
            };
            memories.unshift(newMemory);
            syncStorage();
            currentDraftImages = [];
            if (galleryText) galleryText.value = '';
            if (previewArea) previewArea.style.display = 'none';
            if (textModal) textModal.style.display = 'none';
            if (aiLoader) aiLoader.style.display = 'none';
            renderMemories();
            const viewTab = document.querySelector('[data-gallery-tab="view"]');
            if (viewTab) viewTab.click();
        }, 1500);
    });
}

function createMemoryHTML(memory) {
    return `
        <div class="memory-theme-overlay" style="background: ${memory.themeColor}"></div>
        <div class="memory-header" style="padding:0 20px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; flex:1; overflow:hidden;">
               <span class="memory-date" style="color:rgba(255,255,255,0.3); font-size:0.75rem; font-family:'Montserrat'; letter-spacing:2px; flex-shrink:0;">
                    ${new Date(memory.id).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <div class="collapsed-preview-text" style="margin-right:15px; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${memory.text || 'זיכרון ללא כותרת'}
                </div>
            </div>
            <div class="memory-actions">
                <button class="action-btn toggle-btn" onclick="toggleExpand(${memory.id})" title="הגדל/הקטן"><i class="fa-solid ${memory.isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i></button>
                <button class="action-btn" onclick="editMemoryText(${memory.id})" title="ערוך טקסט"><i class="fa-solid fa-pen-nib"></i></button>
                <button class="action-btn delete" onclick="deleteMemory(${memory.id})" title="מחק זיכרון"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        </div>
        <div class="memory-content">
            <div class="memory-images">
                ${memory.images.map((imgObj, idx) => `
                    <div class="memory-img-wrapper ${imgObj.frame}">
                        <img src="${imgObj.src}" class="ai-styled-img ${imgObj.filter}">
                        <button class="delete-img-btn" onclick="deleteImageFromMemory(${memory.id}, ${idx})"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                `).join('')}
                ${memory.text ? `<div class="memory-img-wrapper frame-text-card"><div class="text-frame-content">${memory.text}</div></div>` : ''}
                <button class="add-img-btn" onclick="addImageToMemoryPrompt(${memory.id})"><i class="fa-solid fa-sparkles"></i> AI: הוסף רגע נוסף לזיכרון</button>
            </div>
        </div>`;
}

function renderMemories() {
    if (!memoriesList) return;
    memoriesList.innerHTML = memories.length === 0 ? `<div class="gallery-placeholder"><i class="fa-solid fa-wand-sparkles"></i><p>הזיכרונות שלכם יופיעו כאן</p></div>` : '';

    memories.forEach(memory => {
        const item = document.createElement('div');
        item.className = `memory-item ${memory.isCollapsed ? 'collapsed' : ''}`;
        item.innerHTML = createMemoryHTML(memory);
        memoriesList.appendChild(item);
    });
}

/**
 * Unique Home Screen Highlights
 * Picks 2 random memories to showcase on the home screen.
 */
function renderHomeHighlights() {
    const homeHighlightsContainer = document.getElementById('home-highlights');
    if (!homeHighlightsContainer) return;

    if (memories.length === 0) {
        homeHighlightsContainer.innerHTML = '';
        return;
    }

    // Shuffle and pick 2
    const shuffled = [...memories].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 2);

    homeHighlightsContainer.innerHTML = '<h2 class="boutique-names playfair-italic" style="font-size: 2rem; margin-bottom: 40px; text-align: center;">Highlights</h2>';

    selected.forEach(memory => {
        const item = document.createElement('div');
        item.className = `memory-item ${memory.isCollapsed ? 'collapsed' : ''}`;
        // Ensure home highlights have their own logic or reuse the gallery logic
        item.innerHTML = createMemoryHTML(memory);
        homeHighlightsContainer.appendChild(item);
    });
}


window.toggleExpand = (id) => {
    const mem = memories.find(m => m.id === id);
    if (mem) {
        mem.isCollapsed = !mem.isCollapsed;
        syncStorage();
        renderMemories();
        renderHomeHighlights(); // Keep highlights in sync
    }
};

window.deleteMemory = (id) => {
    if (confirm('מחק זיכרון?')) {
        memories = memories.filter(m => m.id !== id);
        syncStorage();
        renderMemories();
        renderHomeHighlights();
    }
};

window.editMemoryText = (id) => {
    const mem = memories.find(m => m.id === id);
    const t = prompt('ערוך טקסט:', mem.text);
    if (t !== null) {
        mem.text = t;
        syncStorage();
        renderMemories();
        renderHomeHighlights();
    }
};

window.deleteImageFromMemory = (memId, imgIdx) => {
    const mem = memories.find(m => m.id === memId);
    if (mem && mem.images.length > 1) {
        mem.images.splice(imgIdx, 1);
        syncStorage();
        renderMemories();
        renderHomeHighlights();
    }
    else if (mem) window.deleteMemory(memId);
};

window.addImageToMemoryPrompt = (id) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const aiLoader = document.getElementById('ai-loader');
            if (aiLoader) aiLoader.style.display = 'flex';
            const reader = new FileReader();
            const rawData = await new Promise(r => {
                reader.onload = (ev) => r(ev.target.result);
                reader.readAsDataURL(file);
            });
            const compressed = await compressImage(rawData);
            const mem = memories.find(m => m.id === id);
            if (mem.images.length < 5) {
                mem.images.push({ src: compressed, frame: 'frame-modern-glass', filter: 'ai-filter-0' });
                syncStorage();
                renderMemories();
                renderHomeHighlights();
            }
            if (aiLoader) aiLoader.style.display = 'none';
        }
    };
    i.click();
};

/**
 * Gallery Tab Logic
 */
const galleryTabs = document.querySelectorAll('.gallery-tab');
const galleryContents = document.querySelectorAll('.gallery-content');
const galleryIndicator = document.querySelector('.gallery-tab-indicator');

galleryTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
        galleryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (galleryIndicator) galleryIndicator.style.transform = `translateX(${index * 100}%)`;
        const target = tab.getAttribute('data-gallery-tab');
        galleryContents.forEach(c => {
            c.classList.remove('active');
            if (c.id === `gallery-${target}`) c.classList.add('active');
        });
        if (target === 'view') renderMemories();
    });
});

/**
 * QUALITY TIME - DECISION WHEEL LOGIC
 */
let wheelOptions = [
    { text: "Movie Night" },
    { text: "Fancy Dinner" }
];

let isSpinning = false;
let currentRotation = 0;

function initWheel() {
    const wheel = document.getElementById('wheel');
    const inputsContainer = document.getElementById('wheel-inputs');
    if (!wheel || !inputsContainer) return;

    // 1. Game Tabs Logic (Matching Home Screen Logic)
    const gameTabs = document.querySelectorAll('.game-tab');
    const gameViews = document.querySelectorAll('.game-view');
    const gameIndicator = document.querySelector('.game-tab-indicator');

    function moveGameIndicator(el) {
        if (!el || !gameIndicator) return;
        const rect = el.getBoundingClientRect();
        const tabsBox = document.querySelector('.game-tabs');
        if (!tabsBox) return;
        const boxRect = tabsBox.getBoundingClientRect();
        const x = rect.left - boxRect.left - 6; // -6 for padding
        gameIndicator.style.transform = `translateX(${x}px)`;
        gameIndicator.style.width = `${rect.width}px`;
    }

    // Initial position
    setTimeout(() => {
        const activeGameTab = document.querySelector('.game-tab.active');
        if (activeGameTab) moveGameIndicator(activeGameTab);
    }, 200);

    gameTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            gameTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            moveGameIndicator(tab);

            const target = tab.getAttribute('data-game');
            gameViews.forEach(v => {
                v.classList.remove('active');
                if (v.id === `game-${target}`) v.classList.add('active');
            });
        });
    });

    // 2. Customization Logic
    function refreshWheel() {
        const inputs = inputsContainer.querySelectorAll('input');
        wheelOptions = Array.from(inputs).map(inp => ({ text: inp.value || "Option" }));
        renderWheel();
    }

    function renderWheel() {
        wheel.innerHTML = '';
        const numOptions = wheelOptions.length;
        if (numOptions === 0) return;
        const arcSize = 360 / numOptions;

        let conicGradient = "conic-gradient(";
        wheelOptions.forEach((opt, i) => {
            const startDeg = i * arcSize;
            const endDeg = (i + 1) * arcSize;
            const bgColor = i % 2 === 0 ? 'rgba(224, 191, 184, 0.2)' : 'rgba(255, 255, 255, 0.05)';
            conicGradient += `${bgColor} ${startDeg}deg ${endDeg}deg${i === numOptions - 1 ? '' : ','}`;

            const segment = document.createElement('div');
            segment.className = 'wheel-segment';
            segment.style.transform = `rotate(${startDeg + arcSize / 2}deg)`;
            segment.innerHTML = `<span>${opt.text}</span>`;
            wheel.appendChild(segment);
        });
        conicGradient += ")";
        wheel.style.background = conicGradient;
    }

    function createInputRow(val = "") {
        const row = document.createElement('div');
        row.className = 'input-row';
        row.innerHTML = `
            <input type="text" placeholder="Option" value="${val}">
            <button class="remove-input"><i class="fa-solid fa-times"></i></button>
        `;
        const input = row.querySelector('input');
        input.addEventListener('input', refreshWheel);
        row.querySelector('.remove-input').addEventListener('click', () => {
            row.remove();
            refreshWheel();
        });
        return row;
    }

    const addBtn = document.getElementById('add-option');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            if (inputsContainer.querySelectorAll('.input-row').length < 12) {
                inputsContainer.appendChild(createInputRow());
                refreshWheel();
            }
        });
    }

    // Initialize inputs with default values
    inputsContainer.innerHTML = '';
    wheelOptions.forEach(opt => inputsContainer.appendChild(createInputRow(opt.text)));
    renderWheel();


    // 3. Spin Logic
    const spinBtn = document.getElementById('spin-btn');
    const spinSound = document.getElementById('spin-sound');
    const winSound = document.getElementById('win-sound');

    if (spinBtn) {
        // Handle Spin
        spinBtn.onclick = () => {
            if (isSpinning || wheelOptions.length === 0) return;
            isSpinning = true;

            const resultCard = document.getElementById('wheel-result');
            if (resultCard) resultCard.style.display = 'none';

            // Play Sound
            if (spinSound) {
                spinSound.currentTime = 0;
                spinSound.play().catch(e => console.log("Audio play blocked", e));
            }

            const extraDegrees = Math.floor(Math.random() * 360) + 1800;
            currentRotation += extraDegrees;
            wheel.style.transform = `rotate(${currentRotation}deg)`;

            setTimeout(() => {
                isSpinning = false;
                if (spinSound) spinSound.pause();
                if (winSound) {
                    winSound.currentTime = 0;
                    winSound.play().catch(e => console.log("Audio play blocked", e));
                }

                const actualRotation = currentRotation % 360;
                const arcSize = 360 / wheelOptions.length;
                const winIdx = Math.floor(((360 - (currentRotation % 360)) % 360) / arcSize);
                const winner = wheelOptions[winIdx];

                const resultText = document.getElementById('result-text');
                if (resultText) resultText.textContent = winner.text;
                if (resultCard) resultCard.style.display = 'flex';
                if (window.navigator.vibrate) window.navigator.vibrate(200);
            }, 4000);
        };
    }

    const closeBtn = document.getElementById('close-result');
    if (closeBtn) {
        closeBtn.onclick = () => {
            const rc = document.getElementById('wheel-result');
            if (rc) rc.style.display = 'none';
        };
    }

    // 4. Test Games Logic
    const clickSound = document.getElementById('click-sound');
    const diceSound = document.getElementById('dice-sound');

    // Game 2: Questions
    const questions = [
        "What's your favorite memory of us?",
        "If we could go anywhere tomorrow, where would it be?",
        "What's one thing you love about our home?",
        "What's a dream you haven't told me yet?",
        "What was your first impression of me?"
    ];
    const qBtn = document.getElementById('next-question');
    const qBox = document.getElementById('question-box');
    if (qBtn && qBox) {
        qBtn.addEventListener('click', () => {
            if (clickSound) {
                clickSound.currentTime = 0;
                clickSound.play().catch(e => console.log(e));
            }
            const randomQ = questions[Math.floor(Math.random() * questions.length)];
            qBox.style.opacity = 0;
            setTimeout(() => {
                qBox.textContent = randomQ;
                qBox.style.opacity = 1;
            }, 300);
        });
    }

    // Game 3: Dice
    const dBtn = document.getElementById('roll-dice');
    const diceIcons = ['fa-dice-one', 'fa-dice-two', 'fa-dice-three', 'fa-dice-four', 'fa-dice-five', 'fa-dice-six'];
    if (dBtn) {
        dBtn.addEventListener('click', () => {
            if (diceSound) {
                diceSound.currentTime = 0;
                diceSound.play().catch(e => console.log(e));
            }

            const dice = [document.getElementById('dice-1'), document.getElementById('dice-2')];
            dice.forEach(d => d.style.animation = 'boutiquePulse 0.5s infinite');

            setTimeout(() => {
                const d1 = Math.floor(Math.random() * 6);
                const d2 = Math.floor(Math.random() * 6);
                dice[0].className = `fa-solid ${diceIcons[d1]}`;
                dice[1].className = `fa-solid ${diceIcons[d2]}`;
                dice.forEach(d => d.style.animation = 'none');
            }, 600);
        });
    }

    // Game 4: Counter
    let count = 0;
    const tBtn = document.getElementById('tap-btn');
    const tCount = document.getElementById('tap-count');
    if (tBtn && tCount) {
        tBtn.addEventListener('click', () => {
            if (clickSound) {
                clickSound.currentTime = 0;
                clickSound.play().catch(e => console.log(e));
            }
            count++;
            tCount.textContent = count;
            tCount.style.transform = 'scale(1.2)';
            setTimeout(() => tCount.style.transform = 'scale(1)', 100);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderMemories === 'function') renderMemories();
    if (typeof renderHomeHighlights === 'function') renderHomeHighlights();
    initWheel();
});

/**
 * PRIVATE CHAT LOGIC
 */
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatHistoryList = document.getElementById('chat-history');
const chatSound = document.getElementById('chat-sent-sound');

let chatHistory = JSON.parse(localStorage.getItem('kingdom_chat_history_v2') || "[]");

function renderChat() {
    if (!chatHistoryList) return;
    chatHistoryList.innerHTML = '';

    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';

    let lastDate = null;

    chatHistory.forEach(msg => {
        const msgDateObj = new Date(msg.timestamp);
        const msgDate = msgDateObj.toLocaleDateString('en-GB');

        if (msgDate !== lastDate) {
            const separator = document.createElement('div');
            separator.className = 'chat-date-separator';
            const today = new Date().toLocaleDateString('en-GB');
            separator.textContent = (msgDate === today) ? 'Today' : msgDate;
            chatHistoryList.appendChild(separator);
            lastDate = msgDate;
        }

        const isMine = msg.sender === currentUser;

        // User Request: Me on LEFT, Partner on RIGHT
        // We will map 'mine' class to Left styling and 'theirs' to Right styling in CSS
        const bubble = document.createElement('div');
        // We add specific classes for clarity: 'msg-left' (Me) and 'msg-right' (Them)
        // to avoid confusion with previous 'mine/theirs' generic content
        const alignClass = isMine ? 'msg-left' : 'msg-right';
        bubble.className = `message-bubble ${alignClass}`;

        const time = msgDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        bubble.innerHTML = `
            <span class="message-sender">${msg.sender}</span>
            ${msg.type === 'gif' ? `<img src="${msg.text}" class="chat-gif">` : msg.text}
            <span class="message-time">${time}</span>
        `;

        chatHistoryList.appendChild(bubble);
    });

    scrollToBottom();
}

function scrollToBottom() {
    if (chatHistoryList) {
        chatHistoryList.scrollTop = chatHistoryList.scrollHeight;
    }
}

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    sendChatContent(text, 'text');
    chatInput.value = '';
}

function sendGif(imgUrl) {
    sendChatContent(imgUrl, 'gif');
    toggleGifPicker(false); // Close after sending
}

function sendChatContent(content, type) {
    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';

    const newMessage = {
        id: Date.now(),
        text: content,
        type: type, // 'text' or 'gif'
        sender: currentUser,
        timestamp: Date.now()
    };

    chatHistory.push(newMessage);
    localStorage.setItem('kingdom_chat_history_v2', JSON.stringify(chatHistory));

    renderChat();

    if (chatSound) {
        chatSound.volume = 0.5;
        chatSound.currentTime = 0;
        chatSound.play().catch(e => console.log('Audio autoplay blocked', e));
    }

    // Reset typing status on send
    updateTypingStatus(currentUser, false);
}

// GIF Picker Logic
const gifBtn = document.getElementById('chat-gif-btn');
const gifPicker = document.getElementById('chat-gif-picker');

// Ensure sendGif is globally accessible for HTML onclick events
window.sendGif = sendGif;

function toggleGifPicker(e) {
    // Prevent event bubbling if triggered by click
    if (e && e.stopPropagation) e.stopPropagation();

    if (!gifPicker) return;

    // Check computed style if inline style is missing
    const currentStyle = window.getComputedStyle(gifPicker).display;
    const isHidden = currentStyle === 'none';

    gifPicker.style.display = isHidden ? 'block' : 'none';
}

// Robust Listener Attachment
if (gifBtn) {
    gifBtn.addEventListener('click', toggleGifPicker);
    console.log("GIF Button Listener Attached"); // Debug
} else {
    // Retry in case of loading race condition
    setTimeout(() => {
        const btn = document.getElementById('chat-gif-btn');
        if (btn) btn.addEventListener('click', toggleGifPicker);
    }, 1000);
}

// Close picker if clicking outside
document.addEventListener('click', (e) => {
    if (gifPicker && gifPicker.style.display === 'block') {
        // If click is NOT inside picker AND NOT the toggle button
        if (!gifPicker.contains(e.target) && e.target !== gifBtn && !gifBtn.contains(e.target)) {
            gifPicker.style.display = 'none';
        }
    }
});

if (chatSendBtn) {
    chatSendBtn.addEventListener('click', sendMessage);
}

if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // Typing Event Listener
    chatInput.addEventListener('input', () => {
        const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
        updateTypingStatus(currentUser, true);
    });
}

// Typing Logic
let typingTimeout = null;
function updateTypingStatus(user, isTyping) {
    const status = JSON.parse(localStorage.getItem('kingdom_typing_status') || "{}");
    status[user] = { isTyping: isTyping, timestamp: Date.now() };
    localStorage.setItem('kingdom_typing_status', JSON.stringify(status));

    if (isTyping) {
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            updateTypingStatus(user, false);
        }, 3000);
    }
}

function checkTypingIndicator() {
    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
    const otherUser = currentUser === 'Aviya' ? 'David' : 'Aviya';
    const status = JSON.parse(localStorage.getItem('kingdom_typing_status') || "{}");

    // Check if other user is typing and active recently
    const otherStatus = status[otherUser];
    const isTyping = otherStatus && otherStatus.isTyping && (Date.now() - otherStatus.timestamp < 4000);

    const indicator = document.getElementById('chat-typing-indicator');
    if (!indicator) {
        // Create if missing
        const div = document.createElement('div');
        div.id = 'chat-typing-indicator';
        div.className = 'typing-indicator';
        div.innerHTML = '<span></span><span></span><span></span>';
        chatHistoryList.appendChild(div);
        scrollToBottom();
    } else {
        // Toggle visibility
        const wasVisible = indicator.style.display === 'block';
        indicator.style.display = isTyping ? 'block' : 'none';
        if (!wasVisible && isTyping) scrollToBottom();

        // Ensure it's always at the bottom
        chatHistoryList.appendChild(indicator);
    }
}

// Initial render
renderChat();

window.addEventListener('storage', (e) => {
    if (e.key === 'kingdom_chat_history_v2') {
        chatHistory = JSON.parse(e.newValue || "[]");
        renderChat();
    }
    if (e.key === 'kingdom_typing_status') {
        checkTypingIndicator();
    }
});

// Poll frequently for typing cleanup
setInterval(checkTypingIndicator, 1000);

const chatTabBtn = document.querySelector('[data-tab="chat"]');
if (chatTabBtn) {
    chatTabBtn.addEventListener('click', () => {
        setTimeout(scrollToBottom, 50);
    });
}



/**
 * STORIES & CAMERA LOGIC - INSTAGRAM STYLE V2
 */

let cameraStream = null;
let currentFilter = 'none';

// -- Editor State --
let activeTextElement = null;
let isDraggingText = false;
let currentFont = 'classic';
let currentColor = '#ffffff';

// -- Elements --
const cameraInterface = document.getElementById('camera-interface');
const storyEditor = document.getElementById('story-editor');
const videoElement = document.getElementById('camera-feed');
const canvasElement = document.getElementById('camera-canvas');
const capturedImage = document.getElementById('captured-image');
const filterBtns = document.querySelectorAll('.filter-btn');
const captureBtn = document.getElementById('capture-btn');

// New Editor Elements
const textLayer = document.getElementById('text-layer');
const textControls = document.getElementById('text-controls');
const toggleTextBtn = document.getElementById('toggle-text-mode');
const closeEditorBtn = document.getElementById('close-editor');
const storyCaptionInput = document.getElementById('story-caption'); // Bottom input
const fontBtns = document.querySelectorAll('.font-btn');
const colorDots = document.querySelectorAll('.color-dot');
const sendStoryBtn = document.getElementById('send-story-btn');

// 1. Camera Access
async function startCamera() {
    if (cameraStream) return;
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        if (videoElement) {
            videoElement.srcObject = cameraStream;
            videoElement.onloadedmetadata = () => videoElement.play();
        }
    } catch (err) {
        console.error("Camera Error:", err);
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// 2. Tab Observer
const createTabObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.id === 'create') {
            if (mutation.target.classList.contains('active')) {
                startCamera();
            } else {
                stopCamera();
            }
        }
    });
});
const createSection = document.getElementById('create');
if (createSection) createTabObserver.observe(createSection, { attributes: true, attributeFilter: ['class'] });

// 3. Filters
if (filterBtns) {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            const filterClass = `filter-${currentFilter}`;
            if (videoElement) {
                videoElement.className = '';
                if (currentFilter !== 'none') videoElement.classList.add(filterClass);
            }
            if (capturedImage) {
                capturedImage.className = 'preview-img';
                if (currentFilter !== 'none') capturedImage.classList.add(filterClass);
            }
        });
    });
}

// 4. Capture
if (captureBtn) {
    captureBtn.addEventListener('click', () => {
        if (!videoElement || !canvasElement) return;
        const width = videoElement.videoWidth;
        const height = videoElement.videoHeight;
        canvasElement.width = width;
        canvasElement.height = height;
        const ctx = canvasElement.getContext('2d');

        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoElement, 0, 0, width, height); // Raw capture

        capturedImage.src = canvasElement.toDataURL('image/jpeg', 0.9);

        // Reset Editor State
        textLayer.innerHTML = '';
        if (storyCaptionInput) storyCaptionInput.value = '';

        cameraInterface.style.display = 'none';
        storyEditor.style.display = 'flex';
    });
}

// 5. Editor Logic - Text & Overlay

// 5.a Toggle Text Mode
if (toggleTextBtn) {
    toggleTextBtn.addEventListener('click', () => {
        // Create a new draggable text element center screen
        const textSpan = document.createElement('div');
        textSpan.contentEditable = true;
        textSpan.className = `drag-text-item font-${currentFont}`;
        textSpan.style.color = currentColor;
        textSpan.innerText = "Type here...";
        textSpan.style.left = '50%';
        textSpan.style.top = '50%';

        textLayer.appendChild(textSpan);

        // Focus and Select
        textSpan.focus();
        document.execCommand('selectAll', false, null);

        // Show controls
        if (textControls) textControls.style.display = 'flex';
        activeTextElement = textSpan;

        // Bind Dragging
        enableDrag(textSpan);

        // Bind Focus events to show/hide controls
        textSpan.addEventListener('focus', () => {
            activeTextElement = textSpan;
            if (textControls) textControls.style.display = 'flex';
        });
        textSpan.addEventListener('blur', () => {
            // delay hiding to allow clicking controls
            setTimeout(() => {
                if (document.activeElement !== textSpan && !textControls.contains(document.activeElement)) {
                    if (textControls) textControls.style.display = 'none';
                }
            }, 200);
        });
    });
}

// 5.b Font Switching
if (fontBtns) {
    fontBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            fontBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFont = btn.getAttribute('data-font');

            if (activeTextElement) {
                // Remove old font classes
                activeTextElement.classList.remove('font-classic', 'font-modern', 'font-neon', 'font-hand');
                activeTextElement.classList.add(`font-${currentFont}`);
                activeTextElement.focus();
            }
        });
    });
}

// 5.c Color Switching
if (colorDots) {
    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            currentColor = dot.getAttribute('data-color');

            if (activeTextElement) {
                activeTextElement.style.color = currentColor;
                if (currentFont === 'neon') activeTextElement.style.color = currentColor; // Neon logic handles text-shadow in CSS
                activeTextElement.focus();
            }
        });
    });
}

// 5.d Draggable Logic
function enableDrag(el) {
    let isDown = false;
    let startX, startY, initialLeft, initialTop;

    const start = (e) => {
        if (e.target !== el) return;
        isDown = true;
        activeTextElement = el; // Set active on touch
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        startX = clientX;
        startY = clientY;

        // Get current percentages or pixels
        const rect = el.getBoundingClientRect();
        const parentRect = textLayer.getBoundingClientRect();

        // We work with center positions to match the CSS 'translate(-50%, -50%)'
        // Current Center X relative to parent
        initialLeft = el.offsetLeft;
        initialTop = el.offsetTop;
    };

    const move = (e) => {
        if (!isDown) return;
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const dx = clientX - startX;
        const dy = clientY - startY;

        el.style.left = `${initialLeft + dx}px`;
        el.style.top = `${initialTop + dy}px`;
    };

    const end = () => {
        isDown = false;
    };

    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start);

    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });

    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
}

// 6. Close / Retake
if (closeEditorBtn) {
    closeEditorBtn.addEventListener('click', () => {
        storyEditor.style.display = 'none';
        cameraInterface.style.display = 'flex';
    });
}

// 7. Share Logic - Burn Text to Image
if (sendStoryBtn) {
    sendStoryBtn.addEventListener('click', () => {
        const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';

        // Composite Image Generation
        // We need to draw the textLayer ON TOP of the image in the canvas
        const ctx = canvasElement.getContext('2d');
        // Canvas is already holding the raw photo.
        // We generally need to redraw the photo because we might have lost it? 
        // No, canvasElement still has it unless resizing cleared it.
        // Safer: Draw the `capturedImage` back to canvas first, then draw text.

        const img = new Image();
        img.src = capturedImage.src;
        img.onload = () => {
            canvasElement.width = img.width;
            canvasElement.height = img.height;

            // 1. Draw Filters? 
            // CSS Filters on <img> don't transfer to Canvas automatically.
            // We must simulate them or just use CSS in viewer. 
            // For MVP: We burn the TEXT, but keep filter as metadata or CSS.
            // BUT user wants "Just like instagram".
            // Let's rely on the Viewer applying the filter class.
            // We ONLY burn text here.

            ctx.drawImage(img, 0, 0);

            // 2. Burn Text
            // We need to map screen coordinates to canvas coordinates.
            const previewRect = document.getElementById('editor-preview-container').getBoundingClientRect();
            const scaleX = canvasElement.width / previewRect.width;
            const scaleY = canvasElement.height / previewRect.height;

            const textNodes = textLayer.children;
            Array.from(textNodes).forEach(node => {
                const nodeRect = node.getBoundingClientRect();

                // Calculate position relative to the image container
                const relativeLeft = (nodeRect.left - previewRect.left) * scaleX;
                const relativeTop = (nodeRect.top - previewRect.top) * scaleY;
                const nodeWidth = nodeRect.width * scaleX;

                // Style
                const computed = window.getComputedStyle(node);
                const fontSize = parseFloat(computed.fontSize) * scaleX; // Approx scaling
                const fontFamily = computed.fontFamily;
                const color = computed.color;

                ctx.font = `${computed.fontWeight} ${fontSize}px ${fontFamily}`;
                ctx.fillStyle = color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Multiline handling not perfect here but "center" helps
                // Position: nodeRect center
                const centerX = relativeLeft + (nodeWidth / 2);
                const centerY = relativeTop + (nodeRect.height * scaleY / 2);

                ctx.save();
                // Add Shadow if Neon
                if (node.classList.contains('font-neon')) {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 15;
                }

                ctx.fillText(node.innerText, centerX, centerY);
                ctx.restore();
            });

            // 3. Final Blob
            const finalImage = canvasElement.toDataURL('image/jpeg', 0.85);

            const newStory = {
                id: Date.now(),
                author: currentUser,
                imageUrl: finalImage,
                text: storyCaptionInput.value || "", // Bottom caption
                filter: currentFilter,
                timestamp: Date.now()
            };

            const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
            stories.push(newStory);
            localStorage.setItem('kingdom_stories', JSON.stringify(stories));

            // UI Reset
            storyEditor.style.display = 'none';
            cameraInterface.style.display = 'flex';
            renderStatusRings();

            const homeTab = document.querySelector('[data-tab="home"]');
            if (homeTab) homeTab.click();
        };
    });
}

// 8. Renders & Viewer (Existing logic preserved/updated)
function renderStatusRings() {
    const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
    const now = Date.now();
    const expiryTime = 24 * 60 * 60 * 1000;

    ['David', 'Aviya'].forEach(user => {
        const userStories = stories
            .filter(s => s.author === user && (now - s.timestamp) < expiryTime)
            .sort((a, b) => b.timestamp - a.timestamp);

        const ring = document.getElementById(`ring-${user}`);
        const avatar = document.getElementById(`avatar-${user}`);

        if (userStories.length > 0) {
            if (ring) ring.classList.add('has-story');
            if (avatar) {
                avatar.src = userStories[0].imageUrl;
                avatar.style.display = 'block';
            }
        } else {
            if (ring) ring.classList.remove('has-story');
            if (avatar) avatar.style.display = 'none';
        }
    });
}

// Allow global access for onclick events in HTML
window.viewStatus = (user) => {
    const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
    const now = Date.now();
    let validStories = stories
        .filter(s => s.author === user && (now - s.timestamp) < 24 * 60 * 60 * 1000)
        .sort((a, b) => a.timestamp - b.timestamp);

    if (validStories.length === 0) return;

    const viewer = document.getElementById('story-viewer');
    const imgObj = document.getElementById('story-viewer-img');
    const textObj = document.getElementById('story-viewer-text');
    const progressFill = document.getElementById('story-progress-fill');
    const deleteBtn = document.getElementById('delete-story-btn');
    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';

    if (!viewer) return;
    viewer.classList.add('active');

    let currentIndex = 0;
    let autoAdvanceTimer = null;
    const STORY_DURATION = 5000;

    function playStory(index) {
        if (index >= validStories.length) {
            closeViewer();
            return;
        }

        currentIndex = index;
        const story = validStories[index];

        // Ownership Check for Delete Button
        if (deleteBtn) {
            if (story.author === currentUser) {
                deleteBtn.style.display = 'flex';
                // Remove old listeners to avoid multiple bindings
                const newBtn = deleteBtn.cloneNode(true);
                deleteBtn.parentNode.replaceChild(newBtn, deleteBtn);

                newBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (confirm("למחוק את הסטורי הזה?")) {
                        deleteStory(story.id);
                    }
                };
            } else {
                deleteBtn.style.display = 'none';
            }
        }

        imgObj.src = story.imageUrl;
        textObj.textContent = story.text;
        textObj.style.display = story.text ? 'block' : 'none';

        // Apply Filter
        imgObj.className = 'viewer-img';
        if (story.filter && story.filter !== 'none') {
            imgObj.classList.add(`filter-${story.filter}`);
        }

        // Animate Progress Bar
        progressFill.style.transition = 'none';
        progressFill.style.width = '0%';
        void progressFill.offsetWidth;
        progressFill.style.transition = `width ${STORY_DURATION}ms linear`;
        progressFill.style.width = '100%';

        // Setup next
        clearTimeout(autoAdvanceTimer);
        autoAdvanceTimer = setTimeout(() => playStory(index + 1), STORY_DURATION);
    }

    function deleteStory(storyId) {
        let allStories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
        allStories = allStories.filter(s => s.id !== storyId);
        localStorage.setItem('kingdom_stories', JSON.stringify(allStories));

        // Remove from current viewing list
        validStories = validStories.filter(s => s.id !== storyId);

        if (validStories.length === 0) {
            closeViewer();
        } else {
            if (currentIndex >= validStories.length) currentIndex = validStories.length - 1;
            playStory(currentIndex);
        }
        renderStatusRings();
    }

    playStory(0); // Start

    window.closeViewer = () => {
        clearTimeout(autoAdvanceTimer);
        viewer.classList.remove('active');
        imgObj.src = '';
    };

    const closeBtn = document.getElementById('close-viewer');
    if (closeBtn) closeBtn.onclick = window.closeViewer;
};

// Start Status Listeners
renderStatusRings();
setInterval(renderStatusRings, 60000); // Auto refresh every minute
