// Planet Spixi - Advanced Run & Gun Game
// Copyright (C) 2025 Baracuda

// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PLAYER_WIDTH = 24;
const PLAYER_HEIGHT = 32;
const PLAYER_SPEED = 3;
const JUMP_POWER = 12;
const GRAVITY = 0.5;
const BULLET_SPEED = 8;
const ENEMY_SPEED = 1.5;
const FPS = 60;
const NETWORK_UPDATE_RATE = 20;

// Directions for 8-way movement
const DIRECTIONS = {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 },
    UP_LEFT: { x: -0.707, y: -0.707 },
    UP_RIGHT: { x: 0.707, y: -0.707 },
    DOWN_LEFT: { x: -0.707, y: 0.707 },
    DOWN_RIGHT: { x: 0.707, y: 0.707 }
};

// Game State
const gameState = {
    sessionId: null,
    localAddress: null,
    remoteAddress: null,
    connectionEstablished: false,
    isHost: false,
    isSinglePlayer: true,
    
    gameStarted: false,
    wave: 1,
    score: 0,
    cameraX: 0,
    
    localPlayer: null,
    remotePlayer: null,
    aiPlayer: null,
    
    bullets: [],
    enemies: [],
    enemyBullets: [],
    platforms: [],
    obstacles: [],
    
    keys: {},
    analogInput: { x: 0, y: 0 },
    lastNetworkUpdate: 0,
    frameCount: 0
};

// UI Elements
const elements = {
    menuBtn: document.getElementById('menuBtn'),
    exitBtn: document.getElementById('exitBtn'),
    closeMenuBtn: document.getElementById('closeMenuBtn'),
    sideMenu: document.getElementById('sideMenu'),
    menuOverlay: document.getElementById('menuOverlay'),
    statusText: document.getElementById('statusText'),
    connectionStatus: document.getElementById('connectionStatus'),
    waitingScreen: document.getElementById('waitingScreen'),
    gameHud: document.getElementById('gameHud'),
    canvas: document.getElementById('gameCanvas'),
    gameOver: document.getElementById('gameOver'),
    gameOverTitle: document.getElementById('gameOverTitle'),
    gameOverText: document.getElementById('gameOverText'),
    restartBtn: document.getElementById('restartBtn'),
    p1Health: document.getElementById('p1Health'),
    p2Health: document.getElementById('p2Health'),
    p1Score: document.getElementById('p1Score'),
    p2Score: document.getElementById('p2Score'),
    waveText: document.getElementById('waveText'),
    analogStick: document.getElementById('analogStick'),
    analogKnob: document.getElementById('analogStick').querySelector('.analog-knob'),
    shootBtn: document.getElementById('shootBtn'),
    jumpBtn: document.getElementById('jumpBtn')
};

const ctx = elements.canvas.getContext('2d');
elements.canvas.width = CANVAS_WIDTH;
elements.canvas.height = CANVAS_HEIGHT;

// Player class
class Player {
    constructor(x, y, color, isLocal = false, isAI = false) {
        this.x = x;
        this.y = y;
        this.width = PLAYER_WIDTH;
        this.height = PLAYER_HEIGHT;
        this.color = color;
        this.isLocal = isLocal;
        this.isAI = isAI;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.onGround = false;
        this.health = 100;
        this.score = 0;
        this.lastShot = 0;
        this.facing = DIRECTIONS.RIGHT;
        this.shootCooldown = 200; // ms
    }
    
    update(deltaTime) {
        if (this.isAI) {
            this.updateAI();
        } else if (this.isLocal) {
            this.updateLocal();
        }
        
        // Apply gravity
        if (!this.onGround) {
            this.velocityY += GRAVITY;
        }
        
        // Update position
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Check platform collisions
        this.checkPlatformCollisions();
        
        // Keep in bounds
        if (this.x < 0) this.x = 0;
        if (this.x > CANVAS_WIDTH - this.width) this.x = CANVAS_WIDTH - this.width;
        
        // Ground collision
        if (this.y >= CANVAS_HEIGHT - 60 - this.height) {
            this.y = CANVAS_HEIGHT - 60 - this.height;
            this.velocityY = 0;
            this.onGround = true;
            this.isJumping = false;
        } else {
            this.onGround = false;
        }
    }
    
    updateLocal() {
        // Analog stick input
        const inputX = gameState.analogInput.x;
        const inputY = gameState.analogInput.y;
        
        // Determine facing direction
        if (Math.abs(inputX) > 0.1 || Math.abs(inputY) > 0.1) {
            this.facing = this.getDirectionFromInput(inputX, inputY);
        }
        
        // Movement
        this.velocityX = inputX * PLAYER_SPEED;
        
        // Jump
        if (gameState.keys.jump && this.onGround && !this.isJumping) {
            this.velocityY = -JUMP_POWER;
            this.isJumping = true;
            this.onGround = false;
        }
        
        // Shooting
        if (gameState.keys.shoot && Date.now() - this.lastShot > this.shootCooldown) {
            this.shoot();
            this.lastShot = Date.now();
        }
    }
    
    updateAI() {
        // Simple AI: move towards nearest enemy or right
        const nearestEnemy = this.findNearestEnemy();
        
        if (nearestEnemy) {
            const dx = nearestEnemy.x - this.x;
            const dy = nearestEnemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 100) {
                this.velocityX = (dx / dist) * PLAYER_SPEED * 0.5;
            } else {
                this.velocityX = 0;
            }
            
            // Face enemy
            this.facing = this.getDirectionFromInput(dx / dist, dy / dist);
            
            // Shoot at enemy
            if (Date.now() - this.lastShot > this.shootCooldown * 2) {
                this.shoot();
                this.lastShot = Date.now();
            }
        } else {
            // Move right
            this.velocityX = PLAYER_SPEED * 0.3;
            this.facing = DIRECTIONS.RIGHT;
        }
        
        // Random jump
        if (this.onGround && Math.random() < 0.01) {
            this.velocityY = -JUMP_POWER;
            this.isJumping = true;
            this.onGround = false;
        }
    }
    
    getDirectionFromInput(x, y) {
        const angle = Math.atan2(y, x);
        const degrees = (angle * 180) / Math.PI;
        
        if (degrees >= -22.5 && degrees < 22.5) return DIRECTIONS.RIGHT;
        if (degrees >= 22.5 && degrees < 67.5) return DIRECTIONS.DOWN_RIGHT;
        if (degrees >= 67.5 && degrees < 112.5) return DIRECTIONS.DOWN;
        if (degrees >= 112.5 && degrees < 157.5) return DIRECTIONS.DOWN_LEFT;
        if (degrees >= 157.5 || degrees < -157.5) return DIRECTIONS.LEFT;
        if (degrees >= -157.5 && degrees < -112.5) return DIRECTIONS.UP_LEFT;
        if (degrees >= -112.5 && degrees < -67.5) return DIRECTIONS.UP;
        if (degrees >= -67.5 && degrees < -22.5) return DIRECTIONS.UP_RIGHT;
        
        return DIRECTIONS.RIGHT;
    }
    
    findNearestEnemy() {
        let nearest = null;
        let minDist = Infinity;
        
        gameState.enemies.forEach(enemy => {
            const dist = Math.sqrt((enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        });
        
        return nearest;
    }
    
    checkPlatformCollisions() {
        this.onGround = false;
        
        gameState.platforms.forEach(platform => {
            if (this.x < platform.x + platform.width &&
                this.x + this.width > platform.x &&
                this.y + this.height > platform.y &&
                this.y < platform.y + platform.height) {
                
                // Landing on top
                if (this.velocityY > 0 && this.y < platform.y) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.onGround = true;
                    this.isJumping = false;
                }
                // Hitting from below
                else if (this.velocityY < 0 && this.y > platform.y) {
                    this.y = platform.y + platform.height;
                    this.velocityY = 0;
                }
            }
        });
    }
    
    shoot() {
        gameState.bullets.push({
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            velocityX: this.facing.x * BULLET_SPEED,
            velocityY: this.facing.y * BULLET_SPEED,
            owner: this.isLocal ? 'local' : (this.isAI ? 'ai' : 'remote')
        });
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        return this.health <= 0;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw gun direction
        const gunLength = 12;
        const gunX = this.x + this.width / 2 + this.facing.x * gunLength;
        const gunY = this.y + this.height / 2 + this.facing.y * gunLength;
        
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
        ctx.lineTo(gunX, gunY);
        ctx.stroke();
        
        // Gun tip
        ctx.fillStyle = '#999';
        ctx.fillRect(gunX - 2, gunY - 2, 4, 4);
    }
}

// Initialize Spixi SDK
SpixiAppSdk.onInit = function(sessionId, userAddresses) {
    gameState.sessionId = sessionId;
    
    const addresses = userAddresses.split(',');
    gameState.remoteAddress = addresses[0]?.trim();
    
    console.log('Initialized - Session ID:', sessionId);
    updateStatus('Connected', true);
    
    // Start single player mode
    gameState.isSinglePlayer = true;
    initGame();
};

// Network data handling
SpixiAppSdk.onNetworkData = function(data) {
    try {
        const message = JSON.parse(data);
        
        switch (message.action) {
            case 'playerState':
                if (gameState.remotePlayer) {
                    gameState.remotePlayer.x = message.x;
                    gameState.remotePlayer.y = message.y;
                    gameState.remotePlayer.health = message.health;
                    gameState.remotePlayer.facing = message.facing;
                }
                break;
                
            case 'shoot':
                if (gameState.remotePlayer) {
                    gameState.remotePlayer.shoot();
                }
                break;
                
            case 'joinGame':
                // Second player joined
                gameState.isSinglePlayer = false;
                gameState.remotePlayer = new Player(200, CANVAS_HEIGHT - 60 - PLAYER_HEIGHT, '#3030ff', false, false);
                elements.waitingScreen.style.display = 'none';
                updateStatus('Multiplayer Mode', true);
                break;
        }
    } catch (e) {
        console.error('Error parsing network data:', e);
    }
};

function sendNetworkMessage(message) {
    if (gameState.remoteAddress) {
        SpixiAppSdk.sendNetworkData(JSON.stringify(message));
    }
}

function updateStatus(text, connected = false) {
    elements.statusText.textContent = text;
    elements.connectionStatus.classList.toggle('connected', connected);
}

// Game initialization
function initGame() {
    // Create local player
    gameState.localPlayer = new Player(100, CANVAS_HEIGHT - 60 - PLAYER_HEIGHT, '#ff3030', true, false);
    
    // Create AI player for single player
    gameState.aiPlayer = new Player(150, CANVAS_HEIGHT - 60 - PLAYER_HEIGHT, '#00ff00', false, true);
    
    gameState.gameStarted = true;
    
    // Generate initial level
    generateLevel();
    
    // Start game loop
    setInterval(gameLoop, 1000 / FPS);
    setInterval(sendPlayerState, 1000 / NETWORK_UPDATE_RATE);
    
    console.log('Game started');
}

function generateLevel() {
    gameState.platforms = [];
    gameState.obstacles = [];
    
    // Generate platforms
    for (let i = 0; i < 20; i++) {
        const x = i * 200 + Math.random() * 100;
        const y = CANVAS_HEIGHT - 100 - Math.random() * 100;
        const width = 80 + Math.random() * 120;
        const height = 20;
        
        gameState.platforms.push({
            x: x,
            y: y,
            width: width,
            height: height
        });
    }
    
    // Generate ramps
    for (let i = 0; i < 10; i++) {
        const x = i * 300 + Math.random() * 200;
        const y = CANVAS_HEIGHT - 80 - Math.random() * 80;
        const width = 100 + Math.random() * 100;
        const height = 40;
        
        gameState.platforms.push({
            x: x,
            y: y,
            width: width,
            height: height,
            isRamp: true
        });
    }
    
    // Generate obstacles
    for (let i = 0; i < 15; i++) {
        const x = i * 150 + Math.random() * 100;
        const y = CANVAS_HEIGHT - 60 - 20;
        const width = 20;
        const height = 20;
        
        gameState.obstacles.push({
            x: x,
            y: y,
            width: width,
            height: height
        });
    }
}

function gameLoop() {
    if (!gameState.gameStarted) return;
    
    gameState.frameCount++;
    
    // Update players
    if (gameState.localPlayer) gameState.localPlayer.update(1/60);
    if (gameState.remotePlayer) gameState.remotePlayer.update(1/60);
    if (gameState.aiPlayer && gameState.isSinglePlayer) gameState.aiPlayer.update(1/60);
    
    // Update bullets
    updateBullets();
    
    // Update enemies
    updateEnemies();
    
    // Update camera
    updateCamera();
    
    // Check collisions
    checkCollisions();
    
    // Render
    render();
    
    // Update HUD
    updateHUD();
    
    // Check game over
    checkGameOver();
}

function updateBullets() {
    gameState.bullets = gameState.bullets.filter(bullet => {
        bullet.x += bullet.velocityX;
        bullet.y += bullet.velocityY;
        return bullet.x > -10 && bullet.x < CANVAS_WIDTH + 10 && 
               bullet.y > -10 && bullet.y < CANVAS_HEIGHT + 10;
    });
    
    gameState.enemyBullets = gameState.enemyBullets.filter(bullet => {
        bullet.x -= bullet.velocityX;
        bullet.y -= bullet.velocityY;
        return bullet.x > 0 && bullet.x < CANVAS_WIDTH;
    });
}

function updateEnemies() {
    // Move enemies
    gameState.enemies.forEach(enemy => {
        enemy.x -= ENEMY_SPEED;
    });
    
    // Remove off-screen enemies
    gameState.enemies = gameState.enemies.filter(enemy => enemy.x > -enemy.width);
    
    // Spawn new enemies
    if (Math.random() < 0.02) {
        spawnEnemy();
    }
}

function spawnEnemy() {
    gameState.enemies.push({
        x: CANVAS_WIDTH + Math.random() * 100,
        y: CANVAS_HEIGHT - 80 - Math.random() * 50,
        width: 28,
        height: 32,
        health: 1
    });
}

function updateCamera() {
    // Simple camera follow
    if (gameState.localPlayer) {
        gameState.cameraX = gameState.localPlayer.x - CANVAS_WIDTH / 2;
        if (gameState.cameraX < 0) gameState.cameraX = 0;
    }
}

function checkCollisions() {
    // Bullets vs enemies
    gameState.bullets.forEach((bullet, bIndex) => {
        gameState.enemies.forEach((enemy, eIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + 4 > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + 2 > enemy.y) {
                
                enemy.health--;
                gameState.bullets.splice(bIndex, 1);
                
                if (enemy.health <= 0) {
                    gameState.enemies.splice(eIndex, 1);
                    
                    if (bullet.owner === 'local') {
                        gameState.localPlayer.score += 100;
                    } else if (bullet.owner === 'ai') {
                        gameState.aiPlayer.score += 100;
                    }
                }
            }
        });
    });
    
    // Enemy bullets vs players
    gameState.enemyBullets.forEach((bullet, bIndex) => {
        if (gameState.localPlayer && checkPlayerHit(gameState.localPlayer, bullet)) {
            gameState.localPlayer.takeDamage(10);
            gameState.enemyBullets.splice(bIndex, 1);
        }
        
        if (gameState.remotePlayer && checkPlayerHit(gameState.remotePlayer, bullet)) {
            gameState.remotePlayer.takeDamage(10);
            gameState.enemyBullets.splice(bIndex, 1);
        }
        
        if (gameState.aiPlayer && gameState.isSinglePlayer && checkPlayerHit(gameState.aiPlayer, bullet)) {
            gameState.aiPlayer.takeDamage(10);
            gameState.enemyBullets.splice(bIndex, 1);
        }
    });
    
    // Players vs obstacles
    [gameState.localPlayer, gameState.remotePlayer, gameState.aiPlayer].forEach(player => {
        if (!player) return;
        
        gameState.obstacles.forEach(obstacle => {
            if (checkPlayerCollision(player, obstacle)) {
                player.takeDamage(5);
            }
        });
    });
}

function checkPlayerHit(player, bullet) {
    return bullet.x < player.x + player.width &&
           bullet.x + 4 > player.x &&
           bullet.y < player.y + player.height &&
           bullet.y + 2 > player.y;
}

function checkPlayerCollision(player, obj) {
    return player.x < obj.x + obj.width &&
           player.x + player.width > obj.x &&
           player.y < obj.y + obj.height &&
           player.y + player.height > obj.y;
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Save context for camera
    ctx.save();
    ctx.translate(-gameState.cameraX, 0);
    
    // Draw ground
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(gameState.cameraX, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 60);
    
    // Draw platforms
    ctx.fillStyle = '#666';
    gameState.platforms.forEach(platform => {
        if (platform.isRamp) {
            // Draw ramp
            ctx.beginPath();
            ctx.moveTo(platform.x, platform.y + platform.height);
            ctx.lineTo(platform.x + platform.width, platform.y);
            ctx.lineTo(platform.x + platform.width, platform.y + platform.height);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        }
    });
    
    // Draw obstacles
    ctx.fillStyle = '#ff0000';
    gameState.obstacles.forEach(obstacle => {
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    });
    
    // Draw players
    if (gameState.localPlayer) gameState.localPlayer.draw();
    if (gameState.remotePlayer) gameState.remotePlayer.draw();
    if (gameState.aiPlayer && gameState.isSinglePlayer) gameState.aiPlayer.draw();
    
    // Draw bullets
    ctx.fillStyle = '#ffff00';
    gameState.bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, 4, 2);
    });
    
    // Draw enemy bullets
    ctx.fillStyle = '#ff0000';
    gameState.enemyBullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, 4, 2);
    });
    
    // Draw enemies
    gameState.enemies.forEach(enemy => {
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Enemy eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.x + 6, enemy.y + 8, 6, 6);
        ctx.fillRect(enemy.x + 16, enemy.y + 8, 6, 6);
    });
    
    // Restore context
    ctx.restore();
}

function updateHUD() {
    if (gameState.localPlayer) {
        const healthPercent = (gameState.localPlayer.health / 100) * 100;
        elements.p1Health.style.width = healthPercent + '%';
        elements.p1Score.textContent = gameState.localPlayer.score;
    }
    
    if (gameState.remotePlayer) {
        const healthPercent = (gameState.remotePlayer.health / 100) * 100;
        elements.p2Health.style.width = healthPercent + '%';
        elements.p2Score.textContent = gameState.remotePlayer.score;
    } else if (gameState.aiPlayer) {
        const healthPercent = (gameState.aiPlayer.health / 100) * 100;
        elements.p2Health.style.width = healthPercent + '%';
        elements.p2Score.textContent = gameState.aiPlayer.score;
    }
    
    elements.waveText.textContent = `WAVE ${gameState.wave}`;
}

function checkGameOver() {
    const players = [gameState.localPlayer, gameState.remotePlayer, gameState.aiPlayer].filter(p => p);
    const alivePlayers = players.filter(p => p.health > 0);
    
    if (alivePlayers.length === 0) {
        gameOver();
    }
}

function gameOver() {
    gameState.gameStarted = false;
    
    elements.gameOver.style.display = 'block';
    elements.gameOverTitle.textContent = 'PLANET DESTROYED';
    elements.gameOverText.textContent = 'All heroes eliminated';
    
    if (gameState.localPlayer) {
        elements.finalP1Score.textContent = gameState.localPlayer.score;
    }
    
    if (gameState.remotePlayer) {
        elements.finalP2Score.textContent = gameState.remotePlayer.score;
    } else if (gameState.aiPlayer) {
        elements.finalP2Score.textContent = gameState.aiPlayer.score;
    }
}

function restartGame() {
    elements.gameOver.style.display = 'none';
    
    gameState.bullets = [];
    gameState.enemies = [];
    gameState.enemyBullets = [];
    gameState.wave = 1;
    gameState.frameCount = 0;
    gameState.cameraX = 0;
    
    if (gameState.localPlayer) {
        gameState.localPlayer.health = 100;
        gameState.localPlayer.score = 0;
        gameState.localPlayer.x = 100;
        gameState.localPlayer.y = CANVAS_HEIGHT - 60 - PLAYER_HEIGHT;
    }
    
    if (gameState.remotePlayer) {
        gameState.remotePlayer.health = 100;
        gameState.remotePlayer.score = 0;
        gameState.remotePlayer.x = 200;
        gameState.remotePlayer.y = CANVAS_HEIGHT - 60 - PLAYER_HEIGHT;
    }
    
    if (gameState.aiPlayer) {
        gameState.aiPlayer.health = 100;
        gameState.aiPlayer.score = 0;
        gameState.aiPlayer.x = 150;
        gameState.aiPlayer.y = CANVAS_HEIGHT - 60 - PLAYER_HEIGHT;
    }
    
    generateLevel();
    gameState.gameStarted = true;
}

function sendPlayerState() {
    if (!gameState.gameStarted || !gameState.localPlayer) return;
    
    sendNetworkMessage({
        action: 'playerState',
        x: Math.round(gameState.localPlayer.x),
        y: Math.round(gameState.localPlayer.y),
        health: gameState.localPlayer.health,
        facing: gameState.localPlayer.facing
    });
}

// Analog stick controls
function initAnalogStick() {
    const stick = elements.analogStick;
    const knob = elements.analogKnob;
    let isDragging = false;
    let startX, startY;
    
    function handleStart(e) {
        isDragging = true;
        const rect = stick.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
        e.preventDefault();
    }
    
    function handleMove(e) {
        if (!isDragging) return;
        
        let clientX, clientY;
        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;
        const maxDistance = 30;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        let normalizedX = deltaX / maxDistance;
        let normalizedY = deltaY / maxDistance;
        
        if (distance > maxDistance) {
            normalizedX = deltaX / distance;
            normalizedY = deltaY / distance;
        }
        
        gameState.analogInput.x = Math.max(-1, Math.min(1, normalizedX));
        gameState.analogInput.y = Math.max(-1, Math.min(1, normalizedY));
        
        // Update knob position
        const knobX = normalizedX * maxDistance;
        const knobY = normalizedY * maxDistance;
        knob.style.transform = `translate(${knobX - 15}px, ${knobY - 15}px)`;
        
        e.preventDefault();
    }
    
    function handleEnd(e) {
        if (isDragging) {
            isDragging = false;
            gameState.analogInput.x = 0;
            gameState.analogInput.y = 0;
            knob.style.transform = 'translate(-50%, -50%)';
        }
    }
    
    stick.addEventListener('mousedown', handleStart);
    stick.addEventListener('touchstart', handleStart);
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('touchmove', handleMove);
    
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);
}

// Button controls
elements.shootBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    gameState.keys.shoot = true;
});

elements.shootBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    gameState.keys.shoot = false;
});

elements.shootBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    gameState.keys.shoot = true;
});

elements.shootBtn.addEventListener('mouseup', (e) => {
    e.preventDefault();
    gameState.keys.shoot = false;
});

elements.jumpBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    gameState.keys.jump = true;
});

elements.jumpBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    gameState.keys.jump = false;
});

elements.jumpBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    gameState.keys.jump = true;
});

elements.jumpBtn.addEventListener('mouseup', (e) => {
    e.preventDefault();
    gameState.keys.jump = false;
});

// Menu handlers
elements.menuBtn.addEventListener('click', () => {
    elements.sideMenu.classList.add('open');
    elements.menuOverlay.classList.add('active');
});

elements.closeMenuBtn.addEventListener('click', () => {
    elements.sideMenu.classList.remove('open');
    elements.menuOverlay.classList.remove('active');
});

elements.menuOverlay.addEventListener('click', () => {
    elements.sideMenu.classList.remove('open');
    elements.menuOverlay.classList.remove('active');
});

// Restart button
elements.restartBtn.addEventListener('click', () => {
    restartGame();
});

// Exit button
elements.exitBtn.addEventListener('click', () => {
    SpixiAppSdk.back();
});

// Initialize
window.onload = function() {
    console.log('Planet Spixi loaded');
    initAnalogStick();
    SpixiAppSdk.fireOnLoad();
};