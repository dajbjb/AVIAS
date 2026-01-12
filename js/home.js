/**
 * Home Screen Logic
 * Handles the clock, AI greeting, status rings, and highlights.
 */

// Global State for Story Viewer
let currentStoryIndex = 0;
let activeStoriesList = [];
let storyTimer = null;

window.viewStatus = function (targetUser) {
    const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
    const validityPeriod = 5 * 60 * 60 * 1000; // 5 Hours
    const now = Date.now();

    // Get all valid stories for the user
    const userStories = stories.filter(s => s.author === targetUser && (now - s.timestamp) < validityPeriod).reverse();

    if (userStories.length === 0) return;

    // Init Viewer
    activeStoriesList = userStories;
    currentStoryIndex = 0;

    const viewer = document.getElementById('story-viewer');
    if (viewer) {
        viewer.style.display = 'flex';
        showStoryAtIndex(currentStoryIndex);

        // Add navigation listeners
        viewer.onclick = (e) => {
            if (e.target.closest('.close-viewer-btn')) return;
            const width = window.innerWidth;
            if (e.clientX > width / 3) {
                nextStory();
            } else {
                prevStory();
            }
        };
    }
};

function showStoryAtIndex(index) {
    if (index < 0 || index >= activeStoriesList.length) {
        closeStoryViewer();
        return;
    }

    const story = activeStoriesList[index];
    const img = document.getElementById('story-viewer-img');
    const text = document.getElementById('story-viewer-text');
    const bar = document.getElementById('story-progress-fill');
    const viewer = document.getElementById('story-viewer');

    if (img && text && bar) {
        // Reset state
        bar.style.transition = 'none';
        bar.style.width = '0%';

        // Check if I am the author
        const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
        const isMyStory = story.author === currentUser;

        // Create or Update Delete Button
        let delBtn = document.getElementById('story-delete-btn');
        if (!delBtn) {
            delBtn = document.createElement('button');
            delBtn.id = 'story-delete-btn';
            delBtn.className = 'story-delete-btn';
            delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            // Styling logic (can be moved to CSS, but inline for safety here)
            delBtn.style.cssText = "position:absolute; bottom:20px; right:20px; z-index:1001; background:rgba(255,0,0,0.6); border:none; color:white; padding:10px; border-radius:50%; width:40px; height:40px; cursor:pointer;";
            viewer.appendChild(delBtn);
        }

        // Show/Hide Delete Button + Logic
        delBtn.style.display = isMyStory ? 'block' : 'none';
        delBtn.onclick = (e) => {
            e.stopPropagation(); // Don't skip story
            if (confirm('למחוק את הסטורי הזה?')) {
                if (typeof SyncManager !== 'undefined' && SyncManager.deleteStory) {
                    SyncManager.deleteStory(story.id);
                }
                // Remove from local list immediately
                activeStoriesList.splice(index, 1);
                if (activeStoriesList.length === 0) {
                    closeStoryViewer();
                } else {
                    // Show next or prev
                    showStoryAtIndex(Math.min(index, activeStoriesList.length - 1));
                }
            }
        };

        // Load Content
        img.src = story.imageUrl;
        text.textContent = (story.caption || "") + (story.text || ""); // Check both properties
        img.className = (story.filter && story.filter !== 'none') ? `viewer-img filter-${story.filter}` : 'viewer-img';

        // Animate Bar
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                bar.style.transition = 'width 5s linear';
                bar.style.width = '100%';
            });
        });

        // Clear existing timer
        if (storyTimer) clearTimeout(storyTimer);
        storyTimer = setTimeout(nextStory, 5000);
    }
}

function nextStory() {
    if (currentStoryIndex < activeStoriesList.length - 1) {
        currentStoryIndex++;
        showStoryAtIndex(currentStoryIndex);
    } else {
        closeStoryViewer(); // End of stack
    }
}

function prevStory() {
    if (currentStoryIndex > 0) {
        currentStoryIndex--;
        showStoryAtIndex(currentStoryIndex);
    } else {
        showStoryAtIndex(0); // Restart first
    }
}

function updateClock() {
    const now = new Date();
    const hour = now.getHours();
    const hours = String(hour).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const clockElement = document.getElementById('digital-clock');
    if (clockElement) clockElement.textContent = `${hours}:${minutes}`;

    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options).toUpperCase();
    const dateElement = document.getElementById('digital-date');
    if (dateElement) dateElement.textContent = dateString;

    const ambientLight = document.getElementById('ambient-light');
    const statusText = document.getElementById('status-text');
    const statusIcon = document.querySelector('#status-widget i');

    if (ambientLight) {
        if (hour >= 6 && hour < 18) {
            ambientLight.classList.add('day');
            ambientLight.classList.remove('night');
            if (statusText) statusText.textContent = "Luxury Living";
            if (statusIcon) { statusIcon.className = "fa-solid fa-sun"; statusIcon.style.color = "#FFD700"; }
        } else {
            ambientLight.classList.add('night');
            ambientLight.classList.remove('day');
            if (statusText) statusText.textContent = "Sweet Dreams";
            if (statusIcon) { statusIcon.className = "fa-solid fa-moon"; statusIcon.style.color = "#A5B4FC"; }
        }
    }
    updateSkyState(hour);
}

function updateSkyState(hour) {
    const body = document.body;
    body.classList.remove('sky-night', 'sky-dawn', 'sky-day', 'sky-dusk', 'sky-evening');
    if (hour >= 5 && hour < 7) body.classList.add('sky-dawn');
    else if (hour >= 7 && hour < 17) body.classList.add('sky-day');
    else if (hour >= 17 && hour < 20) body.classList.add('sky-dusk');
    else if (hour >= 20 && hour < 22) body.classList.add('sky-evening');
    else body.classList.add('sky-night');
}

function getTimeContext() {
    const hour = new Date().getHours();
    if (hour < 5) return "night";
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
}

// Unified Home Render Function
window.renderHomeHighlights = function () {
    updateClock();
    generateAIGreeting();
    if (typeof window.renderStatusRings === 'function') window.renderStatusRings();

    // 1. Personal Greeting
    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
    const namePlaceholder = document.getElementById('name-placeholder');
    if (namePlaceholder) namePlaceholder.textContent = currentUser;

    // 2. Status Rings (Inverted Logic: Show Partner Only)
    const statusItems = document.querySelectorAll('.status-item');
    statusItems.forEach(item => {
        const nameSpan = item.querySelector('.status-name');
        if (nameSpan) {
            // If I am David, show Aviya. If I am Aviya, show David.
            const isPartner = nameSpan.textContent.trim() !== currentUser;
            item.style.display = isPartner ? 'flex' : 'none';
        }
    });

    // 3. Highlights (Memories)
    const homeHighlightsContainer = document.getElementById('home-highlights');
    if (!homeHighlightsContainer) return;

    // Safety check for memories
    const mems = window.memories || JSON.parse(localStorage.getItem('kingdom_memories') || "[]");

    if (mems.length === 0) {
        homeHighlightsContainer.innerHTML = '';
        return;
    }

    const shuffled = [...mems].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 2);

    homeHighlightsContainer.innerHTML = '<h2 class="boutique-names playfair-italic" style="font-size: 2rem; margin-bottom: 40px; text-align: center;">Highlights</h2>';
    selected.forEach(memory => {
        const item = document.createElement('div');
        item.className = `memory-item ${memory.isCollapsed ? 'collapsed' : ''}`;
        if (typeof createMemoryHTML === 'function') {
            item.innerHTML = createMemoryHTML(memory);
            homeHighlightsContainer.appendChild(item);
        }
    });
}

// Start Clock
setInterval(updateClock, 1000);

async function generateAIGreeting() {
    const key = window.GEMINI_API_KEY || "AIzaSyAXKu7u_nvbjEKT6xTZUIkXHTcJ6Fqn6-U";
    if (!key) return;

    const greetingEl = document.getElementById('ai-greeting');
    // if (greetingEl) greetingEl.innerHTML = '<span class="loading-dots">AI is crafting your welcome...</span>';

    const currentTimeContext = getTimeContext();
    const cachedData = JSON.parse(localStorage.getItem('kingdom_cached_greeting') || "{}");
    const cacheAge = Date.now() - (cachedData.timestamp || 0);
    const fourHours = 4 * 60 * 60 * 1000;

    if (cachedData.text && cacheAge < fourHours && cachedData.context === currentTimeContext) {
        if (greetingEl) greetingEl.textContent = cachedData.text;
        return;
    }

    const prompt = `Act as a luxury boutique hotel concierge. Write a very short, poetic, and sophisticated greeting (max 8 words) for David and Aviya. 
    It is currently ${currentTimeContext}. The vibe should be "Everyday Elegance & Warmth". 
    Do not use hashtags. Be classy and welcoming.`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const aiText = data.candidates[0].content.parts[0].text.trim();
            localStorage.setItem('kingdom_cached_greeting', JSON.stringify({
                text: aiText, context: currentTimeContext, timestamp: Date.now()
            }));
            typeWriter(aiText, "ai-greeting");
        }
    } catch (error) {
        console.warn("AI Greeting Error:", error);
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

/**
 * STORIES LOGIC (Fixed)
 */
window.renderStatusRings = function () {
    const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
    const now = Date.now();
    const validityPeriod = 5 * 60 * 60 * 1000; // 5 Hours

    // Filter valid stories
    const validStories = stories.filter(s => (now - s.timestamp) < validityPeriod);

    // Group by user
    const userStories = {
        'Aviya': validStories.filter(s => s.author === 'Aviya'),
        'David': validStories.filter(s => s.author === 'David')
    };

    ['Aviya', 'David'].forEach(user => {
        const ringWrapper = document.getElementById(`ring-${user}`);
        const avatar = document.getElementById(`avatar-${user}`);

        if (ringWrapper && avatar) {
            const hasStory = userStories[user].length > 0;

            // Visual update
            if (hasStory) {
                ringWrapper.classList.add('has-story');
                // Show latest story preview as avatar
                avatar.src = userStories[user][0].imageUrl;
                avatar.style.display = 'block';
                // Hide Initials
                const initials = ringWrapper.querySelector('.initials');
                if (initials) initials.style.display = 'none';
            } else {
                ringWrapper.classList.remove('has-story');
                avatar.style.display = 'none';
                const initials = ringWrapper.querySelector('.initials');
                if (initials) initials.style.display = 'block';
            }
        }
    });
};

window.viewStatus = function (targetUser) {
    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';

    // Logic: Only allow viewing the PARTNER'S story (as per user request "David sees Aviya, Aviya sees David")
    // But since the icon is hidden for self, clicking is only possible on partner.

    const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    const userStories = stories.filter(s => s.author === targetUser && (now - s.timestamp) < twentyFourHours);

    if (userStories.length === 0) {
        console.log("No stories for " + targetUser);
        return;
    }

    // Open Viewer
    const viewer = document.getElementById('story-viewer');
    const img = document.getElementById('story-viewer-img');
    const text = document.getElementById('story-viewer-text');
    const bar = document.getElementById('story-progress-fill');

    if (viewer && img) {
        viewer.style.display = 'flex';
        // Show latest for now (Index 0)
        const story = userStories[0];
        img.src = story.imageUrl;
        text.textContent = story.text || "";
        if (story.filter && story.filter !== 'none') {
            img.className = `viewer-img filter-${story.filter}`;
        } else {
            img.className = 'viewer-img';
        }

        // Reset Animation
        bar.style.transition = 'none';
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.transition = 'width 5s linear';
            bar.style.width = '100%';
        }, 50);

        // Auto Close
        if (storyTimer) clearTimeout(storyTimer);
        storyTimer = setTimeout(() => {
            closeStoryViewer();
        }, 5000);
    }
};

window.closeStoryViewer = function () {
    const viewer = document.getElementById('story-viewer');
    if (viewer) viewer.style.display = 'none';
    if (storyTimer) clearTimeout(storyTimer);
    const bar = document.getElementById('story-progress-fill');
    if (bar) {
        bar.style.transition = 'none';
        bar.style.width = '0%';
    }
};

// Bind Close Button
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('close-viewer');
    if (closeBtn) closeBtn.addEventListener('click', window.closeStoryViewer);

    // My Stories Camera Panel
    const myStoriesBtn = document.getElementById('my-stories-camera-btn');
    const myStoriesPanel = document.getElementById('my-stories-panel');
    const closeMyStoriesBtn = document.getElementById('close-my-stories-panel');
    const mainNav = document.getElementById('main-nav');

    if (myStoriesBtn && myStoriesPanel) {
        myStoriesBtn.addEventListener('click', () => {
            myStoriesPanel.style.display = 'block';
            // Hide nav bar so it doesn't cover content
            if (mainNav) mainNav.style.display = 'none';
            loadMyStoriesCamera();
        });
    }

    if (closeMyStoriesBtn && myStoriesPanel) {
        closeMyStoriesBtn.addEventListener('click', () => {
            myStoriesPanel.style.display = 'none';
            // Show nav bar again
            if (mainNav) mainNav.style.display = '';
        });
    }
});

// Load My Stories in Camera Panel (current user only)
function loadMyStoriesCamera() {
    const list = document.getElementById('my-stories-camera-list');
    if (!list) return;

    list.innerHTML = '<div style="color:#aaa; padding:20px; text-align:center;">טוען...</div>';

    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
    const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");

    // Filter ONLY my stories (current user) and valid ones (5 hours)
    const now = Date.now();
    const validityPeriod = 5 * 60 * 60 * 1000;
    const myStories = stories.filter(s => s.author === currentUser && (now - s.timestamp) < validityPeriod);

    list.innerHTML = '';

    if (myStories.length === 0) {
        list.innerHTML = '<div style="color:#888; padding:20px; text-align:center;">אין לך סטוריז פעילים כרגע</div>';
        return;
    }

    myStories.forEach(story => {
        const item = document.createElement('div');
        item.className = 'my-story-item';

        const img = document.createElement('img');
        img.src = story.imageUrl;
        img.alt = 'Story';

        const delBtn = document.createElement('button');
        delBtn.className = 'my-story-delete-btn';
        delBtn.innerHTML = '<i class="fa-solid fa-trash"></i> מחק';

        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('למחוק את הסטורי?')) {
                deleteMyStory(story.id || story.timestamp);
                loadMyStoriesCamera(); // Refresh
            }
        };

        item.appendChild(img);
        item.appendChild(delBtn);
        list.appendChild(item);
    });
}

// Delete Story Function
function deleteMyStory(storyId) {
    // Use SyncManager if available (for cloud sync)
    if (typeof SyncManager !== 'undefined' && SyncManager.deleteStory) {
        SyncManager.deleteStory(storyId);
    } else {
        // Local fallback
        let stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
        stories = stories.filter(s => s.id !== storyId && s.timestamp !== storyId);
        localStorage.setItem('kingdom_stories', JSON.stringify(stories));
    }

    // Refresh status rings if function exists
    if (typeof renderStatusRings === 'function') renderStatusRings();
}
