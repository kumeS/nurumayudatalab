// Game State Management
let gameState = {
    user: {
        nickname: '',
        avatar: '🧙‍♂️',
        level: 1,
        xp: 0,
        nextLevelXP: 100,
        stamina: 50,
        maxStamina: 50,
        coins: 100,
        familyId: ''
    },
    currentQuest: null,
    questTimer: null,
    quests: [
        {
            id: 1,
            title: '皿洗いクエスト',
            description: '食後の食器をまとめて洗浄する',
            difficulty: 2,
            xpReward: 100,
            coinReward: 30,
            category: 'kitchen',
            duration: 300, // 5分
            staminaCost: 10
        },
        {
            id: 2,
            title: '掃除機クエスト',
            description: 'リビングルームを掃除機でキレイにする',
            difficulty: 3,
            xpReward: 150,
            coinReward: 45,
            category: 'living',
            duration: 600, // 10分
            staminaCost: 15
        },
        {
            id: 3,
            title: '洗濯物クエスト',
            description: '洗濯物を干して整理する',
            difficulty: 2,
            xpReward: 120,
            coinReward: 35,
            category: 'laundry',
            duration: 480, // 8分
            staminaCost: 12
        },
        {
            id: 4,
            title: 'トイレ掃除クエスト',
            description: 'トイレを隅々まで清潔にする',
            difficulty: 4,
            xpReward: 200,
            coinReward: 60,
            category: 'bathroom',
            duration: 900, // 15分
            staminaCost: 20
        }
    ]
};

// Boss Battle State
let bossState = {
    currentHP: 7500,
    maxHP: 10000,
    participants: [
        { name: 'ママ', avatar: '👩‍🍳', damage: 1500 },
        { name: gameState.user.nickname || 'あなた', avatar: gameState.user.avatar, damage: 1000 }
    ]
};

// Achievement System
const achievements = [
    { id: 'first_quest', name: '初クエスト', description: '最初のクエストを完了', icon: '🏆', unlocked: false },
    { id: 'level_up', name: 'レベルアップ', description: 'レベル2に到達', icon: '⭐', unlocked: false },
    { id: 'boss_damage', name: 'ボスハンター', description: 'ボスに1000ダメージ与える', icon: '⚔️', unlocked: false },
    { id: 'stamina_saver', name: 'エネルギー管理者', description: 'スタミナを効率的に使用', icon: '⚡', unlocked: false }
];

// Local Storage Functions
function saveGameState() {
    localStorage.setItem('choreQuestGameState', JSON.stringify(gameState));
    localStorage.setItem('choreQuestBossState', JSON.stringify(bossState));
}

function loadGameState() {
    const savedGameState = localStorage.getItem('choreQuestGameState');
    const savedBossState = localStorage.getItem('choreQuestBossState');
    
    if (savedGameState) {
        gameState = { ...gameState, ...JSON.parse(savedGameState) };
    }
    
    if (savedBossState) {
        bossState = { ...bossState, ...JSON.parse(savedBossState) };
    }
} 