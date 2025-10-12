class SoundManager {
  constructor() {
    this.sounds = {
      chip: new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'),
      shuffle: new Audio('https://assets.mixkit.co/active_storage/sfx/1554/1554-preview.mp3'),
      win: new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'),
      notification: new Audio('https://assets.mixkit.co/active_storage/sfx/1509/1509-preview.mp3'),
      cashRegister: new Audio('https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3')
    };
    
    this.enabled = true;
    
    // Preload all sounds
    Object.values(this.sounds).forEach(sound => {
      sound.load();
    });
  }

  play(soundName, volume = 0.5) {
    if (!this.enabled) return;
    
    const sound = this.sounds[soundName];
    if (sound) {
      sound.volume = volume;
      sound.currentTime = 0;
      sound.play().catch(err => console.log('Sound play failed:', err));
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

export const soundManager = new SoundManager();