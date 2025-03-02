// Global game state to track music and upgrades
const gameState = {
  homeMusic: null,
  bgMusic: null,
  upgrades: { speedBoots: false } // Example upgrade for demonstration
};

// Game configuration
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 } }
  },
  scene: [HomeScene, GameScene]
};

const game = new Phaser.Game(config);

// HomeScene: The main menu
class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  preload() {
    // Load all audio assets here for consistency
    this.load.audio('homeMusic', 'westernhomescreen.m4a');
    this.load.audio('bgMusic', 'westernbackground.m4a');
    // Load images based on attachment descriptions
    this.load.image('cowboy', 'westerncowboy.png'); // Cowboy sprite
    this.load.image('hotel', 'westernhotel.png');   // Hotel sprite
    this.load.image('coin', 'westerncoin.png');
  }

  create() {
    // Stop background music if playing (e.g., returning from GameScene)
    if (gameState.bgMusic && gameState.bgMusic.isPlaying) {
      gameState.bgMusic.stop();
    }

    // Play homescreen music
    if (!gameState.homeMusic) {
      gameState.homeMusic = this.sound.add('homeMusic', { loop: true });
    }
    gameState.homeMusic.play();

    // Add start button
    const startButton = this.add.text(400, 300, 'Start Game', {
      fontSize: '32px',
      color: '#fff'
    }).setOrigin(0.5).setInteractive();

    startButton.on('pointerdown', () => {
      gameState.homeMusic.stop();
      this.scene.start('GameScene');
    });
  }
}

// GameScene: The main gameplay
class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  preload() {
    // Assets already loaded in HomeScene preload
  }

  create() {
    // Stop homescreen music if playing
    if (gameState.homeMusic && gameState.homeMusic.isPlaying) {
      gameState.homeMusic.stop();
    }

    // Play background music
    if (!gameState.bgMusic) {
      gameState.bgMusic = this.sound.add('bgMusic', { loop: true });
    }
    gameState.bgMusic.play();

    // Initialize game variables
    this.killCounter = 0;
    this.bonusActive = false;
    this.paused = false;
    this.health = 3;

    // Player (cowboy sprite from image 1)
    this.cowboy = this.physics.add.sprite(400, 500, 'cowboy').setScale(1);
    this.cowboy.setCollideWorldBounds(true);

    // Groups for game objects
    this.buildings = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.dynamites = this.physics.add.group();
    this.coins = this.physics.add.group();

    // Spawn static hotels (from image 0)
    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(50, 750);
      const hotel = this.buildings.create(x, 500, 'hotel').setOrigin(0.5, 1);
      hotel.setImmovable(true);
    }

    // Enemy spawn timer (boss enemies)
    this.time.addEvent({
      delay: 20000, // 20 seconds
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true
    });

    // Input for movement and dynamite
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.throwCharge = 0;

    // Pause key
    this.input.keyboard.on('keydown-ESC', this.togglePause, this);

    // Collision setups
    this.physics.add.overlap(this.cowboy, this.enemies, this.takeDamage, null, this);
    this.physics.add.overlap(this.dynamites, this.enemies, this.killEnemy, null, this);
    this.physics.add.overlap(this.dynamites, this.buildings, this.explodeDynamite, null, this);
  }

  update() {
    try {
      if (this.paused) return;

      // Player movement
      const baseSpeed = gameState.upgrades.speedBoots ? 200 : 160;
      const speed = this.bonusActive ? baseSpeed * 1.5 : baseSpeed;
      this.cowboy.setVelocity(0);
      if (this.cursors.left.isDown) this.cowboy.setVelocityX(-speed);
      if (this.cursors.right.isDown) this.cowboy.setVelocityX(speed);
      if (this.cursors.up.isDown) this.cowboy.setVelocityY(-speed);
      if (this.cursors.down.isDown) this.cowboy.setVelocityY(speed);

      // Dynamite charging
      if (this.spaceKey.isDown) {
        this.throwCharge = Math.min(this.throwCharge + 0.02, 1);
      } else if (Phaser.Input.Keyboard.JustUp(this.spaceKey)) {
        this.throwDynamite();
        this.throwCharge = 0;
      }
    } catch (error) {
      console.error('Update error:', error);
    }
  }

  spawnEnemy() {
    const enemy = this.enemies.create(400, 50, 'cowboy').setScale(1); // Using cowboy sprite for simplicity
    enemy.setVelocityY(100); // Moves downward
  }

  throwDynamite() {
    const baseStrength = this.bonusActive ? 300 : 200;
    const throwStrength = baseStrength + this.throwCharge * (this.bonusActive ? 300 : 200);
    const dynamite = this.dynamites.create(this.cowboy.x, this.cowboy.y - 20, 'coin'); // Placeholder sprite
    dynamite.setVelocityY(-throwStrength);
  }

  killEnemy(dynamite, enemy) {
    dynamite.destroy();
    enemy.destroy();
    this.killCounter++;
    if (this.killCounter >= 10 && !this.bonusActive) {
      this.activateBonus();
    }
  }

  activateBonus() {
    this.bonusActive = true;
    const bonusText = this.add.text(400, 300, 'Gunslinger’s Surge Activated!', {
      fontSize: '32px',
      color: '#fff'
    }).setOrigin(0.5);
    this.time.delayedCall(3000, () => bonusText.destroy());
  }

  takeDamage(cowboy, enemy) {
    enemy.destroy();
    this.health--;
    if (this.health <= 0) {
      this.gameOver();
    }
  }

  explodeDynamite(dynamite, building) {
    dynamite.destroy();
    building.destroy();
    const coin = this.coins.create(building.x, building.y - 20, 'coin').setScale(0.5);
    coin.setVelocityY(-100);
  }

  togglePause() {
    if (!this.paused) {
      this.physics.pause();
      this.paused = true;
      gameState.bgMusic.pause();
      this.showPauseMenu();
    } else {
      this.physics.resume();
      this.paused = false;
      gameState.bgMusic.resume();
      this.hidePauseMenu();
    }
  }

  showPauseMenu() {
    this.pauseBackground = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.5);
    this.resumeButton = this.add.text(400, 250, 'Resume', {
      fontSize: '32px',
      color: '#fff'
    }).setOrigin(0.5).setInteractive();
    this.quitButton = this.add.text(400, 350, 'Quit to Home', {
      fontSize: '32px',
      color: '#fff'
    }).setOrigin(0.5).setInteractive();

    this.resumeButton.on('pointerdown', () => this.togglePause());
    this.quitButton.on('pointerdown', () => {
      gameState.bgMusic.stop();
      this.scene.start('HomeScene');
    });
  }

  hidePauseMenu() {
    this.pauseBackground.destroy();
    this.resumeButton.destroy();
    this.quitButton.destroy();
  }

  gameOver() {
    gameState.bgMusic.pause();
    const gameOverText = this.add.text(400, 250, 'Game Over', {
      fontSize: '48px',
      color: '#fff'
    }).setOrigin(0.5);
    const backButton = this.add.text(400, 350, 'Back to Home', {
      fontSize: '32px',
      color: '#fff'
    }).setOrigin(0.5).setInteractive();

    backButton.on('pointerdown', () => {
      gameState.bgMusic.stop();
      this.scene.start('HomeScene');
    });
  }
}
