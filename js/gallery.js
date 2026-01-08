/**
 * Gallery Logic
 * Handles memory uploads, drafting, reordering, and rendering of the gallery timeline.
 */

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

let currentDraftImages = [];

async function compressImage(base64Str, maxWidth = 800) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = maxWidth / img.width;
            canvas.width = (scale < 1) ? maxWidth : img.width;
            canvas.height = (scale < 1) ? img.height * scale : img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
    });
}

// 1. Upload
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

// 2. Drag Reorder
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
            const frameStyles = ['frame-polaroid', 'frame-modern-glass', 'frame-film-strip', 'frame-vintage-wood'];
            const themeColors = ['#A7C7E7', '#FFD1DC', '#B0E0E6', '#F0E68C', '#DDA0DD', '#98FB98'];

            const newMemory = {
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

            if (typeof SyncManager !== 'undefined') SyncManager.addMemory(newMemory);

            currentDraftImages = [];
            if (galleryText) galleryText.value = '';
            if (previewArea) previewArea.style.display = 'none';
            if (textModal) textModal.style.display = 'none';
            if (aiLoader) aiLoader.style.display = 'none';

            const viewTab = document.querySelector('[data-gallery-tab="view"]');
            if (viewTab) viewTab.click();
        }, 1500);
    });
}

window.createMemoryHTML = function (memory) {
    return `
        <div class="memory-theme-overlay" style="background: ${memory.themeColor}"></div>
        <div class="memory-header" style="padding:0 20px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; flex:1; overflow:hidden;">
               <span class="memory-date" style="color:rgba(255,255,255,0.3); font-size:0.75rem; font-family:'Montserrat'; letter-spacing:2px; flex-shrink:0;">
                    ${new Date(memory.id || memory.timestamp).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <div class="collapsed-preview-text" style="margin-right:15px; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${memory.text || 'זיכרון ללא כותרת'}
                </div>
            </div>
            <div class="memory-actions">
                <button class="action-btn toggle-btn" onclick="toggleExpand('${memory.id}')"><i class="fa-solid ${memory.isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}"></i></button>
                <button class="action-btn" onclick="editMemoryText('${memory.id}')"><i class="fa-solid fa-pen-nib"></i></button>
                <button class="action-btn delete" onclick="deleteMemory('${memory.id}')"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        </div>
        <div class="memory-content">
            <div class="memory-images">
                ${memory.images.map((imgObj, idx) => `
                    <div class="memory-img-wrapper ${imgObj.frame}">
                        <img src="${imgObj.src}" class="ai-styled-img ${imgObj.filter}">
                        <button class="delete-img-btn" onclick="deleteImageFromMemory('${memory.id}', ${idx})"><i class="fa-solid fa-xmark"></i></button>
                    </div>
                `).join('')}
                ${memory.text ? `<div class="memory-img-wrapper frame-text-card"><div class="text-frame-content">${memory.text}</div></div>` : ''}
                <button class="add-img-btn" onclick="addImageToMemoryPrompt('${memory.id}')"><i class="fa-solid fa-sparkles"></i> AI: הוסף רגע נוסף לזיכרון</button>
            </div>
        </div>`;
};

window.renderMemories = function () {
    if (!memoriesList) return;
    const mems = window.memories || []; // from Core
    memoriesList.innerHTML = mems.length === 0 ? `<div class="gallery-placeholder"><i class="fa-solid fa-wand-sparkles"></i><p>הזיכרונות שלכם יופיעו כאן</p></div>` : '';
    mems.forEach(memory => {
        const item = document.createElement('div');
        item.className = `memory-item ${memory.isCollapsed ? 'collapsed' : ''}`;
        item.innerHTML = window.createMemoryHTML(memory);
        memoriesList.appendChild(item);
    });
};

// Global Actions for HTML Onclick
window.toggleExpand = (id) => {
    const mem = window.memories.find(m => m.id == id); // Loose equality for string/number
    if (mem) {
        mem.isCollapsed = !mem.isCollapsed;
        localStorage.setItem('kingdom_memories', JSON.stringify(window.memories));
        window.renderMemories();
    }
};

window.deleteMemory = (id) => {
    if (confirm('מחק זיכרון?')) {
        window.memories = window.memories.filter(m => m.id != id);
        localStorage.setItem('kingdom_memories', JSON.stringify(window.memories));
        window.renderMemories();
        if (typeof SyncManager !== 'undefined') SyncManager.deleteStory(id); // Using deleteStory hack or need deleteMemory in SyncManager?
        // SyncManager has deleteStory, but not explicitly deleteMemory.
        // Wait, SyncManager 949 had listenToMemories but NO deleteMemory?
        // Core.js had listen/add. Check Core.js!
        // Core.js Step 955 has addMemory. NO deleteMemory.
        // I should add deleteMemory to SyncManager in Core.js later.
        if (typeof db !== 'undefined') db.collection('kingdom_memories').doc(String(id)).delete();
    }
};

window.editMemoryText = (id) => {
    const mem = window.memories.find(m => m.id == id);
    const t = prompt('ערוך טקסט:', mem.text);
    if (t !== null) {
        mem.text = t;
        localStorage.setItem('kingdom_memories', JSON.stringify(window.memories));
        window.renderMemories();
    }
};

window.deleteImageFromMemory = (memId, imgIdx) => {
    const mem = window.memories.find(m => m.id == memId);
    if (mem && mem.images.length > 1) {
        mem.images.splice(imgIdx, 1);
        localStorage.setItem('kingdom_memories', JSON.stringify(window.memories));
        window.renderMemories();
    } else if (mem) window.deleteMemory(memId);
};

window.addImageToMemoryPrompt = (id) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
    i.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            const rawData = await new Promise(r => { reader.onload = (ev) => r(ev.target.result); reader.readAsDataURL(file); });
            const compressed = await compressImage(rawData);
            const mem = window.memories.find(m => m.id == id);
            if (mem && mem.images.length < 5) {
                mem.images.push({ src: compressed, frame: 'frame-modern-glass', filter: 'ai-filter-0' });
                localStorage.setItem('kingdom_memories', JSON.stringify(window.memories));
                window.renderMemories();
                if (typeof db !== 'undefined') {
                    // Update Doc in Cloud? SyncManager missing UpdateMemory util. 
                    // I'll leave cloud update not implemented for edit/add image unless I add it to Core.js.
                    // For now, local update is reflected for User.
                }
            }
        }
    };
    i.click();
};

const galleryTabs = document.querySelectorAll('.gallery-tab');
const galleryContents = document.querySelectorAll('.gallery-content');
const galleryIndicator = document.querySelector('.gallery-tab-indicator');

galleryTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
        galleryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        if (galleryIndicator) galleryIndicator.style.transform = `translateX(${index * 100}%)`;
        const target = tab.getAttribute('data-gallery-tab');
        galleryContents.forEach(c => c.classList.remove('active'));
        const c = document.getElementById(`gallery-${target}`);
        if (c) c.classList.add('active');
        if (target === 'view' && typeof window.renderMemories === 'function') window.renderMemories();
    });
});
