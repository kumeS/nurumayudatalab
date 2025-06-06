// Authentication and Login Functions

function startGame() {
    const nickname = document.getElementById('nicknameInput').value;
    const familyId = document.getElementById('familyInput').value;
    const selectedAvatar = document.querySelector('.avatar-option.selected').dataset.avatar;

    if (!nickname || !familyId) {
        alert('ニックネームと家族チーム名を入力してください');
        return;
    }

    gameState.user.nickname = nickname;
    gameState.user.familyId = familyId;
    gameState.user.avatar = selectedAvatar;

    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    
    updateUI();
    renderQuests();
    renderDailyQuests();
}

// Avatar Selection Handler
function initializeAvatarSelection() {
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
} 