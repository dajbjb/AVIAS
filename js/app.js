/**
 * Main Application Entry Point
 * Orchestrates initialization of modules and global listeners.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Kingdom App Initializing...");

    // 1. Initialize UI Helper Functions if needed
    if (typeof initWheel === 'function') initWheel();

    // 2. Initial Render of content (Local Optimistic)
    if (typeof renderHomeHighlights === 'function') {
        renderHomeHighlights();
        // Start live clock update handled in home.js? 
        // Yes, home.js calls setInterval(updateClock, 1000) at top level.
    }

    // 3. Start Sync Services
    // This connects to Firebase and sets up real-time listeners.
    if (typeof SyncManager !== 'undefined') {
        // Delay slightly to ensure all DOM elements are stable
        setTimeout(() => {
            SyncManager.init();
        }, 500);
    } else {
        console.error("Critical Error: SyncManager not loaded.");
    }

    // 4. Global Error Handling
    window.onerror = function (msg, url, line) {
        console.warn("App Warning:", msg);
        // Prevent default only if necessary? No, let browser handle logging too.
    };

    // 5. Ensure Camera Permissions Prompt if needed?
    // We do manual start.
});
