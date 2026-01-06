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

function moveIndicator(el) {
    if (!el || !indicator) return;
    const rect = el.getBoundingClientRect();
    const navBar = document.querySelector('.glass-nav');
    if (!navBar) return;
    const navRect = navBar.getBoundingClientRect();
    const x = rect.left - navRect.left;
    indicator.style.transform = `translateX(${x}px)`;
}

// Initial position
setTimeout(() => {
    const activeItem = document.querySelector('.nav-item.active');
    if (activeItem) moveIndicator(activeItem);
}, 100);

// Update position on resize
window.addEventListener('resize', () => {
    const activeItem = document.querySelector('.nav-item.active');
    if (activeItem) moveIndicator(activeItem);
});

navItems.forEach(item => {
    item.addEventListener('click', () => {
        if (item.classList.contains('active')) return;

        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        moveIndicator(item);

        const target = item.getAttribute('data-tab');

        // Use a small delay to ensure the transitions feel distinct
        views.forEach(v => {
            v.classList.remove('active');
            if (v.id === target) {
                setTimeout(() => {
                    v.classList.add('active');
                    if (v.classList.contains('scrollable')) {
                        v.scrollTop = 0;
                    }
                }, 50);
            }
        });
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
let memories = JSON.parse(localStorage.getItem('kingdom_memories')) || [];

// Add Sample Data if empty
if (memories.length === 0) {
    const samples = [
        {
            id: 1704540000001,
            text: "ערב רומנטי בלתי נשכח מתחת לאור הנרות. הטעמים, המוזיקה והאווירה היו פשוט מושלמים.",
            themeColor: 'rgba(224, 191, 184, 0.4)',
            isCollapsed: false,
            images: [
                { src: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80", frame: 'frame-classic-gold', filter: 'ai-filter-0' },
                { src: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80", frame: 'frame-modern-glass', filter: 'ai-filter-1' }
            ]
        },
        {
            id: 1704540000002,
            text: "השקיעה הכי יפה שראינו בשנה האחרונה. רגע של שקט מול עוצמתו של הים.",
            themeColor: 'rgba(242, 210, 189, 0.4)',
            isCollapsed: true,
            images: [
                { src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80", frame: 'frame-polaroid', filter: 'ai-filter-2' }
            ]
        },
        {
            id: 1704540000003,
            text: "זמן יצירה וריכוז. הממלכה הטכנולוגית שלי במיטבה.",
            themeColor: 'rgba(44, 62, 80, 0.4)',
            isCollapsed: true,
            images: [
                { src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80", frame: 'frame-minimal-rose', filter: 'ai-filter-0' },
                { src: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80", frame: 'frame-modern-glass', filter: 'ai-filter-3' }
            ]
        },
        {
            id: 1704540000004,
            text: "טיול בוקר ביער הקסום. האוויר נקי והנשימה עמוקה.",
            themeColor: 'rgba(76, 161, 175, 0.4)',
            isCollapsed: true,
            images: [
                { src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80", frame: 'frame-classic-gold', filter: 'ai-filter-2' }
            ]
        }
    ];
    memories = samples;
    localStorage.setItem('kingdom_memories', JSON.stringify(memories));
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
                const winningIndex = Math.floor((360 - (actualRotation % 360)) % 360 / (arcs = 360 / wheelOptions.length));
                // Recalculate correctly
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
