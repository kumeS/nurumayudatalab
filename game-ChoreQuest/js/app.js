// Main Application Controller

// Initialize Application
function init() {
    updateUI();
    renderQuests();
    renderDailyQuests();
}

// Set up periodic functions
function initializeTimers() {
    // Auto stamina recovery every minute (for demo purposes)
    setInterval(recoverStamina, 60000);

    // Demo daily reset every 5 minutes
    setInterval(dailyReset, 300000);

    // Save game state periodically
    setInterval(saveGameState, 30000);
}

// Enhanced quest completion with achievements
function enhanceQuestCompletion() {
    const originalCompleteQuest = completeQuest;
    completeQuest = function() {
        originalCompleteQuest();
        checkAchievements();
    };
}

// Enhanced reward popup with family messages
function enhanceFamilyChat() {
    const originalShowRewardPopup = showRewardPopup;
    showRewardPopup = function(quest) {
        addFamilyMessage(`${quest.title}を完了しました！ 家族の勝利に貢献！`);
        originalShowRewardPopup(quest);
    };
}

// Main application initialization
document.addEventListener('DOMContentLoaded', function() {
    loadGameState();
    
    // Initialize all systems
    initializeAvatarSelection();
    initializeSoundEffects();
    initializeNotifications();
    initializeEasterEggs();
    initializeTimers();
    
    // Enhance existing functions
    enhanceQuestCompletion();
    enhanceFamilyChat();
    
    // Check seasonal events
    checkSeasonalEvents();
    
    // If user already logged in, skip login screen
    if (gameState.user.nickname) {
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('mainApp').classList.add('active');
        init();
    }
    
    updateBossUI();
    
    console.log('🎮 Chore Quest アプリが正常に読み込まれました！');
    console.log('💡 ヒント: アバターを10回クリックすると隠しボーナスが...？');
});

// Save on page unload
window.addEventListener('beforeunload', saveGameState); 