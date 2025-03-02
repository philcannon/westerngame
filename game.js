// Define scene classes first to ensure they are available before use

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

    // Error handling for assets
    this.load.on('fileerror', (file) => console.error(`Failed to load asset: ${file.key}`));
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
    try {
      const enemy = this.enemies.create(400, 50, 'cowboy').setScale(2); // Using cowboy sprite for boss, scaled larger
      enemy.setVelocityY(100); // Moves downward
    } catch (error) {
      console.error('Enemy spawn error:', error);
    }
  }

  throwDynamite() {
    try {
      const baseStrength = this.bonusActive ? 300 : 200;
      const throwStrength = baseStrength + this.throwCharge * (this.bonusActive ? 300 : 200);
      const dynamite = this.dynamites.create(this.cowboy.x, this.cowboy.y - 20, 'coin'); // Placeholder sprite
      dynamite.setVelocityY(-throwStrength);
    } catch (error) {
      console.error('Dynamite throw error:', error);
    }
  }

  killEnemy(dynamite, enemy) {
    try {
      dynamite.destroy();
      enemy.destroy();
      this.killCounter++;
      if (this.killCounter >= 10 && !this.bonusActive) {
        this.activateBonus();
      }
    } catch (error) {
      console.error('Kill enemy error:', error);
    }
  }

  activateBonus() {
    try {
      this.bonusActive = true;
      const bonusText = this.add.text(400, 300, 'Gunslinger’s Surge Activated!', {
        fontSize: '32px',
        color: '#fff'
      }).setOrigin(0.5);
      this.time.delayedCall(3000, () => bonusText.destroy());
    } catch (error) {
      console.error('Bonus activation error:', error);
    }
  }

  takeDamage(cowboy, enemy) {
    try {
      enemy.destroy();
      this.health--;
      if (this.health <= 0) {
        this.gameOver();
      }
    } catch (error) {
      console.error('Damage error:', error);
    }
  }

  explodeDynamite(dynamite, building) {
    try {
      dynamite.destroy();
      building.destroy();
      const coin = this.coins.create(building.x, building.y - 20, 'coin').setScale(0.5);
      coin.setVelocityY(-100);
    } catch (error) {
      console.error('Explosion error:', error);
    }
  }

  togglePause() {
    try {
      if (!this.paused) {
        this.physics.pause();
        this.paused = true;
        if (gameState.bgMusic && gameState.bgMusic.isPlaying) {
          gameState.bgMusic.pause();
        }
        this.showPauseMenu();
      } else {
        this.physics.resume();
        this.paused = false;
        if (gameState.bgMusic) {
          gameState.bgMusic.resume();
        }
        this.hidePauseMenu();
      }
    } catch (error) {
      console.error('Pause toggle error:', error);
    }
  }

  showPauseMenu() {
    try {
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
        if (gameState.bgMusic && gameState.bgMusic.isPlaying) {
          gameState.bgMusic.stop();
        }
        this.scene.start('HomeScene');
      });
    } catch (error) {
      console.error('Pause menu error:', error);
    }
  }

  hidePauseMenu() {
    try {
      if (this.pauseBackground) this.pauseBackground.destroy();
      if (this.resumeButton) this.resumeButton.destroy();
      if (this.quitButton) this.quitButton.destroy();
    } catch (error) {
      console.error('Hide pause menu error:', error);
    }
  }

  gameOver() {
    try {
      if (gameState.bgMusic && gameState.bgMusic.isPlaying) {
        gameState.bgMusic.pause();
      }

      const gameOverText = this.add.text(400, 250, 'Game Over', {
        fontSize: '48px',
        color: '#fff'
      }).setOrigin(0.5);
      const backButton = this.add.text(400, 350, 'Back to Home', {
        fontSize: '32px',
        color: '#fff'
      }).setOrigin(0.5).setInteractive();

      backButton.on('pointerdown', () => {
        if (gameState.bgMusic) {
          gameState.bgMusic.stop();
        }
        this.scene.start('HomeScene');
      });
    } catch (error) {
      console.error('Game over error:', error);
    }
  }
}

// Global game state (moved after scenes to avoid initialization issues)
const gameState = {
  coins: parseInt(localStorage.getItem('coins')) || 0,
  highScore: parseInt(localStorage.getItem('highScore')) || 0,
  upgrades: JSON.parse(localStorage.getItem('upgrades')) || {
    speedBoots: false
  },
  homeMusic: null,
  bgMusic: null
};

// Game configuration (now after scene definitions)
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 } }
  },
  scene: [HomeScene, GameScene]
};

// Initialize the game (last, after all definitions)
const game = new Phaser.Game(config);
