/**
 * Home Screen Logic
 * Handles the clock, AI greeting, status rings, and highlights.
 */

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
function renderHomeHighlights() {
    updateClock();
    generateAIGreeting();

    // 1. Personal Greeting
    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
    const namePlaceholder = document.getElementById('name-placeholder');
    if (namePlaceholder) namePlaceholder.textContent = currentUser;

    // 2. Status Rings (Show only current user)
    const statusItems = document.querySelectorAll('.status-item');
    statusItems.forEach(item => {
        const nameSpan = item.querySelector('.status-name');
        if (nameSpan) {
            item.style.display = (nameSpan.textContent.trim() === currentUser) ? 'flex' : 'none';
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
        // Assumes createMemoryHTML is available globally (from gallery.js)
        // If gallery.js loads after home.js, this function might be undefined IF called immediately?
        // renderHomeHighlights is called by SyncManager listener.
        if (typeof createMemoryHTML === 'function') {
            item.innerHTML = createMemoryHTML(memory);
            homeHighlightsContainer.appendChild(item);
        }
    });
}

// Start Clock
setInterval(updateClock, 1000);

async function generateAIGreeting() {
    // If API KEY is not in window, try config?
    const key = window.GEMINI_API_KEY || "AIzaSyAXKu7u_nvbjEKT6xTZUIkXHTcJ6Fqn6-U";

    if (!key) return;

    const greetingEl = document.getElementById('ai-greeting');
    if (greetingEl) greetingEl.innerHTML = '<span class="loading-dots">AI is crafting your welcome...</span>';

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
        } else { throw new Error("Invalid API response"); }
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
