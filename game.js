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
    constructor() {
      super('HomeScene');
    }

    preload() {
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

      assets.forEach(asset => {
        if (asset.type === 'image') this.load.image(asset.key, asset.path);
        else if (asset.type === 'audio') this.load.audio(asset.key, asset.path);
      });
    }

    create() {
      if (gameState.bgMusic && gameState.bgMusic.isPlaying) gameState.bgMusic.stop();
      if (!gameState.homeMusic) gameState.homeMusic = this.sound.add('homeMusic', { loop: true });
      gameState.homeMusic.play();

      this.add.rectangle(400, 300, 800, 600, 0x87CEEB);
      this.add.text(400, 200, 'Cowboy Dynamite', { fontSize: '48px', color: '#000' }).setOrigin(0.5);

      const startButton = this.add.text(400, 300, 'Start Game', {
        fontSize: '32px', color: '#000', backgroundColor: '#fff', padding: { x: 10, y: 5 }
      }).setOrigin(0.5).setInteractive();

      const shopButton = this.add.text(400, 400, 'Shop', {
        fontSize: '32px', color: '#000', backgroundColor: '#fff', padding: { x: 10, y: 5 }
      }).setOrigin(0.5).setInteractive();

      this.add.text(400, 500, `High Score: ${gameState.highScore} | Coins: ${gameState.coins}`, {
        fontSize: '24px', color: '#000'
      }).setOrigin(0.5);

      startButton.on('pointerdown', () => {
        gameState.homeMusic.stop();
        this.scene.start('GameScene');
      });
      shopButton.on('pointerdown', () => {
        gameState.homeMusic.stop();
        this.scene.start('ShopScene');
      });
    }
  }

  class ShopScene extends Phaser.Scene {
    constructor() {
      super('ShopScene');
    }

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
        const buyButton = this.add.text(500, y, gameState.upgrades[item.key] ? 'Owned' : 'Buy', {
          fontSize: '24px', color: '#000', backgroundColor: '#fff', padding: { x: 10, y: 5 }
        }).setOrigin(0.5).setInteractive();

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
      });

      const backButton = this.add.text(400, 500, 'Back', {
        fontSize: '32px', color: '#000', backgroundColor: '#fff', padding: { x: 10, y: 5 }
      }).setOrigin(0.5).setInteractive();

      backButton.on('pointerdown', () => {
        this.scene.start('HomeScene');
        if (gameState.homeMusic) gameState.homeMusic.play();
      });
    }
  }

  class GameScene extends Phaser.Scene {
    constructor() {
      super('GameScene');
    }

    create() {
      if (gameState.homeMusic && gameState.homeMusic.isPlaying) gameState.homeMusic.stop();
      if (!gameState.bgMusic) gameState.bgMusic = this.sound.add('bgMusic', { loop: true });
      gameState.bgMusic.play();

      this.killCounter = 0;
      this.bonusActive = false;
      this.paused = false;
      this.health = 3;
      this.worldWidth = 1600;
      this.worldHeight = 1200;

      this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
      this.add.rectangle(this.worldWidth / 2, this.worldHeight / 2, this.worldWidth, this.worldHeight, 0xF4A261);

      this.cowboy = this.physics.add.sprite(400, 500, 'cowboy').setScale(1);
      this.cowboy.setCollideWorldBounds(true);
      this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
      this.cameras.main.startFollow(this.cowboy, true);

      if (!this.textures.exists('cowboy')) console.error('Cowboy texture not loaded');

      this.buildings = this.physics.add.staticGroup();
      this.enemies = this.physics.add.group();
      this.dynamites = this.physics.add.group();
      this.coins = this.physics.add.group();

      for (let i = 0; i < 5; i++) {
        const x = Phaser.Math.Between(300, 500);
        const y = Phaser.Math.Between(400, 600);
        const hotel = this.buildings.create(x, y, 'hotel').setOrigin(0.5, 1);
        hotel.setImmovable(true);
        hotel.health = Phaser.Math.Between(1, 3);
      }

      this.time.addEvent({ delay: Phaser.Math.Between(10000, 20000), callback: this.spawnHotel, callbackScope: this, loop: true });
      this.time.addEvent({ delay: Phaser.Math.Between(20000, 30000), callback: this.spawnEnemy, callbackScope: this, loop: true });

      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.throwCharge = 0;
      this.aimDirection = { x: 0, y: -1 };
      this.input.keyboard.on('keydown-ESC', this.togglePause, this);

      this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', color: '#000' }).setScrollFactor(0);
      this.coinsText = this.add.text(10, 40, 'Coins: 0', { fontSize: '20px', color: '#000' }).setScrollFactor(0);
      this.healthText = this.add.text(10, 70, 'Health: ♥♥♥', { fontSize: '20px', color: '#000' }).setScrollFactor(0);

      this.physics.add.overlap(this.cowboy, this.enemies, this.takeDamage, null, this);
      this.physics.add.overlap(this.dynamites, this.enemies, this.killEnemy, null, this);
      this.physics.add.overlap(this.dynamites, this.buildings, this.explodeDynamite, null, this);
      this.physics.add.overlap(this.cowboy, this.coins, this.collectCoin, null, this);
    }

    update() {
      try {
        if (this.paused) return;

        const baseSpeed = gameState.upgrades.speedBoots ? 200 : 160;
        const speed = this.bonusActive ? baseSpeed * 1.5 : baseSpeed;
        this.cowboy.setVelocity(0);
        if (this.cursors.left.isDown) this.cowboy.setVelocityX(-speed);
        if (this.cursors.right.isDown) this.cowboy.setVelocityX(speed);
        if (this.cursors.up.isDown) this.cowboy.setVelocityY(-speed);
        if (this.cursors.down.isDown) this.cowboy.setVelocityY(speed);

        if (this.spaceKey.isDown) {
          this.throwCharge = Math.min(this.throwCharge + 0.02, 1);
          if (this.cursors.left.isDown) this.aimDirection = { x: -1, y: 0 };
          else if (this.cursors.right.isDown) this.aimDirection = { x: 1, y: 0 };
          else if (this.cursors.up.isDown) this.aimDirection = { x: 0, y: -1 };
          else if (this.cursors.down.isDown) this.aimDirection = { x: 0, y: 1 };
        } else if (Phaser.Input.Keyboard.JustUp(this.spaceKey)) {
          this.throwDynamite();
          if (this.sound.get('dynamiteShoot')) {
            this.sound.play('dynamiteShoot');
          } else {
            console.error('Audio key "dynamiteShoot" not found');
          }
          this.throwCharge = 0;
          this.aimDirection = { x: 0, y: -1 };
        }
      } catch (error) {
        console.error('Update error:', error);
      }
    }

    spawnHotel() {
      const x = Phaser.Math.Between(0, this.worldWidth - 50);
      const y = Phaser.Math.Between(0, this.worldHeight - 50);
      const hotel = this.buildings.create(x, y, 'hotel').setOrigin(0.5, 1);
      hotel.setImmovable(true);
      hotel.health = Phaser.Math.Between(1, 3);
    }

    spawnEnemy() {
      const x = Phaser.Math.Between(0, this.worldWidth - 50);
      const y = 50;
      const enemy = this.enemies.create(x, y, 'enemy').setScale(2);
      enemy.setVelocityY(100);
    }

    throwDynamite() {
      const baseStrength = this.bonusActive ? 300 : 200;
      const throwStrength = baseStrength + this.throwCharge * (this.bonusActive ? 300 : 200);
      const dynamite = this.dynamites.create(this.cowboy.x, this.cowboy.y - 20, 'dynamite').setScale(0.5);
      dynamite.setVelocity(this.aimDirection.x * throwStrength, this.aimDirection.y * throwStrength);
    }

    killEnemy(dynamite, enemy) {
      dynamite.destroy();
      enemy.destroy();
      this.killCounter++;
      if (this.killCounter >= 10 && !this.bonusActive) this.activateBonus();
    }

    activateBonus() {
      this.bonusActive = true;
      const bonusText = this.add.text(400, 300, 'Gunslinger’s Surge Activated!', {
        fontSize: '32px', color: '#fff'
      }).setOrigin(0.5);
      this.time.delayedCall(3000, () => bonusText.destroy());
    }

    takeDamage(cowboy, enemy) {
      enemy.destroy();
      this.health--;
      if (this.health <= 0) this.gameOver();
    }

    explodeDynamite(dynamite, building) {
      dynamite.destroy();
      building.health--;
      if (building.health <= 0) {
        const explosion = this.add.sprite(building.x, building.y, 'explosion').setScale(1);
        if (this.sound.get('explosion')) this.sound.play('explosion');
        this.time.delayedCall(300, () => explosion.destroy());
        building.destroy();
        const coin = this.coins.create(building.x, building.y - 20, 'coin').setScale(0.5);
        coin.setVelocityY(-100);
      }
    }

    collectCoin(cowboy, coin) {
      coin.destroy();
      gameState.coins++;
      this.coinsText.setText(`Coins: ${gameState.coins}`);
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
      this.pauseBackground = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.5).setScrollFactor(0);
      this.resumeButton = this.add.text(400, 250, 'Resume', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setInteractive();
      this.quitButton = this.add.text(400, 350, 'Quit to Home', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setInteractive();

      this.resumeButton.on('pointerdown', () => this.togglePause());
      this.quitButton.on('pointerdown', () => {
        if (gameState.bgMusic && gameState.bgMusic.isPlaying) gameState.bgMusic.stop();
        this.scene.start('HomeScene');
      });
    }

    hidePauseMenu() {
      if (this.pauseBackground) this.pauseBackground.destroy();
      if (this.resumeButton) this.resumeButton.destroy();
      if (this.quitButton) this.quitButton.destroy();
    }

    gameOver() {
      if (gameState.bgMusic && gameState.bgMusic.isPlaying) gameState.bgMusic.pause();
      const gameOverText = this.add.text(400, 250, 'Game Over', { fontSize: '48px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0);
      const backButton = this.add.text(400, 350, 'Back to Home', { fontSize: '32px', color: '#fff' }).setOrigin(0.5).setScrollFactor(0).setInteractive();

      backButton.on('pointerdown', () => {
        if (gameState.bgMusic) gameState.bgMusic.stop();
        this.scene.start('HomeScene');
      });
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

  const game = new Phaser.Game(config);
});
