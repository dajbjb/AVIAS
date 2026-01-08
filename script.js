/**
 * Kingdom - Background Logic
 * Generates floating hearts for the 'Tech & Love' vibe.
 */

window.onerror = function (msg, url, line) {
    // Emergency Rescue: Hide loaders if JS crashes
    const loaders = document.querySelectorAll('.ai-loader, .loading-screen');
    loaders.forEach(l => l.style.display = 'none');

    // Alert user if not a known benign error
    if (!msg.includes('ResizeObserver')) {
        alert("App Error: " + msg + "\nLine: " + line);
    }
};

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

// --- FIREBASE CONFIGURATION & SYNC ---
const firebaseConfig = {
    apiKey: "AIzaSyBP-QtaPE4FAKwXNIjOlJ0s5kuVX25GeuY",
    authDomain: "kingdomapp-ec532.firebaseapp.com",
    projectId: "kingdomapp-ec532",
    storageBucket: "kingdomapp-ec532.firebasestorage.app",
    messagingSenderId: "266165085520",
    appId: "1:266165085520:web:fbcaa61695342509b6b855"
};

// Initialize Firebase (Compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const SyncManager = {
    CHAT_COLLECTION: 'kingdom_chats',
    STORY_COLLECTION: 'kingdom_stories',
    MEMORIES_COLLECTION: 'kingdom_memories',

    // Backup Keys
    LOCAL_CHAT_KEY: 'kingdom_chat_backup_v1',
    LOCAL_STORY_KEY: 'kingdom_story_backup_v1',

    isConnected: false,
    lastError: "No error yet.",

    init: function () {
        console.log("Starting Hybrid Sync Services...");
        this.createStatusIndicator();

        // 1. ALWAYS Load Local Data First
        this.loadLocalBackup();

        // 2. Connect to Cloud (Config is now valid)
        this.listenToChats();
        this.listenToStories();
        this.listenToMemories();
    },



    createStatusIndicator: function () {
        const div = document.createElement('div');
        div.id = 'cloud-status';
        // Increased size and interactivity for mobile debugging
        div.style.cssText = "position:fixed; top:15px; left:15px; width:15px; height:15px; border-radius:50%; background:yellow; z-index:9999; box-shadow: 0 0 5px rgba(0,0,0,0.5); cursor:pointer; border: 2px solid white;";
        document.body.appendChild(div);

        div.onclick = () => {
            alert("Cloud Status: " + (this.isConnected ? "CONNECTED ✅" : "DISCONNECTED ❌") + "\n\nLast Error:\n" + this.lastError);
        };
    },

    updateStatus: function (online, errorMsg = null) {
        this.isConnected = online;
        const el = document.getElementById('cloud-status');
        if (el) el.style.background = online ? '#00ff00' : 'red';
        if (errorMsg) {
            console.error("Sync Error:", errorMsg);
            this.lastError = typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg;
        } else if (online) {
            this.lastError = "Connected successfully.";
        }
    },

    loadLocalBackup: function () {
        // Chat
        const localChat = JSON.parse(localStorage.getItem(this.LOCAL_CHAT_KEY) || "[]");
        if (localChat.length > 0) {
            chatHistory = localChat;
            renderChat();
        }
    },

    // --- CHAT SYNC ---
    listenToChats: function () {
        db.collection(this.CHAT_COLLECTION)
            .orderBy('timestamp', 'asc')
            .limit(100)
            .onSnapshot((snapshot) => {
                this.updateStatus(true);
                const cloudMessages = [];
                snapshot.forEach(doc => cloudMessages.push(doc.data()));

                // Merge: We prefer Cloud, but if Cloud is empty and we have local, keep local?
                // Actually, if connection works, Cloud is truth. 
                // BUT to solve "deletes everything", we only override if we got data.
                if (cloudMessages.length > 0) {
                    chatHistory = cloudMessages;
                    // Update Backup
                    localStorage.setItem(this.LOCAL_CHAT_KEY, JSON.stringify(chatHistory));
                    renderChat();
                    scrollToBottom();
                }
            }, (error) => {
                let msg = error.message;
                if (error.code === 'permission-denied') {
                    msg = "PERMISSION DENIED: You need to fix Firestore Rules.\nGo to Firebase Console -> Firestore -> Rules.\nChange to: allow read, write: if true;";
                }
                if (!this.isConnected) alert("Sync Error: " + msg);
                this.updateStatus(false, msg);
            });
    },

    sendChat: function (msg) {
        // 1. Optimistic Local Save (Instant UI)
        // Check for duplicates to avoid adding twice if we are re-sending
        // Simple check: compare last message timestamp
        const lastMsg = chatHistory[chatHistory.length - 1];
        if (!lastMsg || lastMsg.timestamp !== msg.timestamp) {
            chatHistory.push(msg);
            localStorage.setItem(this.LOCAL_CHAT_KEY, JSON.stringify(chatHistory));
            renderChat();
            scrollToBottom();
        }

        // 2. Send to Cloud
        msg.status = 'sent';
        db.collection(this.CHAT_COLLECTION).add(msg)
            .then(() => {
                console.log("Sent to cloud");
                this.updateStatus(true);
            })
            .catch((e) => {
                this.updateStatus(false, e.message);
            });
    },

    markMessagesAsRead: function (otherUser) {
        // Cloud only feature
        const batch = db.batch();
        db.collection(this.CHAT_COLLECTION)
            .where('sender', '==', otherUser)
            .where('status', '!=', 'read')
            .get()
            .then(snapshot => {
                if (snapshot.empty) return;
                snapshot.forEach(doc => {
                    const ref = db.collection(this.CHAT_COLLECTION).doc(doc.id);
                    batch.update(ref, { status: 'read' });
                });
                batch.commit();
            }).catch(e => console.log(e));
    },

    // --- STORY SYNC ---
    listenToStories: function () {
        db.collection(this.STORY_COLLECTION)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot((snapshot) => {
                const stories = [];
                snapshot.forEach(doc => stories.push({ id: doc.id, ...doc.data() }));

                // Persist & Render
                localStorage.setItem('kingdom_stories', JSON.stringify(stories)); // Use standard key for compatibility
                renderStatusRings();
            });
    },

    addStory: function (storyData) {
        // Optimistic Local
        const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
        stories.unshift(storyData); // Add to top
        localStorage.setItem('kingdom_stories', JSON.stringify(stories));
        renderStatusRings();

        // Cloud
        db.collection(this.STORY_COLLECTION).add(storyData);
    },

    deleteStory: function (storyId) {
        // Local Delete
        let stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
        stories = stories.filter(s => s.id !== storyId && s.timestamp !== storyId); // Handle both types of IDs
        localStorage.setItem('kingdom_stories', JSON.stringify(stories));
        renderStatusRings();

        // Cloud Delete
        db.collection(this.STORY_COLLECTION).doc(storyId).delete().catch(e => console.log(e));
    },

    // --- MEMORIES SYNC ---
    listenToMemories: function () {
        db.collection(this.MEMORIES_COLLECTION)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .onSnapshot((snapshot) => {
                const fetchedMemories = [];
                snapshot.forEach(doc => fetchedMemories.push({ id: doc.id, ...doc.data() }));

                memories = fetchedMemories;
                localStorage.setItem('kingdom_memories', JSON.stringify(memories));
                renderMemories();
            });
    },

    addMemory: function (memoryData) {
        memories.unshift(memoryData);
        localStorage.setItem('kingdom_memories', JSON.stringify(memories));
        renderMemories();
        db.collection(this.MEMORIES_COLLECTION).add(memoryData);
    }
};

// Start Sync moved to end of file to prevent ReferenceError
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
    // Let's assume X is left edge.
    const targetLeftX = targetCenterX - (indicator.offsetWidth / 2);

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

                // STOP CAMERA EXPLICITLY if not on create tab
                if (target !== 'create' && typeof stopCamera === 'function') {
                    stopCamera();
                }

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

let cameraStream = null; // Global variable to hold the camera stream

// 1. Smart Camera Access with Fallbacks
async function startCamera() {
    if (cameraStream) return; // Already running

    const fallbackContainer = document.getElementById('mobile-fallback-container');
    const videoEl = document.getElementById('camera-feed');

    const constraints = {
        video: {
            facingMode: 'user', // Front camera preference
            width: { ideal: 1280 },
            height: { ideal: 720 }
        },
        audio: false
    };

    try {
        // Attempt standard access
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (videoEl) {
            videoEl.srcObject = cameraStream;
            videoEl.onloadedmetadata = () => {
                videoEl.play().catch(e => {
                    console.warn("Autoplay blocked, showing manual start", e);
                    if (fallbackContainer) fallbackContainer.style.display = 'block';
                });
            };
            // Hide fallback if successful
            if (fallbackContainer) fallbackContainer.style.display = 'none';
        }
    } catch (err) {
        console.error("Camera Access Error:", err);
        // If error (e.g., Not Secure Context on simple HTTP), show fallback
        if (fallbackContainer) {
            fallbackContainer.style.display = 'block';
        }
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// Manual Start Button (for permission issues or blocked autoplay)
const manualStartBtn = document.getElementById('start-camera-manual');
if (manualStartBtn) {
    manualStartBtn.addEventListener('click', () => {
        startCamera();
        // Or if it's already "started" but paused, try play?
        const videoEl = document.getElementById('camera-feed');
        if (videoEl && videoEl.paused && videoEl.srcObject) {
            videoEl.play();
            const fallbackContainer = document.getElementById('mobile-fallback-container');
            if (fallbackContainer) fallbackContainer.style.display = 'none';
        }
    });
}

// File Input Fallback (Native Camera App)
const cameraFileInput = document.getElementById('camera-file-input');
if (cameraFileInput) {
    cameraFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const img = new Image();
            img.onload = () => {
                // Draw to canvas to standardize
                const canvas = document.getElementById('camera-canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // Set captured image
                const capturedImage = document.getElementById('captured-image');
                capturedImage.src = canvas.toDataURL('image/jpeg', 0.85);

                // Switch to editor
                document.getElementById('camera-interface').style.display = 'none';
                document.getElementById('story-editor').style.display = 'flex';
            };
            img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// 2. Tab Awareness
const createTabObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.id === 'create') {
            const isVisible = window.getComputedStyle(mutation.target).display !== 'none';
            if (mutation.target.classList.contains('active') || isVisible) {
                // Small delay to allow transition
                setTimeout(startCamera, 300);
            } else {
                stopCamera();
            }
        }
    });
});

// Start observing the 'create' tab for changes in its 'active' class or display style
const createTab = document.getElementById('create');
if (createTab) {
    createTabObserver.observe(createTab, { attributes: true, attributeFilter: ['class', 'style'] });
}


// Initial load
setInterval(updateClock, 1000);
updateClock();
setTimeout(generateAIGreeting, 1000);

/**
 * Gallery & Memories Logic - PERSISTENCE & COMPRESSION
 */
let memories = [];
/* 
Legacy loading removed. Memories are now synced via Firebase SyncManager. 
*/

let currentDraftImages = [];

function syncStorage() {
    // Deprecated - replaced by Firebase Sync
    // console.log("Memory saved to cloud");
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
            const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
            const storyCaptionInput = document.getElementById('story-caption'); // Assuming this exists for stories
            const frameStyles = ['frame-polaroid', 'frame-modern-glass', 'frame-film-strip', 'frame-vintage-wood'];
            const themeColors = ['#A7C7E7', '#FFD1DC', '#B0E0E6', '#F0E68C', '#DDA0DD', '#98FB98']; // Example colors

            const newMemory = {
                // id: Date.now(), // Firestore generates ID
                images: currentDraftImages.map((img, idx) => ({
                    src: img,
                    frame: frameStyles[Math.floor(Math.random() * frameStyles.length)],
                    filter: `ai-filter-${idx % 4}`
                })),
                text: galleryText.value,
                themeColor: themeColors[Math.floor(Math.random() * themeColors.length)],
                isCollapsed: false,
                timestamp: Date.now()
            };

            // Use SyncManager
            SyncManager.addMemory(newMemory);

            currentDraftImages = [];
            if (galleryText) galleryText.value = '';
            if (previewArea) previewArea.style.display = 'none';
            if (textModal) textModal.style.display = 'none';
            if (aiLoader) aiLoader.style.display = 'none';

            // renderMemories() is called by listener
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
    SyncManager.init(); // Start Sync safely after DOM load

    // Ensure viewStatus is globally available
    window.viewStatus = viewStatus;
});

/**
 * DATA SYNC MANAGER (The "Middle File" Logic)
 */
/**
 * DATA SYNC MANAGER (The "Middle File" Logic)
 * REPLACED BY FIREBASE SYNC MANAGER AT TOP OF FILE
 */
/*
const SyncManagerLegacy = { ... } // Removing conflict
*/

function deleteStory(storyId) {
    if (confirm("למחוק את הסטורי הזה?")) {
        SyncManager.deleteStory(storyId);
        closeViewer(); // Close immediately, listener will update UI
    }
}
/**
 * PRIVATE CHAT LOGIC
 */
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatHistoryList = document.getElementById('chat-history');
const chatSound = document.getElementById('chat-sent-sound');

// Renamed for clarity - now loaded via SyncManager
let chatHistory = []; // Will be populated by Firebase listener

function renderChat() {
    if (!chatHistoryList) return;
    chatHistoryList.innerHTML = '';

    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
    const otherUser = currentUser === 'Aviya' ? 'David' : 'Aviya';

    // Mark as read if we are viewing
    const chatTabActive = document.querySelector('.nav-item.active[data-tab="chat"]');
    if (chatTabActive) {
        SyncManager.markMessagesAsRead(currentUser);
        // Refresh local history after mark as read update
        chatHistory = SyncManager.getLocal();
        updateUnreadBadge();
    }
    SyncManager.markMessagesAsRead(currentUser);
    // Refresh local history after mark as read update
    chatHistory = SyncManager.getLocal();
    updateUnreadBadge();
}

let lastDate = null;

chatHistory.forEach(msg => {
    // Date Separator
    const msgDateObj = new Date(msg.timestamp);
    const msgDate = msgDateObj.toLocaleDateString();
    if (msgDate !== lastDate) {
        const separator = document.createElement('div');
        separator.className = 'chat-date-separator';
        const today = new Date().toLocaleDateString();
        separator.textContent = (msgDate === today) ? 'Today' : msgDate;
        chatHistoryList.appendChild(separator);
        lastDate = msgDate;
    }

    const isMine = msg.sender === currentUser;
    const alignClass = isMine ? 'msg-left' : 'msg-right';
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${alignClass}`;

    const time = msgDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Ticks Logic
    let tickHtml = '';
    if (isMine) {
        // Check mark logic: sent (v), read (vv blue)
        const status = msg.status || 'sent';
        const tickClass = status === 'read' ? 'ticks-read' : '';
        // Icons: Check (sent), DoubleCheck (read/delivered logic)
        // If read -> blue double check. If sent -> gray single check. 
        // We can simplify: sent=single, read=double-blue.

        const icon = status === 'read' ? '<i class="fa-solid fa-check-double"></i>' : '<i class="fa-solid fa-check"></i>';
        tickHtml = `<span class="msg-ticks ${tickClass}">${icon}</span>`;
    }

    let contentHtml = msg.text;

    // Handle Image / GIF types
    if (msg.type === 'gif') {
        contentHtml = `<img src="${msg.text}" class="chat-gif">`;
    }
    else if (msg.type === 'image') {
        if (msg.viewOnce) {
            // View Once Logic
            const viewedByMe = msg.viewedBy && msg.viewedBy.includes(currentUser);
            if (viewedByMe) {
                contentHtml = `
                    <div class="view-once-expired">
                        <i class="fa-solid fa-eye-slash"></i> <span>Opened</span>
                    </div>`;
            } else {
                contentHtml = `
                    <div class="view-once-bubble" onclick="viewChatImage('${msg.id}')">
                        <i class="fa-solid fa-circle-1"></i> <span>Photo</span>
                    </div>`;
            }
        } else {
            // Standard Image
            contentHtml = `<img src="${msg.text}" class="chat-img" onclick="viewChatImage('${msg.id}')">`;
        }
    }

    bubble.innerHTML = `
            <span class="message-sender">${msg.sender}</span>
            ${contentHtml}
            <div class="msg-meta">
                <span class="message-time">${time}</span>
                ${tickHtml}
            </div>
        `;

    chatHistoryList.appendChild(bubble);
});

scrollToBottom();


function scrollToBottom() {
    if (chatHistoryList) {
        chatHistoryList.scrollTop = chatHistoryList.scrollHeight;
    }
}

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Disable momentarily to prevent double send
    chatSendBtn.disabled = true;
    setTimeout(() => chatSendBtn.disabled = false, 500);

    sendChatContent(text, 'text');
    chatInput.value = '';
}

function sendGif(imgUrl) {
    sendChatContent(imgUrl, 'gif');
    toggleGifPicker(false); // Close after sending
}

function sendChatContent(content, type, viewOnce = false) {
    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';

    const newMessage = {
        id: Date.now(),
        text: content,
        type: type, // 'text', 'gif', or 'image'
        viewOnce: viewOnce,
        viewedBy: [], // Track who viewed viewOnce messages
        sender: currentUser,
        timestamp: Date.now()
    };

    // Update Local Instance directly for speed before SyncManager saves
    chatHistory.push(newMessage);
    SyncManager.saveData(chatHistory);
    renderChat();



    chatInput.value = '';

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

function toggleGifPicker(show) {
    if (!gifPicker) return;
    if (typeof show === 'boolean') {
        gifPicker.style.display = show ? 'block' : 'none';
    } else {
        gifPicker.style.display = gifPicker.style.display === 'none' ? 'block' : 'none';
    }
}

if (gifBtn) {
    gifBtn.addEventListener('click', toggleGifPicker);
}

// Close picker if clicking outside
document.addEventListener('click', (e) => {
    if (gifPicker && gifPicker.style.display === 'block' &&
        !gifPicker.contains(e.target) &&
        e.target !== gifBtn) {
        toggleGifPicker(false);
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
    // Legacy support removed needed for firebase
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
        // Mark read when entering chat
        const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
        const otherUser = currentUser === 'Aviya' ? 'David' : 'Aviya';
        SyncManager.markMessagesAsRead(otherUser);
    });
}

/**
 * STORIES & CAMERA LOGIC - INSTAGRAM STYLE V2
 */

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


// 3. Filters Logic with Visual Effects
if (filterBtns) {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentFilter = btn.getAttribute('data-filter');
            const filterClass = `filter-${currentFilter}`;

            // Reset Video Classes
            if (videoElement) {
                videoElement.className = '';
                if (currentFilter !== 'none') videoElement.classList.add(filterClass);
            }

            // Manage Effect Overlays (Grain, Sparkles)
            const parent = videoElement ? videoElement.parentNode : null;
            if (parent) {
                // Remove existing
                const existing = parent.querySelectorAll('.dynamic-effect-overlay');
                existing.forEach(e => e.remove());

                // Add new based on filter
                if (currentFilter === 'vintage' || currentFilter === 'noir') {
                    const grain = document.createElement('div');
                    grain.className = 'effect-grain-overlay dynamic-effect-overlay';
                    parent.appendChild(grain);
                }

                if (currentFilter === 'warm') {
                    const glow = document.createElement('div');
                    glow.className = 'effect-warm-overlay dynamic-effect-overlay';
                    parent.appendChild(glow);
                }

                // Add sparkles to Vintage for extra flair
                if (currentFilter === 'vintage') {
                    const sparkle = document.createElement('div');
                    sparkle.className = 'effect-sparkle-overlay dynamic-effect-overlay';
                    parent.appendChild(sparkle);
                }
            }

            if (capturedImage) {
                capturedImage.className = 'preview-img';
                if (currentFilter !== 'none') capturedImage.classList.add(filterClass);
            }
        });
    });
}

// 4. Capture Logic (Robust)
// 4. Capture Logic (Robust)
// 4. Capture & AI Logic
const aiChoiceModal = document.getElementById('ai-choice-modal');
const aiTextModal = document.getElementById('ai-text-modal');
const aiLoader = document.getElementById('ai-loader');
const btnManual = document.getElementById('btn-edit-manual');
const btnAI = document.getElementById('btn-edit-ai');
const btnTextYes = document.getElementById('btn-ai-text-yes');
const btnTextNo = document.getElementById('btn-ai-text-no');
const aiStatus = document.getElementById('ai-status-text');

if (captureBtn) {
    captureBtn.addEventListener('click', () => {
        captureBtn.classList.add('clicked');
        setTimeout(() => captureBtn.classList.remove('clicked'), 200);

        if (!videoElement || !canvasElement) return;

        // Force check
        if (videoElement.videoWidth === 0) {
            videoElement.play().catch(e => console.log(e));
        }

        const width = videoElement.videoWidth || 1280;
        const height = videoElement.videoHeight || 720;
        canvasElement.width = width;
        canvasElement.height = height;
        const ctx = canvasElement.getContext('2d');

        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoElement, 0, 0, width, height);

        // FREEZE VIDEO
        videoElement.pause();

        // Show Choice
        if (aiChoiceModal) aiChoiceModal.style.display = 'flex';
    });
}

// Manual Flow
if (btnManual) {
    btnManual.onclick = () => {
        aiChoiceModal.style.display = 'none';
        goToEditor();
    };
}

// AI Flow
if (btnAI) {
    btnAI.onclick = () => {
        aiChoiceModal.style.display = 'none';
        startAIProcess();
    };
}

function startAIProcess() {
    if (aiLoader) aiLoader.style.display = 'flex';

    // Simulation
    setTimeout(() => { if (aiStatus) aiStatus.innerText = "Scanning Mood..."; }, 1000);
    setTimeout(() => { if (aiStatus) aiStatus.innerText = "Applying Magic..."; }, 2500);

    setTimeout(() => {
        aiLoader.style.display = 'none';
        aiTextModal.style.display = 'flex';
    }, 3800);
}

// AI Text Decisions
if (btnTextYes) {
    btnTextYes.onclick = () => {
        aiTextModal.style.display = 'none';
        applyAIEdit(true);
    };
}

if (btnTextNo) {
    btnTextNo.onclick = () => {
        aiTextModal.style.display = 'none';
        applyAIEdit(false);
    };
}

function applyAIEdit(addText) {
    // 1. Random Filter
    const filters = ['vintage', 'noir', 'warm'];
    const randomFilter = filters[Math.floor(Math.random() * filters.length)];
    currentFilter = randomFilter;

    // 2. Add Text
    if (addText) {
        const captions = [
            "Living the dream ✨", "Weekend vibes 🌴", "Just me 📸",
            "Captured moments 🕰️", "Golden hour ☀️", "Tech & Love 💖"
        ];
        const randomCaption = captions[Math.floor(Math.random() * captions.length)];

        const textSpan = document.createElement('div');
        textSpan.contentEditable = true;
        textSpan.className = `drag-text-item font-modern`;
        textSpan.style.color = '#fff';
        textSpan.innerText = randomCaption;
        textSpan.style.left = '50%';
        textSpan.style.top = '80%';
        textSpan.style.transform = 'translate(-50%, -50%)';
        textSpan.style.textShadow = '0 2px 10px rgba(0,0,0,0.5)';

        textSpan.onclick = (e) => {
            e.stopPropagation();
            activeTextElement = textSpan;
            if (textControls) textControls.style.display = 'flex';
        };

        textLayer.innerHTML = '';
        textLayer.appendChild(textSpan);
        enableDrag(textSpan);
    } else {
        textLayer.innerHTML = '';
    }

    goToEditor(true);
}

function goToEditor(applyFilterUI = false) {
    capturedImage.src = canvasElement.toDataURL('image/jpeg', 0.9);
    cameraInterface.style.display = 'none';
    storyEditor.style.display = 'flex';

    const filterClass = `filter-${currentFilter}`;
    capturedImage.className = 'preview-img';
    if (currentFilter !== 'none') capturedImage.classList.add(filterClass);

    if (applyFilterUI) {
        filterBtns.forEach(b => {
            b.classList.remove('active');
            if (b.getAttribute('data-filter') === currentFilter) b.classList.add('active');
        });
    }

    // Add Effects based on filter
    const editorPreview = document.getElementById('editor-preview-container');
    const oldEffects = editorPreview.querySelectorAll('.dynamic-effect-overlay');
    oldEffects.forEach(e => e.remove());

    if (currentFilter === 'vintage' || currentFilter === 'noir') {
        const grain = document.createElement('div');
        grain.className = 'effect-grain-overlay dynamic-effect-overlay';
        editorPreview.appendChild(grain);
    }
    if (currentFilter === 'warm') {
        const glow = document.createElement('div');
        glow.className = 'effect-warm-overlay dynamic-effect-overlay';
        editorPreview.appendChild(glow);
    }
    if (currentFilter === 'vintage') {
        const sparkle = document.createElement('div');
        sparkle.className = 'effect-sparkle-overlay dynamic-effect-overlay';
        editorPreview.appendChild(sparkle);
    }
}


// 5. Editor Logic - Text & Overlay

// 5.a Toggle Text Mode
if (toggleTextBtn) {
    toggleTextBtn.addEventListener('click', () => {
        const textSpan = document.createElement('div');
        textSpan.contentEditable = true;
        textSpan.className = `drag-text-item font-${currentFont}`;
        textSpan.style.color = currentColor;
        textSpan.innerText = "Type here...";
        textSpan.style.left = '50%';
        textSpan.style.top = '50%';
        textSpan.style.transform = 'translate(-50%, -50%)'; // Centering helper

        // Ensure it doesn't trigger drag immediately
        textSpan.onclick = (e) => {
            e.stopPropagation();
            textSpan.focus();
            activeTextElement = textSpan;
            if (textControls) textControls.style.display = 'flex';
        };

        textLayer.appendChild(textSpan);

        textSpan.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(textSpan);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        if (textControls) textControls.style.display = 'flex';
        activeTextElement = textSpan;

        enableDrag(textSpan);

        textSpan.addEventListener('blur', () => {
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
                activeTextElement.focus();
            }
        });
    });
}

// 5.d Draggable Logic (Touch & Mouse)
function enableDrag(el) {
    let isDown = false;
    let startX, startY;
    // We modify transform translate values or top/left.
    // Simpler to stick to top/left since we centered with translate(-50%, -50%) earlier.

    // Actually, for smooth drag, let's use direct offset manipulation
    let initialLeft, initialTop;

    const start = (e) => {
        // If editing text, don't drag
        if (document.activeElement === el) return;

        isDown = true;
        activeTextElement = el;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        startX = clientX;
        startY = clientY;

        initialLeft = el.offsetLeft;
        initialTop = el.offsetTop;
    };

    const move = (e) => {
        if (!isDown) return;
        e.preventDefault(); // Stop scrolling
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

// --- CHAT CAMERA LOGIC ---

let activeCameraMode = 'story'; // 'story' or 'chat'
let isViewOnce = false;

const chatCameraBtn = document.getElementById('chat-camera-btn');
const viewOnceBtn = document.getElementById('view-once-btn');
const sendBtnText = document.getElementById('send-btn-text');

if (chatCameraBtn) {
    chatCameraBtn.addEventListener('click', () => {
        openCameraInMode('chat');
    });
}

function openCameraInMode(mode) {
    activeCameraMode = mode;

    // Switch Tabs visually if needed, though we are hijacking the view
    // Just show the camera interface
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('create').classList.add('active'); // Camera Section

    // Customize UI based on mode
    const title = document.getElementById('camera-title');
    if (title) title.innerText = (mode === 'chat') ? 'Send Photo' : 'New Story';

    startCamera();
}

// Toggle View Once
if (viewOnceBtn) {
    viewOnceBtn.addEventListener('click', () => {
        isViewOnce = !isViewOnce;
        if (isViewOnce) {
            viewOnceBtn.classList.add('active');
        } else {
            viewOnceBtn.classList.remove('active');
        }
    });
}

// Update Editor UI based on mode
function updateEditorStateForMode() {
    if (activeCameraMode === 'chat') {
        if (viewOnceBtn) viewOnceBtn.style.display = 'block';
        if (sendBtnText) sendBtnText.innerText = 'Send';
        isViewOnce = false;
        if (viewOnceBtn) viewOnceBtn.classList.remove('active');
    } else {
        if (viewOnceBtn) viewOnceBtn.style.display = 'none';
        if (sendBtnText) sendBtnText.innerText = 'Share';
    }
}

// 6. Close / Retake
if (closeEditorBtn) {
    closeEditorBtn.addEventListener('click', () => {
        storyEditor.style.display = 'none';
        cameraInterface.style.display = 'flex';
        // If we were in chat mode and cancel, maybe go back to chat?
        // simple behavior: just go back to camera for now.
        startCamera();
    });
}

// 7. Share Logic - Burn Text to Image
if (sendStoryBtn) {
    sendStoryBtn.addEventListener('click', () => {
        const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';

        // Burn Text onto Canvas
        const ctx = canvasElement.getContext('2d');
        const img = new Image();
        img.src = capturedImage.src;
        img.onload = () => {
            canvasElement.width = img.width;
            canvasElement.height = img.height;

            // Draw original photo
            ctx.drawImage(img, 0, 0);

            // Map text elements
            const previewRect = document.getElementById('editor-preview-container').getBoundingClientRect();
            // Scale factors
            const scaleX = canvasElement.width / previewRect.width;
            const scaleY = canvasElement.height / previewRect.height;

            // 2. Burn Text
            const textNodes = textLayer.children;
            Array.from(textNodes).forEach(node => {
                const nodeRect = node.getBoundingClientRect();

                // Calculate position relative to container
                const relativeLeft = (nodeRect.left - previewRect.left) * scaleX;
                const relativeTop = (nodeRect.top - previewRect.top) * scaleY;

                // Font Size Scaling
                const computed = window.getComputedStyle(node);
                const fontSize = parseFloat(computed.fontSize) * ((scaleX + scaleY) / 2);
                const fontFamily = computed.fontFamily;
                const color = computed.color;

                // Weight
                let fontWeight = computed.fontWeight;

                ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
                ctx.fillStyle = color;

                // Alignment
                ctx.textAlign = 'left'; // Simplifies drawing at rect corner
                ctx.textBaseline = 'top';

                // Neon Glow support for canvas
                if (node.classList.contains('font-neon')) {
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 20;
                } else {
                    ctx.shadowBlur = 0;
                }

                ctx.fillText(node.innerText, relativeLeft, relativeTop + (10 * scaleY)); // +buffer
            });

            // 3. Final Blob
            const finalImage = canvasElement.toDataURL('image/jpeg', 0.85);

            if (activeCameraMode === 'chat') {
                // SEND TO CHAT
                sendChatContent(finalImage, 'image', isViewOnce);

                // Return to Chat View
                document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
                document.getElementById('chat').classList.add('active'); // Chat Section
                stopCamera();
                // Reset State
                storyEditor.style.display = 'none';
                cameraInterface.style.display = 'flex';

            } else {
                // SEND TO STORY (Existing Logic)
                const newStory = {
                    id: Date.now(),
                    author: currentUser,
                    imageUrl: finalImage,
                    text: storyCaptionInput.value || "",
                    filter: currentFilter,
                    timestamp: Date.now()
                };

                // Use SyncManager
                if (window.SyncManager) {
                    SyncManager.addStory(newStory);
                } else {
                    const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
                    stories.push(newStory);
                    localStorage.setItem('kingdom_stories', JSON.stringify(stories));
                }

                // Cleanup & Navigate Home
                storyEditor.style.display = 'none';
                cameraInterface.style.display = 'flex';
                if (storyCaptionInput) storyCaptionInput.value = '';

                renderStatusRings();

                const homeTab = document.querySelector('[data-tab="home"]');
                if (homeTab) homeTab.click();
            }
        };
    });

