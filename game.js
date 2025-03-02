document.addEventListener('DOMContentLoaded', () => {
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

  class HomeScene extends Phaser.Scene {
    constructor() { super('HomeScene'); }
    preload() {
      this.load.audio('homeMusic', 'westernhomescreen.m4a');
      this.load.audio('bgMusic', 'westernbackground.m4a');
      this.load.audio('dynamiteShoot', 'dynamite.m4a');
      this.load.audio('explosion', 'explosion.m4a');
      this.load.image('cowboy', 'westerncowboy.png');
      this.load.image('hotel', 'westernhotel.png');
      this.load.image('coin', 'westerncoin.png');
      this.load.image('dynamite', 'westerndynamite.png');
      this.load.image('enemy', 'westernboss.png');
      this.load.image('explosion', 'westernexplosion.png');
    }
    create() {
      if (gameState.bgMusic && gameState.bgMusic.isPlaying) gameState.bgMusic.stop();
      if (!gameState.homeMusic) gameState.homeMusic = this.sound.add('homeMusic', { loop: true, volume: 0.3 });
      gameState.homeMusic.play();

      this.add.rectangle(400, 300, 800, 600, 0x87CEEB);
      this.add.text(400, 200, 'Cowboy Dynamite', { fontSize: '48px', color: '#000' }).setOrigin(0.5);

      const startButton = this.add.text(400, 300, 'Start Game', { fontSize: '32px', color: '#000', backgroundColor: '#fff', padding: { x: 10, y: 5 } }).setOrigin(0.5).setInteractive();
      const shopButton = this.add.text(400, 400, 'Shop', { fontSize: '32px', color: '#000', backgroundColor: '#fff', padding: { x: 10, y: 5 } }).setOrigin(0.5).setInteractive();

      this.add.text(400, 500, `High Score: ${gameState.highScore} | Coins: ${gameState.coins}`, { fontSize: '24px', color: '#000' }).setOrigin(0.5);

      startButton.on('pointerdown', () => { gameState.homeMusic.stop(); this.scene.start('GameScene'); });
      shopButton.on('pointerdown', () => { gameState.homeMusic.stop(); this.scene.start('ShopScene'); });
      startButton.on('pointerover', () => startButton.setStyle({ color: '#ff0' }));
      startButton.on('pointerout', () => startButton.setStyle({ color: '#000' }));
      shopButton.on('pointerover', () => shopButton.setStyle({ color: '#ff0' }));
      shopButton.on('pointerout', () => shopButton.setStyle({ color: '#000' }));
    }
  }

  class ShopScene extends Phaser.Scene {
    constructor() { super('ShopScene'); }
    create() {
      this.add.rectangle(400, 300, 800, 600, 0x87CEEB);
      this.add.text(400, 100, 'Shop', { fontSize: '48px', color: '#000' }).setOrigin(0.5);

      const items = [
        { name: 'Big Dynamite', cost: 50, key: 'bigDynamite' },
        { name: 'Speed Boots', cost: 30, key: 'speedBoots' }
      ];

      items.forEach((item, index) => {
        const y = 200 + index * 100;
        this.add.text(300, y, `${item.name} - ${item.cost} Coins`, { fontSize: '24px', color: '#000' }).setOrigin(0.5);
        const buyButton = this.add.text(500, y, gameState.upgrades[item.key] ? 'Owned' : 'Buy', { fontSize: '24px', color: '#000', backgroundColor: '#fff', padding: { x: 10, y: 5 } }).setOrigin(0.5).setInteractive();

        if (!gameState.upgrades[item.key]) {
          buyButton.on('pointerdown', () => {
            if (gameState.coins >= item.cost) {
              gameState.coins -= item.cost;
              gameState.upgrades[item.key] = true;
              buyButton.setText('Owned');
              localStorage.setItem('coins', gameState.coins);
              localStorage.setItem('upgrades', JSON.stringify(gameState.upgrades));
            }
          });
        }
        buyButton.on('pointerover', () => buyButton.setStyle({ color: '#ff0' }));
        buyButton.on('pointerout', () => buyButton.setStyle({ color: '#000' }));
      });

      const backButton = this.add.text(400, 500, 'Back', { fontSize: '32px', color: '#000', backgroundColor: '#fff', padding: { x: 10, y: 5 } }).setOrigin(0.5).setInteractive();
      backButton.on('pointerdown', () => { this.scene.start('HomeScene'); if (gameState.homeMusic) gameState.homeMusic.play(); });
      backButton.on('pointerover', () => backButton.setStyle({ color: '#ff0' }));
      backButton.on('pointerout', () => backButton.setStyle({ color: '#000' }));
    }
  }

  class GameScene extends Phaser.Scene {
    constructor() {
      super('GameScene');
      this.score = 0;
      this.paused = false;
      this.isBossActive = false; // Track if a boss is active
    }
    create() {
      if (gameState.homeMusic && gameState.homeMusic.isPlaying) gameState.homeMusic.stop();
      if (!gameState.bgMusic) gameState.bgMusic = this.sound.add('bgMusic', { loop: true, volume: 0.3 });
      gameState.bgMusic.play();

      this.health = 3;
      this.worldWidth = 1600;
      this.worldHeight = 1200;

      this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
      this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0xF4A261);

      this.cowboy = this.physics.add.sprite(400, 500, 'cowboy').setScale(1);
      this.cowboy.setCollideWorldBounds(true);
      this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
      this.cameras.main.startFollow(this.cowboy, true);

      this.enemies = this.physics.add.group();
      this.dynamites = this.physics.add.group();
      this.bossProjectiles = this.physics.add.group(); // Group for boss projectiles

      // Spawn the first boss immediately
      this.spawnEnemy();

      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.throwCharge = 0;
      this.aimDirection = { x: 0, y: -1 };
      this.input.keyboard.on('keydown-ESC', this.togglePause, this);

      this.scoreText = this.add.text(10, 10, `Score: ${this.score}`, { fontSize: '20px', color: '#000' }).setScrollFactor(0);
      this.coinsText = this.add.text(10, 40, `Coins: ${gameState.coins}`, { fontSize: '20px', color: '#000' }).setScrollFactor(0);
      this.healthText = this.add.text(10, 70, `Health: ${'♥'.repeat(this.health)}`, { fontSize: '20px', color: '#000' }).setScrollFactor(0);

      this.physics.add.overlap(this.dynamites, this.enemies, this.killEnemy, null, this);
      this.physics.add.overlap(this.cowboy, this.bossProjectiles, this.hitByProjectile, null, this); // Player hit by boss projectiles
    }
    update() {
      if (this.paused) return;
      const speed = gameState.upgrades.speedBoots ? 200 : 160;
      this.cowboy.setVelocity(0);
      if (this.cursors.left.isDown) this.cowboy.setVelocityX(-speed);
      else if (this.cursors.right.isDown) this.cowboy.setVelocityX(speed);
      if (this.cursors.up.isDown) this.cowboy.setVelocityY(-speed);
      else if (this.cursors.down.isDown) this.cowboy.setVelocityY(speed);

      if (this.spaceKey.isDown) {
        this.throwCharge = Math.min(this.throwCharge + 0.02, 1);
        if (this.cursors.left.isDown) this.aimDirection = { x: -1, y: 0 };
        else if (this.cursors.right.isDown) this.aimDirection = { x: 1, y: 0 };
        else if (this.cursors.up.isDown) this.aimDirection = { x: 0, y: -1 };
        else if (this.cursors.down.isDown) this.aimDirection = { x: 0, y: 1 };
      } else if (Phaser.Input.Keyboard.JustUp(this.spaceKey)) {
        this.throwDynamite();
        this.sound.play('dynamiteShoot', { volume: 0.8 });
        this.throwCharge = 0;
        this.aimDirection = { x: 0, y: -1 };
      }

      // Update health display
      this.healthText.setText(`Health: ${'♥'.repeat(this.health)}`);
    }
    spawnEnemy() {
      if (!this.isBossActive) {
        const x = Phaser.Math.Between(0, this.worldWidth - 50);
        const y = Phaser.Math.Between(50, this.worldHeight - 50); // Random y-position for variety
        const enemy = this.enemies.create(x, y, 'enemy').setScale(1);
        enemy.health = 5;
        this.isBossActive = true;
        // Boss shoots projectiles every 2 seconds
        this.time.addEvent({ delay: 2000, callback: () => this.shootProjectile(enemy), callbackScope: this, loop: true });
      }
    }
    shootProjectile(enemy) {
      if (enemy && enemy.active) { // Ensure enemy exists before shooting
        const projectile = this.bossProjectiles.create(enemy.x, enemy.y, 'dynamite').setScale(0.3);
        this.physics.moveToObject(projectile, this.cowboy, 200);
      }
    }
    throwDynamite() {
      const throwStrength = 200 + this.throwCharge * 200;
      const dynamite = this.dynamites.create(this.cowboy.x, this.cowboy.y - 20, 'dynamite').setScale(0.5);
      dynamite.setVelocity(this.aimDirection.x * throwStrength, this.aimDirection.y * throwStrength);
    }
    killEnemy(dynamite, enemy) {
      dynamite.destroy();
      enemy.health--;
      if (enemy.health <= 0) {
        enemy.destroy();
        this.score += 10;
        this.scoreText.setText(`Score: ${this.score}`);
        this.isBossActive = false;
        this.spawnEnemy(); // Immediately spawn a new boss
      }
    }
    hitByProjectile(cowboy, projectile) {
      projectile.destroy();
      this.health--;
      if (this.health <= 0) this.gameOver();
    }
    gameOver() {
      gameState.bgMusic.pause();
      this.add.text(400, 250, 'Game Over', { fontSize: '48px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0);
      const backButton = this.add.text(400, 350, 'Back to Home', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setInteractive();
      backButton.on('pointerdown', () => { gameState.bgMusic.stop(); this.scene.start('HomeScene'); });
    }
    togglePause() {
      if (!this.paused) {
        this.physics.pause();
        this.paused = true;
        if (gameState.bgMusic && gameState.bgMusic.isPlaying) gameState.bgMusic.pause();
        this.showPauseMenu();
      } else {
        this.physics.resume();
        this.paused = false;
        if (gameState.bgMusic) gameState.bgMusic.resume();
        this.hidePauseMenu();
      }
    }
    showPauseMenu() {
      this.pauseOverlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.5).setScrollFactor(0);
      this.pauseText = this.add.text(400, 300, 'Paused', { fontSize: '48px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0);
    }
    hidePauseMenu() {
      if (this.pauseOverlay) this.pauseOverlay.destroy();
      if (this.pauseText) this.pauseText.destroy();
    }
  }

  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
    scene: [HomeScene, ShopScene, GameScene]
  };

  new Phaser.Game(config);
});
