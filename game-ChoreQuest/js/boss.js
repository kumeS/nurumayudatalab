// Boss Battle System

function dealBossDamage(damage) {
    bossState.currentHP = Math.max(0, bossState.currentHP - damage);
    
    // Update participant damage
    const participant = bossState.participants.find(p => p.name === (gameState.user.nickname || 'あなた'));
    if (participant) {
        participant.damage += damage;
    }
    
    updateBossUI();
    
    // Check if boss is defeated
    if (bossState.currentHP <= 0) {
        showBossDefeatedMessage();
    }
}

function updateBossUI() {
    const hpPercentage = (bossState.currentHP / bossState.maxHP) * 100;
    document.getElementById('bossHpFill').style.width = `${hpPercentage}%`;
    document.getElementById('bossCurrentHp').textContent = bossState.currentHP;
    document.getElementById('bossMaxHp').textContent = bossState.maxHP;
}

function showBossDefeatedMessage() {
    setTimeout(() => {
        alert('🎉 ボス討伐成功！ 家族全員で力を合わせてダーティ・ディッシュドラゴンを倒しました！\n\n特別報酬: 500コイン + レアアイテム「光る皿洗いソード」を獲得！');
        
        // Award boss defeat rewards
        gameState.user.coins += 500;
        updateUI();
        
        // Reset boss for next battle
        bossState.currentHP = bossState.maxHP;
        bossState.participants.forEach(p => p.damage = 0);
        updateBossUI();
    }, 1000);
} 