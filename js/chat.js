/**
 * Chat Logic
 * Handles message rendering, sending, typing indicators, and GIF/Image handling.
 */

const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatHistoryList = document.getElementById('chat-history');
const chatSound = document.getElementById('chat-sent-sound');

window.chatHistory = []; // Global chat history

window.renderChat = function () {
    if (!chatHistoryList) return;
    chatHistoryList.innerHTML = '';

    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';

    // Mark as read if viewing
    const chatTabActive = document.querySelector('.nav-item.active[data-tab="chat"]');
    if (chatTabActive && typeof SyncManager !== 'undefined' && SyncManager.markMessagesAsRead) {
        SyncManager.markMessagesAsRead(currentUser);
    }

    // Update Badge
    if (typeof updateUnreadBadge === 'function') updateUnreadBadge();

    let lastDate = null;
    const history = window.chatHistory || [];

    history.forEach(msg => {
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

        let tickHtml = '';
        if (isMine) {
            const status = msg.status || 'sent';
            const tickClass = status === 'read' ? 'ticks-read' : '';
            const icon = status === 'read' ? '<i class="fa-solid fa-check-double"></i>' : '<i class="fa-solid fa-check"></i>';
            tickHtml = `<span class="msg-ticks ${tickClass}">${icon}</span>`;
        }

        let contentHtml = msg.text;
        if (msg.type === 'gif') {
            contentHtml = `<img src="${msg.text}" class="chat-gif">`;
        } else if (msg.type === 'image') {
            if (msg.viewOnce) {
                const viewedByMe = msg.viewedBy && msg.viewedBy.includes(currentUser);
                if (viewedByMe) {
                    contentHtml = `<div class="view-once-expired"><i class="fa-solid fa-eye-slash"></i> <span>Opened</span></div>`;
                } else {
                    contentHtml = `<div class="view-once-bubble" onclick="viewChatImage('${msg.id}')"><i class="fa-solid fa-circle-1"></i> <span>Photo</span></div>`;
                }
            } else {
                contentHtml = `<img src="${msg.text}" class="chat-img" onclick="viewChatImage('${msg.id}')">`;
            }
        }

        bubble.innerHTML = `<span class="message-sender">${msg.sender}</span>${contentHtml}<div class="msg-meta"><span class="message-time">${time}</span>${tickHtml}</div>`;
        chatHistoryList.appendChild(bubble);
    });

    if (typeof window.scrollToBottom === 'function') window.scrollToBottom();
};

window.scrollToBottom = function () {
    if (chatHistoryList) chatHistoryList.scrollTop = chatHistoryList.scrollHeight;
};

// Robust Send Function
window.sendChatContent = function (content, type, viewOnce = false) {
    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
    console.log("Sending chat:", content, type);

    if ((typeof db === 'undefined' || !db) && navigator.onLine) {
        alert("Cannot send: Not connected to Server.");
        return;
    }

    const newMessage = {
        id: Date.now(),
        text: content,
        type: type,
        viewOnce: !!viewOnce,
        viewedBy: [],
        sender: currentUser,
        timestamp: Date.now()
    };

    try {
        if (typeof SyncManager !== 'undefined' && SyncManager.sendChat) {
            SyncManager.sendChat(newMessage);
        } else {
            console.error("SyncManager missing!");
            alert("System Error: Sync Manager is offline.");
        }
    } catch (e) {
        console.error("Send Error:", e);
        alert("Failed to send: " + e.message);
    }

    if (chatInput) chatInput.value = '';
    if (chatSound) {
        chatSound.volume = 0.5;
        chatSound.currentTime = 0;
        chatSound.play().catch(e => { });
    }
    if (typeof updateTypingStatus === 'function') updateTypingStatus(currentUser, false);
};

window.viewChatImage = function (msgId) {
    const msg = window.chatHistory.find(m => m.id == msgId);
    if (!msg) return;
    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
    if (msg.viewOnce) {
        const viewedByMe = msg.viewedBy && msg.viewedBy.includes(currentUser);
        if (viewedByMe) return;
        if (!msg.viewedBy) msg.viewedBy = [];
        msg.viewedBy.push(currentUser);
        // Save via SyncManager manual update? Or rely on listening?
        // Ideally SyncManager should have update method.
        // For now, assume it syncs or this is local optimistic.
        // We'll trust SyncManager instance updates?
        // Actually, without Cloud Update for 'viewedBy', it resets on reload.
        // Adding cloud update specific logic here:
        if (typeof db !== 'undefined') {
            db.collection('kingdom_chats').where('id', '==', msg.id).get().then(snap => {
                if (!snap.empty) {
                    snap.docs[0].ref.update({ viewedBy: firebase.firestore.FieldValue.arrayUnion(currentUser) });
                }
            });
        }
        renderChat();
    }
    const modal = document.getElementById('chat-image-modal');
    const modalImg = document.getElementById('modal-image');
    if (modal && modalImg) {
        modalImg.src = msg.text;
        modal.style.display = 'flex';
    }
};

window.closeChatImage = function () {
    const modal = document.getElementById('chat-image-modal');
    if (modal) modal.style.display = 'none';
};

// GIF Picker
const gifBtn = document.getElementById('chat-gif-btn');
const gifPicker = document.getElementById('chat-gif-picker');
function toggleGifPicker(show) {
    if (!gifPicker) return;
    gifPicker.style.display = (typeof show === 'boolean') ? (show ? 'block' : 'none') : (gifPicker.style.display === 'none' ? 'block' : 'none');
}
if (gifBtn) gifBtn.addEventListener('click', toggleGifPicker);
document.addEventListener('click', (e) => {
    if (gifPicker && gifPicker.style.display === 'block' && !gifPicker.contains(e.target) && e.target !== gifBtn) toggleGifPicker(false);
});

// Typing Logic
let typingTimeout = null;
function updateTypingStatus(user, isTyping) {
    const status = JSON.parse(localStorage.getItem('kingdom_typing_status') || "{}");
    status[user] = { isTyping: isTyping, timestamp: Date.now() };
    localStorage.setItem('kingdom_typing_status', JSON.stringify(status));
    if (isTyping) {
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => updateTypingStatus(user, false), 3000);
    }
}

function checkTypingIndicator() {
    const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
    const otherUser = currentUser === 'Aviya' ? 'David' : 'Aviya';
    const status = JSON.parse(localStorage.getItem('kingdom_typing_status') || "{}");
    const otherStatus = status[otherUser];
    const isTyping = otherStatus && otherStatus.isTyping && (Date.now() - otherStatus.timestamp < 4000);
    const indicator = document.getElementById('chat-typing-indicator');
    if (!indicator) {
        const div = document.createElement('div');
        div.id = 'chat-typing-indicator';
        div.className = 'typing-indicator';
        div.innerHTML = '<span></span><span></span><span></span>';
        if (chatHistoryList) chatHistoryList.appendChild(div);
        scrollToBottom();
    } else {
        const wasVisible = indicator.style.display === 'block';
        indicator.style.display = isTyping ? 'block' : 'none';
        if (!wasVisible && isTyping) scrollToBottom();
        if (chatHistoryList) chatHistoryList.appendChild(indicator);
    }
}
setInterval(checkTypingIndicator, 1000);

window.sendGif = function (imgUrl) {
    window.sendChatContent(imgUrl, 'gif');
    toggleGifPicker(false);
};

// Initialize Listeners
document.addEventListener('DOMContentLoaded', () => {
    if (chatSendBtn && chatInput) {
        const sendAction = () => {
            const txt = chatInput.value.trim();
            if (txt) {
                window.sendChatContent(txt, 'text', false);
            }
        };
        chatSendBtn.onclick = sendAction;
        chatInput.onkeypress = (e) => { if (e.key === 'Enter') { e.preventDefault(); sendAction(); } };
        chatInput.addEventListener('input', () => {
            const currentUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
            updateTypingStatus(currentUser, true);
        });
    }

    // Chat Tab Click Refresher
    const chatTabBtn = document.querySelector('[data-tab="chat"]');
    if (chatTabBtn) {
        chatTabBtn.addEventListener('click', () => {
            setTimeout(window.scrollToBottom, 50);
            const cUser = localStorage.getItem('kingdom_current_user') || 'Aviya';
            const oUser = cUser === 'Aviya' ? 'David' : 'Aviya';
            if (typeof SyncManager !== 'undefined') SyncManager.markMessagesAsRead(oUser);
        });
    }
});
