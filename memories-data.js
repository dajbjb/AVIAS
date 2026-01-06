/**
 * memories-data.js
 * Persistent store for memories to ensure they survive refreshes.
 */

const PERSISTENT_MEMORIES = [
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
    }
];

// Combine with existing localStorage if needed, or act as primary source
function getInitialMemories() {
    const local = localStorage.getItem('kingdom_memories');
    if (!local) {
        localStorage.setItem('kingdom_memories', JSON.stringify(PERSISTENT_MEMORIES));
        return PERSISTENT_MEMORIES;
    }
    return JSON.parse(local);
}
