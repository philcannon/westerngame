// Global game state
const gameState = {
    coins: parseInt(localStorage.getItem('coins')) || 0,
    highScore: parseInt(localStorage.getItem('highScore')) || 0,
    upgrades: JSON.parse(localStorage.getItem('upgrades')) || {
        bigDynamite: false,
        speedBoots: false
    },
    bgMusic: null,  // Game background music
    homeMusic: null // Home screen music
};

// Define scene classes first to ensure they are available before use
class HomeScene extends Phaser.Scene {
    constructor() {
        super('HomeScene');
    }

    preload() {
        // Load home screen music (replace with your actual audio file)
        this.load.audio('homeMusic', 'westernhomescreen.m4a');
        // Load game background music (already used in GameScene)
        this.load.audio('bgMusic', 'westernbackground.m4a');
    }

    create() {
        // Background (solid color as placeholder)
        this.add.rectangle(400, 300, 800, 600, 0x87CEEB);

        // Title
        this.add.text(400, 200, 'Cowboy Dynamite', {
            fontSize: '48px',
            color: '#000',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Buttons
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

        // Home screen music setup (looping, distinct from game music)
        gameState.homeMusic = this.sound.add('homeMusic', { loop: true });
        gameState.homeMusic.play();

        // Stop home music when starting the game or shop
        startButton.on('pointerdown', () => {
            if (gameState.homeMusic && gameState.homeMusic.isPlaying) {
                gameState.homeMusic.stop();
            }
            // Start game background music when transitioning to GameScene
            gameState.bgMusic = this.sound.add('bgMusic', { loop: true });
            gameState.bgMusic.play();
            this.scene.start('GameScene');
        });

        shopButton.on('pointerdown', () => {
            if (gameState.homeMusic && gameState.homeMusic.isPlaying) {
                gameState.homeMusic.stop();
            }
            this.scene.start('ShopScene');
        });

        startButton.on('pointerover', () => startButton.setStyle({ color: '#ff0' }));
        startButton.on('pointerout', () => startButton.setStyle({ color: '#000' }));

        shopButton.on('pointerover', () => shopButton.setStyle({ color: '#ff0' }));
        shopButton.on('pointerout', () => shopButton.setStyle({ color: '#000' }));
    }
}

class ShopScene extends Phaser.Scene {
    constructor() {
        super('ShopScene');
    }

    create() {
        this.add.rectangle(400, 300, 800, 600, 0x87CEEB);
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
            // Resume home music when returning
            if (gameState.homeMusic) {
                gameState.homeMusic.play();
            }
        });
        backButton.on('pointerover', () => backButton.setStyle({ color: '#ff0' }));
        backButton.on('pointerout', () => backButton.setStyle({ color: '#000' }));
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.score = 0;
        this.coinsCollected = 0;
        this.health = 3;
        this.throwCharge = 0;
        this.isCharging = false;
    }

    preload() {
        // Load game assets (replace with your actual asset paths)
        this.load.image('cowboy', 'westerncowboy.png');
        this.load.image('hotel', 'westernhotel.png');
        this.load.image('dynamite', 'westerndynamite.png');
        this.load.image('coin', 'westserncoin.png');  // Ensure this is a proper image, not a block
        this.load.image('enemy', 'westernboss.png');
        this.load.image('explosion', 'westernexplosion.png');
    }

    create() {
        // Background
        this.add.rectangle(400, 300, 800, 600, 0xF4A261);
        this.ground = this.physics.add.staticGroup();
        this.ground.create(400, 600, 'ground').setScale(40, 1).refreshBody().setVisible(false);

        // Cowboy
        this.cowboy = this.physics.add.sprite(200, 500, 'cowboy')
            .setCollideWorldBounds(true)
            .setBounce(0.2);
        this.physics.add.collider(this.cowboy, this.ground);

        // Groups
        this.buildings = this.physics.add.group();
        this.dynamites = this.physics.add.group();
        this.coins = this.physics.add.group();
        this.enemies = this.physics.add.group();

        // Initial building spawn (random across map)
        this.spawnBuilding();

        // HUD
        this.scoreText = this.add.text(10, 10, 'Score: 0', { fontSize: '20px', color: '#000' });
        this.coinsText = this.add.text(10, 40, 'Coins: 0', { fontSize: '20px', color: '#000' });
        this.dynamiteText = this.add.text(10, 70, 'Dynamite: ∞', { fontSize: '20px', color: '#000' });  // Unlimited dynamite
        this.healthText = this.add.text(10, 100, 'Health: ♥♥♥', { fontSize: '20px', color: '#000' });

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Spawning timers (reduce boss spawn frequency, keep buildings frequent)
        this.time.addEvent({ delay: 5000, callback: this.spawnBuilding, callbackScope: this, loop: true });
        this.time.addEvent({ delay: 15000, callback: this.spawnEnemy, callbackScope: this, loop: true });  // Slower boss spawn

        // Collisions
        this.physics.add.collider(this.buildings, this.ground);
        this.physics.add.collider(this.enemies, this.ground);
        this.physics.add.overlap(this.dynamites, this.buildings, this.explodeDynamite, null, this);
        this.physics.add.overlap(this.cowboy, this.coins, this.collectCoin, null, this);
        this.physics.add.overlap(this.cowboy, this.enemies, this.takeDamage, null, this);

        // Error handling for assets
        this.load.on('fileerror', (file) => console.error(`Failed to load asset: ${file.key}`));
    }

    update() {
        try {
            // Cowboy movement
            const speed = gameState.upgrades.speedBoots ? 200 : 160;
            if (this.cursors.left.isDown) {
                this.cowboy.setVelocityX(-speed);
                this.cowboy.flipX = true;
            } else if (this.cursors.right.isDown) {
                this.cowboy.setVelocityX(speed);
                this.cowboy.flipX = false;
            } else {
                this.cowboy.setVelocityX(0);
            }

            if (this.cursors.up.isDown && this.cowboy.body.touching.down) {
                this.cowboy.setVelocityY(-300);
            }

            // Dynamite throwing (unlimited, no stock decrease)
            if (Phaser.Input.Keyboard.JustDown(this.spacebar)) {
                this.isCharging = true;
                this.throwCharge = 0;
            }

            if (this.isCharging) {
                this.throwCharge += 0.05;
                if (this.throwCharge > 2) this.throwCharge = 2;
            }

            if (Phaser.Input.Keyboard.JustUp(this.spacebar) && this.isCharging) {
                this.isCharging = false;
                this.throwDynamite();
                // No dynamite stock decrease
            }

            // Enemy movement
            this.enemies.getChildren().forEach(enemy => {
                const direction = this.cowboy.x > enemy.x ? 1 : -1;
                enemy.setVelocityX(direction * 100);
            });

        } catch (error) {
            console.error('Game update error:', error);
        }
    }

    throwDynamite() {
        try {
            const dynamite = this.dynamites.create(this.cowboy.x, this.cowboy.y - 20, 'dynamite');
            const throwStrength = 200 + this.throwCharge * 200;
            dynamite.setVelocity(this.cowboy.flipX ? -throwStrength : throwStrength, -300);
            this.physics.add.collider(dynamite, this.ground, () => dynamite.destroy());
        } catch (error) {
            console.error('Dynamite throw error:', error);
        }
    }

    explodeDynamite(dynamite, building) {
        try {
            dynamite.destroy();
            const explosion = this.add.sprite(building.x, building.y, 'explosion').setScale(gameState.upgrades.bigDynamite ? 1.5 : 1);
            this.time.delayedCall(300, () => explosion.destroy());

            building.destroy();
            this.score += 10;
            this.scoreText.setText(`Score: ${this.score}`);

            // Spawn coins
            for (let i = 0; i < 3; i++) {
                const coin = this.coins.create(building.x + Phaser.Math.Between(-20, 20), building.y - 20, 'coin');
                coin.setScale(0.5);  // Adjust coin size to ensure it’s not a block (small sprite)
                coin.setVelocity(Phaser.Math.Between(-100, 100), -200);
                this.physics.add.collider(coin, this.ground);
            }
        } catch (error) {
            console.error('Explosion error:', error);
        }
    }

    collectCoin(cowboy, coin) {
        try {
            coin.destroy();
            this.coinsCollected++;
            this.coinsText.setText(`Coins: ${this.coinsCollected}`);
        } catch (error) {
            console.error('Coin collection error:', error);
        }
    }

    takeDamage(cowboy, enemy) {
        try {
            enemy.destroy();
            this.health--;
            this.healthText.setText(`Health: ${'♥'.repeat(this.health)}`);
            if (this.health <= 0) this.gameOver();
        } catch (error) {
            console.error('Damage error:', error);
        }
    }

    spawnBuilding() {
        try {
            const x = Phaser.Math.Between(0, 800);  // Randomly place hotels across the map (0-800)
            const building = this.buildings.create(x, 500, 'hotel').setOrigin(0.5, 1);  // Static placement on ground
            building.setImmovable(true);
        } catch (error) {
            console.error('Building spawn error:', error);
        }
    }

    spawnEnemy() {
        try {
            const side = Phaser.Math.Between(0, 1) ? 0 : 800;
            const enemy = this.enemies.create(side, 500, 'enemy').setOrigin(0.5, 1);
            enemy.setScale(2);  // Keep boss larger
        } catch (error) {
            console.error('Enemy spawn error:', error);
        }
    }

    gameOver() {
        try {
            // Pause background music instead of stopping, preserving position
            if (gameState.bgMusic && gameState.bgMusic.isPlaying) {
                gameState.bgMusic.pause();
            }

            gameState.coins += this.coinsCollected;
            if (this.score > gameState.highScore) gameState.highScore = this.score;
            localStorage.setItem('coins', gameState.coins);
            localStorage.setItem('highScore', gameState.highScore);

            this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
            this.add.text(400, 250, 'Game Over', { fontSize: '48px', color: '#fff' }).setOrigin(0.5);
            this.add.text(400, 350, `Score: ${this.score}\nCoins Earned: ${this.coinsCollected}`, {
                fontSize: '32px',
                color: '#fff'
            }).setOrigin(0.5);

            const restartButton = this.add.text(400, 450, 'Back to Home', {
                fontSize: '32px',
                color: '#000',
                backgroundColor: '#fff',
                padding: { x: 10, y: 5 }
            }).setOrigin(0.5).setInteractive();

            restartButton.on('pointerdown', () => {
                this.scene.start('HomeScene');
                // Resume game music from paused position when returning to home
                if (gameState.bgMusic) {
                    gameState.bgMusic.resume();
                }
            });
            restartButton.on('pointerover', () => restartButton.setStyle({ color: '#ff0' }));
            restartButton.on('pointerout', () => restartButton.setStyle({ color: '#000' }));

            this.physics.pause();
        } catch (error) {
            console.error('Game over error:', error);
        }
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 500 },
            debug: false
        }
    },
    scene: [HomeScene, ShopScene, GameScene]
};

// Initialize the game
const game = new Phaser.Game(config);
