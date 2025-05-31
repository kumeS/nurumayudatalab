// Achievement System

function checkAchievements() {
    achievements.forEach(achievement => {
        if (achievement.unlocked) return;
        
        let shouldUnlock = false;
        
        switch(achievement.id) {
            case 'first_quest':
                shouldUnlock = true; // Unlocked when completing any quest
                break;
            case 'level_up':
                shouldUnlock = gameState.user.level >= 2;
                break;
            case 'boss_damage':
                const participant = bossState.participants.find(p => p.name === (gameState.user.nickname || 'あなた'));
                shouldUnlock = participant && participant.damage >= 1000;
                break;
            case 'stamina_saver':
                shouldUnlock = gameState.user.stamina === gameState.user.maxStamina;
                break;
        }
        
        if (shouldUnlock) {
            achievement.unlocked = true;
            showAchievementPopup(achievement);
        }
    });
}

function showAchievementPopup(achievement) {
    setTimeout(() => {
        alert(`🎊 実績解除！\n\n${achievement.icon} ${achievement.name}\n${achievement.description}\n\nボーナス: 100コイン獲得！`);
        gameState.user.coins += 100;
        updateUI();
    }, 2000);
}

// Family Chat System (mock)
function addFamilyMessage(message) {
    // This would integrate with a real-time messaging system
    console.log(`[${gameState.user.familyId}] ${gameState.user.nickname}: ${message}`);
}

// Easter Eggs and Special Events
let easterEggCounter = 0;

function initializeEasterEggs() {
    document.addEventListener('click', function(e) {
        if (e.target.id === 'userAvatar') {
            easterEggCounter++;
            if (easterEggCounter >= 10) {
                alert('🎁 隠しボーナス発見！\n\n神秘的な力により 1000コイン を獲得しました！');
                gameState.user.coins += 1000;
                updateUI();
                easterEggCounter = 0;
            }
        }
    });
}

// Seasonal Events
function checkSeasonalEvents() {
    const now = new Date();
    const month = now.getMonth() + 1;
    
    if (month === 12) {
        // December - Winter Event
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #f093fb 100%)';
        // Add snow effect or Christmas themes
    } else if (month >= 3 && month <= 5) {
        // Spring Event
        document.body.style.background = 'linear-gradient(135deg, #a8e6cf 0%, #ffd3a5 100%)';
    }
} 