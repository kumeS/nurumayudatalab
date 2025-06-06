// Quest Management Functions

function startQuest(questId) {
    const quest = gameState.quests.find(q => q.id === questId);
    if (!quest || gameState.user.stamina < quest.staminaCost) {
        return;
    }

    gameState.currentQuest = quest;
    gameState.user.stamina -= quest.staminaCost;
    
    // Show quest progress screen
    document.querySelectorAll('.content .screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById('questProgress').classList.add('active');

    // Update quest progress UI
    document.getElementById('currentQuestTitle').textContent = quest.title;
    document.getElementById('currentQuestDesc').textContent = quest.description;
    
    startQuestTimer(quest.duration);
    updateUI();
}

function startQuestTimer(duration) {
    let timeLeft = duration;
    const timerElement = document.getElementById('questTimer');
    const progressElement = document.getElementById('questProgressFill');
    const progressText = document.getElementById('progressText');
    
    gameState.questTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const progress = ((duration - timeLeft) / duration) * 100;
        progressElement.style.width = `${progress}%`;
        
        if (progress < 50) {
            progressText.textContent = 'クエスト進行中...';
        } else if (progress < 100) {
            progressText.textContent = 'もう少しで完了！';
        } else {
            progressText.textContent = '完了ボタンを押してください';
        }
        
        timeLeft--;
        
        if (timeLeft < 0) {
            clearInterval(gameState.questTimer);
            timerElement.textContent = '00:00';
            progressElement.style.width = '100%';
        }
    }, 1000);
}

function completeQuest() {
    if (!gameState.currentQuest) return;
    
    const quest = gameState.currentQuest;
    
    // Clear timer
    if (gameState.questTimer) {
        clearInterval(gameState.questTimer);
        gameState.questTimer = null;
    }
    
    // Award rewards
    gameState.user.xp += quest.xpReward;
    gameState.user.coins += quest.coinReward;
    
    // Check for level up
    if (gameState.user.xp >= gameState.user.nextLevelXP) {
        gameState.user.level++;
        gameState.user.xp -= gameState.user.nextLevelXP;
        gameState.user.nextLevelXP = gameState.user.level * 100;
        gameState.user.maxStamina += 5; // Increase max stamina on level up
    }
    
    // Deal damage to boss (10% of XP as damage)
    const bossDamage = Math.floor(quest.xpReward * 0.1);
    dealBossDamage(bossDamage);
    
    // Show reward popup
    showRewardPopup(quest);
    
    // Reset quest state
    gameState.currentQuest = null;
    
    // Go back to dashboard
    setTimeout(() => {
        document.querySelectorAll('.content .screen').forEach(screen => screen.classList.remove('active'));
        document.getElementById('dashboard').classList.add('active');
        updateUI();
        renderQuests();
        renderDailyQuests();
    }, 3000);
}

// Stamina Management
function recoverStamina() {
    if (gameState.user.stamina < gameState.user.maxStamina) {
        gameState.user.stamina = Math.min(gameState.user.maxStamina, gameState.user.stamina + 5);
        updateUI();
    }
}

// Daily Reset Function
function dailyReset() {
    // Reset daily quest completion status
    renderDailyQuests();
    
    // Full stamina restore
    gameState.user.stamina = gameState.user.maxStamina;
    updateUI();
    
    // Show daily login bonus
    setTimeout(() => {
        alert('🌅 新しい日が始まりました！\n\nデイリーログインボーナス: 50コイン獲得！\nスタミナが全回復しました！');
        gameState.user.coins += 50;
        updateUI();
    }, 1000);
} 