// Sound Effects System

function playSound(type) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let frequency;
    
    switch(type) {
        case 'complete':
            frequency = 523.25; // C5
            break;
        case 'reward':
            frequency = 659.25; // E5
            break;
        case 'start':
            frequency = 440; // A4
            break;
        default:
            frequency = 440;
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

// Initialize sound effects for buttons
function initializeSoundEffects() {
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('start-quest-btn')) {
            playSound('start');
        } else if (e.target.classList.contains('complete-btn')) {
            playSound('complete');
        }
    });
} 