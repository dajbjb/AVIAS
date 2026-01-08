/**
 * Kingdom Core - Configuration & Sync Manager
 * Handles Firebase connection, data synchronization, and global utilities.
 */

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBP-QtaPE4FAKwXNIjOlJ0s5kuVX25GeuY",
    authDomain: "kingdomapp-ec532.firebaseapp.com",
    projectId: "kingdomapp-ec532",
    storageBucket: "kingdomapp-ec532.firebasestorage.app",
    messagingSenderId: "266165085520",
    appId: "1:266165085520:web:fbcaa61695342509b6b855"
};

// Initialize Firebase (Compat)
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
} else {
    console.error("Firebase SDK not loaded");
}

let GEMINI_API_KEY = "AIzaSyAXKu7u_nvbjEKT6xTZUIkXHTcJ6Fqn6-U";

/**
 * Global Utilities
 */
window.onerror = function (msg, url, line) {
    console.error("App Error:", msg, "Line:", line);
    const loaders = document.querySelectorAll('.ai-loader, .loading-screen');
    loaders.forEach(l => l.style.display = 'none');
};

function createHeart() {
    const heart = document.createElement('div');
    heart.classList.add('heart');
    heart.style.left = Math.random() * 100 + "vw";
    const duration = Math.random() * 5 + 5;
    heart.style.animationDuration = duration + "s";
    heart.style.opacity = Math.random() * 0.5 + 0.1;
    const bg = document.getElementById('love-background');
    if (bg) bg.appendChild(heart);
    setTimeout(() => heart.remove(), duration * 1000);
}
setInterval(createHeart, 800);

/**
 * SYNC MANAGER
 */
const SyncManager = {
    CHAT_COLLECTION: 'kingdom_chats',
    STORY_COLLECTION: 'kingdom_stories',
    MEMORIES_COLLECTION: 'kingdom_memories',
    LOCAL_CHAT_KEY: 'kingdom_chat_backup_v1',
    LOCAL_STORY_KEY: 'kingdom_story_backup_v1',
    isConnected: false,

    init: function () {
        console.log("Starting Hybrid Sync Services...");
        this.createStatusIndicator();
        this.updateStatus(false);
        this.loadLocalBackup();
        if (typeof db === 'undefined' || !db) return;
        this.listenToChats();
        this.listenToStories();
        this.listenToMemories();
        setTimeout(() => {
            if (!this.isConnected) {
                const el = document.getElementById('cloud-status');
                if (el && el.style.background !== 'red') el.style.background = 'orange';
            }
        }, 5000);
    },

    createStatusIndicator: function () {
        const div = document.createElement('div');
        div.id = 'cloud-status';
        div.style.cssText = "position:fixed; top:15px; left:15px; width:15px; height:15px; border-radius:50%; background:orange; z-index:9999; box-shadow: 0 0 5px rgba(0,0,0,0.5); cursor:pointer; border: 2px solid white; transition: background 0.3s;";
        div.title = "Click to Test Connection";
        document.body.appendChild(div);
        div.onclick = () => this.testConnection();
    },

    testConnection: function () {
        const toast = document.createElement('div');
        toast.innerText = "Testing Server Connection...";
        toast.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,0.8); color:white; padding:20px; border-radius:10px; z-index:10000; font-family:sans-serif;";
        document.body.appendChild(toast);

        if (typeof db === 'undefined' || !db) {
            toast.remove();
            alert("❌ Database not initialized.");
            return;
        }

        db.collection('kingdom_logs').add({ type: 'connection_test', timestamp: new Date() })
            .then(() => {
                toast.remove();
                this.updateStatus(true);
                alert("✅ SERVER CONNECTED!");
            }).catch(e => {
                toast.remove();
                this.updateStatus(false, e.message);
                alert("❌ CONNECTION FAILED: " + e.message);
            });
    },

    updateStatus: function (online, errorMsg = null) {
        this.isConnected = online;
        const el = document.getElementById('cloud-status');
        if (el) el.style.background = online ? '#00ff00' : (errorMsg ? 'red' : 'orange');
        if (online) el.style.boxShadow = '0 0 10px #00ff00';
        if (errorMsg) console.warn("Sync:", errorMsg);
    },

    uploadImage: async function (base64Image) {
        const clientId = 'c7e6c0c2017357a'; // Public Anonymous Client ID (Safe for this use)
        try {
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
            const formData = new FormData();
            formData.append("image", base64Data);
            formData.append("type", "base64");

            const response = await fetch("https://api.imgur.com/3/image", {
                method: "POST",
                headers: { Authorization: `Client-ID ${clientId}` },
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                console.log("Image uploaded to cloud:", data.data.link);
                return data.data.link;
            } else {
                throw new Error("Upload failed: " + data.data.error);
            }
        } catch (e) {
            console.warn("Cloud upload failed, using local backup.", e);
            return base64Image; // Fallback to Base64 if upload fails
        }
    },

    loadLocalBackup: function () {
        const localChat = this.getLocal();
        if (localChat.length > 0) {
            window.chatHistory = localChat; // Explicit global
            if (typeof renderChat === 'function') renderChat();
        }
    },

    getLocal: function () {
        return JSON.parse(localStorage.getItem(this.LOCAL_CHAT_KEY) || "[]");
    },

    listenToChats: function () {
        // NOTE: renderChat must be defined in chat.js
        db.collection(this.CHAT_COLLECTION).orderBy('timestamp', 'asc').limit(100)
            .onSnapshot((snapshot) => {
                this.updateStatus(true);
                const cloudMessages = [];
                snapshot.forEach(doc => cloudMessages.push(doc.data()));
                if (cloudMessages.length > 0) {
                    window.chatHistory = cloudMessages;
                    localStorage.setItem(this.LOCAL_CHAT_KEY, JSON.stringify(chatHistory));
                    if (typeof renderChat === 'function') {
                        renderChat();
                        if (typeof scrollToBottom === 'function') scrollToBottom();
                    }
                }
            }, (error) => {
                this.updateStatus(false, error.message);
            });
    },

    sendChat: function (msg) {
        // Optimistic
        const lastMsg = window.chatHistory[window.chatHistory.length - 1];
        if (!lastMsg || lastMsg.timestamp !== msg.timestamp) {
            window.chatHistory.push(msg);
            localStorage.setItem(this.LOCAL_CHAT_KEY, JSON.stringify(chatHistory));
            if (typeof renderChat === 'function') {
                renderChat();
                if (typeof scrollToBottom === 'function') scrollToBottom();
            }
        }
        // Cloud
        msg.status = 'sent';
        db.collection(this.CHAT_COLLECTION).add(msg)
            .then(() => { console.log("Sent to cloud"); this.updateStatus(true); })
            .catch((e) => this.updateStatus(false, e.message));
    },

    markMessagesAsRead: function (otherUser) {
        const batch = db.batch();
        db.collection(this.CHAT_COLLECTION)
            .where('sender', '==', otherUser).where('status', '!=', 'read')
            .get().then(snapshot => {
                if (snapshot.empty) return;
                snapshot.forEach(doc => {
                    batch.update(db.collection(this.CHAT_COLLECTION).doc(doc.id), { status: 'read' });
                });
                batch.commit();
            }).catch(e => console.log(e));
    },

    listenToStories: function () {
        db.collection(this.STORY_COLLECTION).orderBy('timestamp', 'desc').limit(50)
            .onSnapshot((snapshot) => {
                const stories = [];
                snapshot.forEach(doc => stories.push({ id: doc.id, ...doc.data() }));
                localStorage.setItem('kingdom_stories', JSON.stringify(stories));
                if (typeof renderStatusRings === 'function') renderStatusRings();
            });
    },

    addStory: async function (storyData) {
        if (storyData.imageUrl && storyData.imageUrl.startsWith('data:')) {
            storyData.imageUrl = await this.uploadImage(storyData.imageUrl);
        }
        const stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
        stories.unshift(storyData);
        localStorage.setItem('kingdom_stories', JSON.stringify(stories));
        if (typeof renderStatusRings === 'function') renderStatusRings();
        db.collection(this.STORY_COLLECTION).add(storyData);
    },

    deleteStory: function (storyId) {
        let stories = JSON.parse(localStorage.getItem('kingdom_stories') || "[]");
        stories = stories.filter(s => s.id !== storyId && s.timestamp !== storyId);
        localStorage.setItem('kingdom_stories', JSON.stringify(stories));
        if (typeof renderStatusRings === 'function') renderStatusRings();
        db.collection(this.STORY_COLLECTION).doc(String(storyId)).delete().catch(e => console.log(e));
    },

    listenToMemories: function () {
        db.collection(this.MEMORIES_COLLECTION).orderBy('timestamp', 'desc').limit(20)
            .onSnapshot((snapshot) => {
                const fetchedMemories = [];
                snapshot.forEach(doc => fetchedMemories.push({ id: doc.id, ...doc.data() }));
                window.memories = fetchedMemories;
                localStorage.setItem('kingdom_memories', JSON.stringify(memories));
                if (typeof renderMemories === 'function') renderMemories();
            });
    },

    addMemory: function (memoryData) {
        if (!window.memories) window.memories = [];
        window.memories.unshift(memoryData);
        localStorage.setItem('kingdom_memories', JSON.stringify(memories));
        if (typeof renderMemories === 'function') renderMemories();
        db.collection(this.MEMORIES_COLLECTION).add(memoryData);
    }
};
