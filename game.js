// Wait for DOM to be ready before initializing Phaser
document.addEventListener('DOMContentLoaded', () => {
  // Global game state to track music, upgrades, and player state
  const gameState = {
    coins: parseInt(localStorage.getItem('coins')) || 0,
    highScore: parseInt(localStorage.getItem('highScore')) || 0,
    upgrades: JSON.parse(localStorage.getItem('upgrades')) || {
      bigDynamite: false,
      speedBoots: false
    },
    homeMusic: null,
    bgMusic: null
  };

  // Define scene classes first to ensure they are available before use
  class HomeScene extends Phaser.Scene {
    constructor() {
      super('HomeScene');
    }

    preload() {
      // Load all audio and image assets with error handling
      const assets = [
        { type: 'audio', key: 'homeMusic', path: 'westernhomescreen.m4a' },
        { type: 'audio', key: 'bgMusic', path: 'westernbackground.m4a' },
        { type: 'audio', key: 'dynamiteShoot', path: 'dynamite.m4a' },
        { type: 'audio', key: 'explosion', path: 'explosion.m4a' },
        { type: 'image', key: 'cowboy', path: 'westerncowboy.png' },
        { type: 'image', key: 'hotel', path: 'westernhotel.png' },
        { type: 'image', key: 'coin', path: 'westerncoin.png' },
        { type: 'image', key: 'dynamite', path: 'westerndynamite.png' },
        { type: 'image', key: 'enemy', path: 'westernboss.png' },
        { type: 'image', key: 'explosion', path: 'westernexplosion.png' }
      ];

      // Asset loading event listeners
      this.load.on('filecomplete', (key) => console.log(`Asset loaded: ${key}`));
      this.load.on('fileerror', (file) => console.error(`Failed to load asset: ${file.key} - Check path: assets/${file.type}/${file.src}`));
    }

    create() {
      // Stop background music if playing
      if (gameState.bgMusic && gameState.bgMusic.isPlaying) {
        gameState.bgMusic.stop();
      }

      // Play homescreen music
      if (!gameState.homeMusic) {
        gameState.homeMusic = this.sound.add('homeMusic', { loop: true });
      }
      gameState.homeMusic.play();

      // Background (solid color as placeholder)
      this.add.rectangle(400, 300, 800, 600, 0x87CEEB);

      // Title and buttons
      this.add.text(400, 200, 'Cowboy Dynamite', {
        fontSize: '48px',
        color: '#000',
        fontFamily: 'Arial'
      }).setOrigin(0.5);

      const startButton = this.add.text(400, 300, 'Start Game', {
        fontSize: '32px',
        color: '#000',
        backgroundColor: '#fff',
        padding: { x: 10, y: 5 }
      }).setOrigin(0.5).setInteractive();

      const shopButton = this.add.text(400, 400, 'Shop', {
        fontSize: '32px',
        color: '#000',
        backgroundColor: '#fff',
        padding: { x: 10, y: 5 }
      }).setOrigin(0.5).setInteractive();

      // High score and coins display
      this.add.text(400, 500, `High Score: ${gameState.highScore} | Coins: ${gameState.coins}`, {
        fontSize: '24px',
        color: '#000'
      }).setOrigin(0.5);

      // Button interactions
      startButton.on('pointerdown', () => {
        gameState.homeMusic.stop();
        this.scene.start('GameScene');
      });

      shopButton.on('pointerdown', () => {
        gameState.homeMusic.stop();
        this.scene.start('ShopScene');
      });

      // Debug: Log to ensure scene loads
      console.log('HomeScene loaded successfully');
    }
  }

  // ShopScene: The shop interface
  class ShopScene extends Phaser.Scene {
    constructor() {
      super('ShopScene');
    }

    create() {
      // Background (solid color as placeholder)
      this.add.rectangle(400, 300, 800, 600, 0x87CEEB);

      // Title
      this.add.text(400, 100, 'Shop', {
        fontSize: '48px',
        color: '#000'
      }).setOrigin(0.5);

      const items = [
        { name: 'Big Dynamite', cost: 50, key: 'bigDynamite' },
        { name: 'Speed Boots', cost: 30, key: 'speedBoots' }
      ];

      items.forEach((item, index) => {
        const y = 200 + index * 100;
        this.add.text(300, y, `${item.name} - ${item.cost} Coins`, {
          fontSize: '24px',
          color: '#000'
        }).setOrigin(0.5);

        const buyButton = this.add.text(500, y, gameState.upgrades[item.key] ? 'Owned' : 'Buy', {
          fontSize: '24px',
          color: '#000',
          backgroundColor: '#fff',
          padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

        if (!gameState.upgrades[item.key]) {
          buyButton.on('pointerdown', () => {
            if (gameState.coins >= item.cost) {
              gameState.coins -= item.cost;
              gameState.upgrades[item.key] = true;
              buyButton.setText('Owned');
              localStorage.setItem('coins', gameState.coins);
              localStorage.setItem('upgrades', JSON.stringify(gameState.upgrades));
            } else {
              const notEnoughText = this.add.text(400, 500, 'Not enough coins!', {
                fontSize: '20px',
                color: '#f00'
              }).setOrigin(0.5).setDepth(1);
              this.time.delayedCall(2000, () => notEnoughText.destroy());
            }
          });

          buyButton.on('pointerover', () => buyButton.setStyle({ color: '#ff0' }));
          buyButton.on('pointerout', () => buyButton.setStyle({ color: '#000' }));
        }
      });

      const backButton = this.add.text(400, 500, 'Back', {
        fontSize: '32px',
        color: '#000',
        backgroundColor: '#fff',
        padding: { x: 10, y: 5 }
      }).setOrigin(0.5).setInteractive();

      backButton.on('pointerdown', () => {
        this.scene.start('HomeScene');
        if (gameState.homeMusic) {
          gameState.homeMusic.play();
        }
      });
      backButton.on('pointerover', () => backButton.setStyle({ color: '#ff0' }));
      backButton.on('pointerout', () => backButton.setStyle({ color: '#000' }));

      // Debug: Log to ensure scene loads
      console.log('ShopScene loaded successfully');
    }
  }

  // GameScene: The main gameplay
  class GameScene extends Phaser.Scene {
    constructor() {
      super('GameScene');
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
      this.worldWidth = 1600; // Larger world for exploration
      this.worldHeight = 1200;

      // Set world bounds
      this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

      // Player (cowboy sprite)
      this.cowboy = this.physics.add.sprite(400, 500, 'cowboy').setScale(1);
      this.cowboy.setCollideWorldBounds(true);
      this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
      this.cameras.main.startFollow(this.cowboy, true);

      // Groups for game objects
      this.buildings = this.physics.add.staticGroup();
      this.enemies = this.physics.add.group();
      this.dynamites = this.physics.add.group();
      this.coins = this.physics.add.group();

      // Initial static hotels
      this.spawnHotel();

      // Enemy and hotel spawn timers (random encounters)
      this.time.addEvent({
        delay: Phaser.Math.Between(10000, 20000), // Random 10-20 seconds for hotels
        callback: this.spawnHotel,
        callbackScope: this,
        loop: true
      });

      this.time.addEvent({
        delay: Phaser.Math.Between(20000, 30000), // Random 20-30 seconds for bosses
        callback: this.spawnEnemy,
        callbackScope: this,
        loop: true
      });

      // Input for movement, dynamite, and pause
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.throwCharge = 0;
      this.aimDirection = { x: 0, y: -1 }; // Default aim upward
      this.input.keyboard.on('keydown-ESC', this.togglePause, this);

      // HUD
      this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', color: '#000' });
      this.coinsText = this.add.text(10, 40, 'Coins: 0', { fontSize: '20px', color: '#000' });
      this.healthText = this.add.text(10, 70, 'Health: ♥♥♥', { fontSize: '20px', color: '#000' });

      // Collisions
      this.physics.add.overlap(this.cowboy, this.enemies, this.takeDamage, null, this);
      this.physics.add.overlap(this.dynamites, this.enemies, this.killEnemy, null, this);
      this.physics.add.overlap(this.dynamites, this.buildings, this.explodeDynamite, null, this);
      this.physics.add.overlap(this.cowboy, this.coins, this.collectCoin, null, this);

      // Error handling for assets
      this.load.on('fileerror', (file) => console.error(`Failed to load asset: ${file.key} - Check path: assets/${file.type}/${file.src}`));

      // Debug: Log to ensure scene loads
      console.log('GameScene loaded successfully');
    }

    update() {
      try {
        if (this.paused) return;

        // Player movement (explore the world)
        const baseSpeed = gameState.upgrades.speedBoots ? 200 : 160;
        const speed = this.bonusActive ? baseSpeed * 1.5 : baseSpeed;
        this.cowboy.setVelocity(0);
        if (this.cursors.left.isDown) this.cowboy.setVelocityX(-speed);
        if (this.cursors.right.isDown) this.cowboy.setVelocityX(speed);
        if (this.cursors.up.isDown) this.cowboy.setVelocityY(-speed);
        if (this.cursors.down.isDown) this.cowboy.setVelocityY(speed);

        // Dynamite aiming (while holding spacebar)
        if (this.spaceKey.isDown) {
          this.throwCharge = Math.min(this.throwCharge + 0.02, 1);
          // Update aim direction based on arrow keys
          if (this.cursors.left.isDown) this.aimDirection = { x: -1, y: 0 }; // Left
          else if (this.cursors.right.isDown) this.aimDirection = { x: 1, y: 0 }; // Right
          else if (this.cursors.up.isDown) this.aimDirection = { x: 0, y: -1 }; // Up
          else if (this.cursors.down.isDown) this.aimDirection = { x: 0, y: 1 }; // Down
        } else if (Phaser.Input.Keyboard.JustUp(this.spaceKey)) {
          this.throwDynamite();
          this.sound.play('dynamiteShoot'); // Sound for dynamite shooting
          this.throwCharge = 0;
          this.aimDirection = { x: 0, y: -1 }; // Reset to default (up)
        }
      } catch (error) {
        console.error('Update error:', error);
      }
    }

    spawnHotel() {
      try {
        const x = Phaser.Math.Between(0, this.worldWidth - 50);
        const y = 500; // Ground level
        const hotel = this.buildings.create(x, y, 'hotel').setOrigin(0.5, 1);
        hotel.setImmovable(true);
        hotel.health = Phaser.Math.Between(1, 3); // 1-3 hits to destroy
      } catch (error) {
        console.error('Hotel spawn error:', error);
      }
    }

    spawnEnemy() {
      try {
        const x = Phaser.Math.Between(0, this.worldWidth - 50);
        const y = 50; // Spawn from top
        const enemy = this.enemies.create(x, y, 'enemy').setScale(2);
        enemy.setVelocityY(100); // Moves downward
      } catch (error) {
        console.error('Enemy spawn error:', error);
      }
    }

    throwDynamite() {
      try {
        const baseStrength = this.bonusActive ? 300 : 200;
        const throwStrength = baseStrength + this.throwCharge * (this.bonusActive ? 300 : 200);
        const dynamite = this.dynamites.create(this.cowboy.x, this.cowboy.y - 20, 'dynamite').setScale(0.5);
        dynamite.setVelocity(this.aimDirection.x * throwStrength, this.aimDirection.y * throwStrength);
        this.physics.world.wrap(dynamite, 0); // Optional: Wrap dynamite around world bounds
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
        building.health--;
        if (building.health <= 0) {
          const explosion = this.add.sprite(building.x, building.y, 'explosion').setScale(1);
          this.sound.play('explosion'); // Sound for explosion
          this.time.delayedCall(300, () => explosion.destroy());

          building.destroy();
          const coin = this.coins.create(building.x, building.y - 20, 'coin').setScale(0.5);
          coin.setVelocityY(-100);
          this.physics.world.wrap(coin, 0); // Optional: Wrap coin around world bounds
        }
      } catch (error) {
        console.error('Explosion error:', error);
      }
    }

    collectCoin(cowboy, coin) {
      try {
        coin.destroy();
        gameState.coins++;
        this.coinsText.setText(`Coins: ${gameState.coins}`);
      } catch (error) {
        console.error('Coin collection error:', error);
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
    scene: [HomeScene, ShopScene, GameScene]
  };

  // Initialize the game (last, after all definitions)
  const game = new Phaser.Game(config);

  // Debug: Log game initialization
  console.log('Game initialized successfully');
});
