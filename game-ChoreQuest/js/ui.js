// UI Management and Navigation

// Screen Navigation
function showScreen(screenName) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    // Update screens
    document.querySelectorAll('.content .screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenName).classList.add('active');
}

// Update User Interface
function updateUI() {
    document.getElementById('userAvatar').textContent = gameState.user.avatar;
    document.getElementById('userName').textContent = gameState.user.nickname;
    document.getElementById('userLevel').textContent = gameState.user.level;
    document.getElementById('userStamina').textContent = gameState.user.stamina;
    document.getElementById('userCoins').textContent = gameState.user.coins;
}

// Render Quest Lists
function renderQuests() {
    const questList = document.getElementById('questList');
    questList.innerHTML = '';

    gameState.quests.forEach(quest => {
        const questCard = createQuestCard(quest);
        questList.appendChild(questCard);
    });
}

function renderDailyQuests() {
    const dailyQuests = document.getElementById('dailyQuests');
    dailyQuests.innerHTML = '';

    // Show first 2 quests as daily quests
    gameState.quests.slice(0, 2).forEach(quest => {
        const questCard = createQuestCard(quest, true);
        dailyQuests.appendChild(questCard);
    });
}

function createQuestCard(quest, isDaily = false) {
    const card = document.createElement('div');
    card.className = 'quest-card';
    
    const difficultyStars = '⭐'.repeat(quest.difficulty);
    const canStart = gameState.user.stamina >= quest.staminaCost;
    
    card.innerHTML = `
        <div class="quest-header">
            <div class="quest-title">${quest.title}</div>
            <div class="quest-difficulty">${difficultyStars}</div>
        </div>
        <div class="quest-description">${quest.description}</div>
        <div class="quest-rewards">
            <div class="reward-item">
                <span>⚡</span>
                <span>-${quest.staminaCost}</span>
            </div>
            <div class="reward-item">
                <span>📈</span>
                <span>+${quest.xpReward} XP</span>
            </div>
            <div class="reward-item">
                <span>🪙</span>
                <span>+${quest.coinReward}</span>
            </div>
        </div>
        <button class="start-quest-btn" 
                onclick="startQuest(${quest.id})" 
                ${!canStart ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
            ${canStart ? 'クエスト開始' : 'スタミナ不足'}
        </button>
    `;
    
    return card;
}

// Popup Management
function showRewardPopup(quest) {
    const popup = document.getElementById('rewardPopup');
    const rewardText = document.getElementById('rewardText');
    
    rewardText.textContent = `${quest.xpReward} XP と ${quest.coinReward} コインを獲得しました！`;
    popup.style.display = 'flex';
    
    // Add reward animation
    const rewardAnimation = document.querySelector('.reward-animation');
    rewardAnimation.style.animation = 'none';
    setTimeout(() => {
        rewardAnimation.style.animation = 'bounce 0.6s ease';
    }, 10);
}

function closeRewardPopup() {
    document.getElementById('rewardPopup').style.display = 'none';
} 