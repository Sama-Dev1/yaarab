const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1024;
canvas.height = 576;
const worldWidth = 2000; // Enlarged Map

const gravity = 0.7;

// --- OBSTACLES (PLATFORMS) ---
class Platform {
    constructor({ x, y, width, height, color }) {
        this.position = { x, y };
        this.width = width;
        this.height = height;
        this.color = color || '#00f2ff33'; // Semi-transparent glass look
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

        // Neon Border
        ctx.strokeStyle = '#00f2ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
    }
}

const platforms = [
    // Center Arena
    new Platform({ x: 800, y: 400, width: 400, height: 20 }), // Main mid platform
    new Platform({ x: 900, y: 250, width: 200, height: 20 }), // High center

    // Left Side Complex
    new Platform({ x: 200, y: 450, width: 200, height: 20 }),
    new Platform({ x: 50, y: 300, width: 150, height: 20 }), // Sniper perch
    new Platform({ x: 450, y: 300, width: 100, height: 20 }), // Stepping stone

    // Right Side Complex
    new Platform({ x: 1600, y: 450, width: 200, height: 20 }),
    new Platform({ x: 1800, y: 300, width: 150, height: 20 }), // Sniper perch
    new Platform({ x: 1450, y: 300, width: 100, height: 20 }), // Stepping stone

    // Floating Steps
    new Platform({ x: 600, y: 150, width: 100, height: 20, color: '#ff00ff33' }), // High floating
    new Platform({ x: 1300, y: 150, width: 100, height: 20, color: '#ff00ff33' }), // High floating

    // Vertical Cover (Tall thin blocks)
    new Platform({ x: 600, y: 400, width: 20, height: 116 }), // Ground wall left
    new Platform({ x: 1400, y: 400, width: 20, height: 116 }) // Ground wall right
];

// --- MULTIPLAYER SETUP ---
let currentPlayerRole = null; // 'p1' or 'p2'
let connection = null;

try {
    connection = new signalR.HubConnectionBuilder()
        .withUrl("http://localhost:5000/gameHub")
        .build();

    connection.start()
        .then(() => {
            console.log("SignalR Connected.");
            document.getElementById('status').innerText = "Server Online. Choose a Player.";
        })
        .catch(err => {
            console.error(err);
            document.getElementById('status').innerText = "Server Offline (Using Local Mode).";
        });

    connection.on("ReceivePlayerUpdate", (playerName, x, y, isAttacking) => {
        if (currentPlayerRole === playerName) return; // Ignore own echoes

        if (playerName === 'p1') {
            player.position.x = x;
            player.position.y = y;
            if (isAttacking) player.attack();
        } else if (playerName === 'p2') {
            enemy.position.x = x;
            enemy.position.y = y;
            if (isAttacking) enemy.attack();
        }
    });

    connection.on("UpdateHealth", (targetPlayerName, damage) => {
        if (targetPlayerName === 'p1') {
            player.health -= damage;
            document.getElementById('health-p1').style.width = player.health + '%';
        } else {
            enemy.health -= damage;
            document.getElementById('health-p2').style.width = enemy.health + '%';
        }
    });
} catch (e) {
    console.error("SignalR library not loaded or error init", e);
}

// -------------------------

class Projectile {
    constructor({ position, velocity, color }) {
        this.position = position;
        this.velocity = velocity;
        this.radius = 5;
        this.color = color;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.closePath();
        ctx.shadowBlur = 0; // Reset
    }

    update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

class Sprite {
    constructor({ position, velocity, color, offset, type }) {
        this.position = position;
        this.velocity = velocity;
        this.width = 50;
        this.height = 150;
        this.lastKey = '';
        this.attackBox = {
            position: { x: this.position.x, y: this.position.y },
            offset,
            width: 100,
            height: 50
        };
        this.color = color;
        this.type = type; // 'samurai' or 'ninja'
        this.isAttacking = false;
        this.health = 100;
        this.projectiles = [];

        // Animation State
        this.animFrame = 0;
        this.recoil = 0;

        // Physics State
        this.jumps = 0;
        this.framesHold = 0;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;

        // --- PROCEDURAL ANIMATION CALCULATIONS ---
        this.animFrame++;

        // 1. Idle Breathing (Slow Sine Wave)
        let yOffset = Math.sin(this.animFrame * 0.05) * 2;

        // 2. Running Bob (Fast Sine Wave)
        if (this.velocity.x !== 0) {
            yOffset = Math.sin(this.animFrame * 0.2) * 5;
        }

        // 3. Recoil Decay
        if (this.recoil > 0) this.recoil -= 1;

        // Apply offsets
        const drawX = this.position.x + (this.type === 'samurai' ? -this.recoil : this.recoil); // Push back
        const drawY = this.position.y + yOffset;

        // --- DRAWING CHARACTERS ---

        if (this.type === 'samurai') {
            // --- PLAYER 1: HEAVY SAMURAI (Gunner) ---

            // Body (Armored)
            ctx.fillStyle = this.color;
            ctx.fillRect(drawX, drawY, this.width, this.height);

            // Helmet (Bobbing with body)
            ctx.fillStyle = this.color;
            ctx.fillRect(drawX + 5, drawY - 30, 40, 30);

            // Visor
            ctx.fillStyle = '#fff';
            ctx.fillRect(drawX + 10, drawY - 20, 30, 5);

            // ARM CANNON (Gun)
            ctx.fillStyle = '#333';
            ctx.fillRect(drawX + 25 - this.recoil, drawY + 40, 60, 20); // Gun barrel triggers recoil visual
            ctx.fillStyle = this.color;
            ctx.fillRect(drawX + 25, drawY + 40, 10, 20); // Gun mount

        } else if (this.type === 'ninja') {
            // --- PLAYER 2: AGILE NINJA (Sniper) ---

            // Body (Sleek)
            ctx.fillStyle = this.color;
            ctx.fillRect(drawX + 10, drawY + 20, 30, this.height - 20);

            // Head
            ctx.beginPath();
            ctx.arc(drawX + 25, drawY, 20, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();

            // Visor
            ctx.beginPath();
            ctx.moveTo(drawX + 15, drawY - 5);
            ctx.lineTo(drawX + 25, drawY + 5);
            ctx.lineTo(drawX + 35, drawY - 5);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();

            // SNIPER RIFLE (Gun)
            ctx.fillStyle = '#222';
            ctx.fillRect(drawX - 40 + this.recoil, drawY + 50, 80, 10); // Long barrel
            ctx.fillStyle = this.color;
            ctx.fillRect(drawX, drawY + 50, 10, 15); // Handle
        } else {
            // Fallback
            ctx.fillStyle = this.color;
            ctx.fillRect(drawX, drawY, this.width, this.height);
        }

        ctx.restore();
    }

    update() {
        this.draw();

        // Update Projectiles
        this.projectiles.forEach((projectile, index) => {
            projectile.update();
            // Remove off-screen projectiles
            if (projectile.position.x < 0 || projectile.position.x > worldWidth) {
                this.projectiles.splice(index, 1);
            }
        });

        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Ground Collision
        if (this.position.y + this.height + this.velocity.y >= canvas.height - 60) {
            this.velocity.y = 0;
            this.position.y = canvas.height - 60 - this.height;
            this.jumps = 0; // Reset jumps on ground
        } else {
            this.velocity.y += gravity;
        }

        // Platform Collision
        platforms.forEach(platform => {
            if (this.position.y + this.height <= platform.position.y &&
                this.position.y + this.height + this.velocity.y >= platform.position.y &&
                this.position.x + this.width >= platform.position.x &&
                this.position.x <= platform.position.x + platform.width) {

                this.velocity.y = 0;
                this.position.y = platform.position.y - this.height;
                this.jumps = 0;
            }
        });

        // Map Boundaries
        if (this.position.x < 0) this.position.x = 0;
        if (this.position.x + this.width > worldWidth) this.position.x = worldWidth - this.width;
    }

    attack() {
        if (this.isAttacking) return;

        this.isAttacking = true;
        this.recoil = 15;

        const isP1 = this.type === 'samurai';
        const direction = isP1 ? 1 : -1;

        // BURST FIRE LOGIC (3 Bullets)
        let shots = 0;
        const fire = () => {
            if (shots >= 3) return;

            const startX = isP1 ? this.position.x + this.width + 10 : this.position.x - 10;

            this.projectiles.push(new Projectile({
                position: {
                    x: startX,
                    y: this.position.y + 50 + (Math.random() * 10 - 5) // Slight spread
                },
                velocity: {
                    x: 18 * direction,
                    y: (Math.random() * 2 - 1) // Slight vertical spread
                },
                color: this.color
            }));

            this.recoil = 10;
            shots++;
            setTimeout(fire, 100); // 100ms between shots
        };

        fire();

        setTimeout(() => {
            this.isAttacking = false;
        }, 600); // Cooldown covers burst duration
    }

    jump() {
        if (this.jumps < 2) {
            this.velocity.y = -18;
            this.jumps++;
        }
    }
}

const player = new Sprite({
    position: { x: 100, y: 0 },
    velocity: { x: 0, y: 0 },
    color: '#00f2ff',
    offset: { x: 0, y: 0 },
    type: 'samurai'
});

const enemy = new Sprite({
    position: { x: 1600, y: 0 }, // Spawn further apart
    velocity: { x: 0, y: 0 },
    color: '#ff00ff',
    offset: { x: -50, y: 0 },
    type: 'ninja'
});

const keys = {
    a: { pressed: false },
    d: { pressed: false },
    ArrowLeft: { pressed: false },
    ArrowRight: { pressed: false }
};

let timer = 99;
let timerId;

function decreaseTimer() {
    if (timer > 0) {
        timerId = setTimeout(decreaseTimer, 1000);
        timer--;
        document.getElementById('timer').innerHTML = timer;
    }

    if (timer === 0) {
        determineWinner({ player, enemy, timerId });
    }
}

function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.attackBox.position.x + rectangle1.attackBox.width >= rectangle2.position.x &&
        rectangle1.attackBox.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.attackBox.position.y + rectangle1.attackBox.height >= rectangle2.position.y &&
        rectangle1.attackBox.position.y <= rectangle2.position.y + rectangle2.height
    );
}

function determineWinner({ player, enemy, timerId }) {
    clearTimeout(timerId);
    document.getElementById('main-menu').style.display = 'block';
    const h1 = document.querySelector('#main-menu h1');
    if (player.health === enemy.health) {
        h1.innerHTML = 'DRAW';
    } else if (player.health > enemy.health) {
        h1.innerHTML = 'PLAYER 1 WINS';
    } else {
        h1.innerHTML = 'PLAYER 2 WINS';
    }
}

function animate() {
    window.requestAnimationFrame(animate);
    ctx.fillStyle = '#10101a';
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Clear screen

    // --- SMOOTH CAMERA LOGIC ---
    // Target: Midpoint between players
    const midpointX = (player.position.x + enemy.position.x + player.width + enemy.width) / 2;
    const midpointY = (player.position.y + enemy.position.y + player.height + enemy.height) / 2;

    // Desired Camera Position (Centered on midpoint)
    const targetCamX = midpointX - canvas.width / 2;
    const targetCamY = midpointY - canvas.height / 2;

    // Clamp Targets to World Bounds
    const clampedX = Math.max(0, Math.min(targetCamX, worldWidth - canvas.width));
    const clampedY = Math.max(-200, Math.min(targetCamY, 0)); // Allow looking up a bit, but floor is fixed

    // Smooth Pan (Lerp) - define global camera object if possible, effectively using closure here
    if (!window.camera) window.camera = { x: 0, y: 0 };

    window.camera.x += (clampedX - window.camera.x) * 0.1; // 0.1 = Smoothing factor
    window.camera.y += (clampedY - window.camera.y) * 0.1;

    ctx.save();
    ctx.translate(-window.camera.x, -window.camera.y);

    // Draw Background Items (Extended coverage for vertical camera)

    // Grid/Decor
    ctx.strokeStyle = '#222233';
    ctx.lineWidth = 1;
    for (let i = 0; i < worldWidth; i += 100) {
        ctx.beginPath();
        ctx.moveTo(i, -500); // Draw from high up
        ctx.lineTo(i, canvas.height + 200);
        ctx.stroke();
    }

    // Ground (Extended)
    ctx.fillStyle = '#222233';
    ctx.fillRect(0, canvas.height - 60, worldWidth, 200); // Deep ground

    // Platforms
    platforms.forEach(platform => platform.draw());

    player.update();
    enemy.update();

    player.velocity.x = 0;
    enemy.velocity.x = 0;

    // Movement & Inputs
    // If Multiplayer: Only control my own character
    // If Local/Offline: Control both (for testing)

    if (currentPlayerRole === 'p1' || currentPlayerRole === null) {
        if (keys.a.pressed && player.lastKey === 'a') {
            player.velocity.x = -5;
        } else if (keys.d.pressed && player.lastKey === 'd') {
            player.velocity.x = 5;
        }
    }

    if (currentPlayerRole === 'p2' || currentPlayerRole === null) {
        if (keys.ArrowLeft.pressed && enemy.lastKey === 'ArrowLeft') {
            enemy.velocity.x = -5;
        } else if (keys.ArrowRight.pressed && enemy.lastKey === 'ArrowRight') {
            enemy.velocity.x = 5;
        }
    }

    // Networking Sync
    if (connection && connection.state === "Connected") {
        if (currentPlayerRole === 'p1') {
            connection.invoke("SendPlayerMove", player.position.x, player.position.y, player.isAttacking, 'p1')
                .catch(err => console.error(err));
        } else if (currentPlayerRole === 'p2') {
            connection.invoke("SendPlayerMove", enemy.position.x, enemy.position.y, enemy.isAttacking, 'p2')
                .catch(err => console.error(err));
        }
    }

    // Detect collision locally and send damage
    // Note: In authoritative server, server decides this. Here, client decides.
    // Removed melee attack collision logic as per instructions.

    // PROJECTILE COLLISION DETECTION

    // Check Player 1 Bullets hitting Player 2
    if (currentPlayerRole === 'p1' || currentPlayerRole === null) {
        for (let i = player.projectiles.length - 1; i >= 0; i--) {
            const p = player.projectiles[i];
            // Check collision with enemy body
            if (
                p.position.x + p.radius >= enemy.position.x &&
                p.position.x - p.radius <= enemy.position.x + enemy.width &&
                p.position.y + p.radius >= enemy.position.y &&
                p.position.y - p.radius <= enemy.position.y + enemy.height
            ) {
                // Hit!
                player.projectiles.splice(i, 1); // Remove bullet

                if (enemy.health > 0) {
                    if (connection && connection.state === "Connected") {
                        connection.invoke("PlayerHit", 'p2', 5); // 5 damage per bullet
                    } else {
                        enemy.health -= 5;
                        document.getElementById('health-p2').style.width = enemy.health + '%';
                    }
                }
            } else {
                // Check Platform collision for bullets (Absorb shots)
                let hitPlatform = false;
                platforms.forEach(plat => {
                    if (p.position.x >= plat.position.x && p.position.x <= plat.position.x + plat.width &&
                        p.position.y >= plat.position.y && p.position.y <= plat.position.y + plat.height) hitPlatform = true;
                });
                if (hitPlatform) player.projectiles.splice(i, 1);
            }
        }
    }

    // Check Player 2 Bullets hitting Player 1
    if (currentPlayerRole === 'p2' || currentPlayerRole === null) {
        for (let i = enemy.projectiles.length - 1; i >= 0; i--) {
            const p = enemy.projectiles[i];
            // Check collision with player body
            if (
                p.position.x + p.radius >= player.position.x &&
                p.position.x - p.radius <= player.position.x + player.width &&
                p.position.y + p.radius >= player.position.y &&
                p.position.y - p.radius <= player.position.y + player.height
            ) {
                // Hit!
                enemy.projectiles.splice(i, 1); // Remove bullet

                if (player.health > 0) {
                    if (connection && connection.state === "Connected") {
                        connection.invoke("PlayerHit", 'p1', 5);
                    } else {
                        player.health -= 5;
                        document.getElementById('health-p1').style.width = player.health + '%';
                    }
                }
            } else {
                // Check Platform collision
                let hitPlatform = false;
                platforms.forEach(plat => {
                    if (p.position.x >= plat.position.x && p.position.x <= plat.position.x + plat.width &&
                        p.position.y >= plat.position.y && p.position.y <= plat.position.y + plat.height) hitPlatform = true;
                });
                if (hitPlatform) enemy.projectiles.splice(i, 1);
            }
        }
    }

    // Restore Camera
    ctx.restore();

    // End game based on health
    if (enemy.health <= 0 || player.health <= 0) {
        determineWinner({ player, enemy, timerId });
    }
}

window.addEventListener('keydown', (event) => {
    // Only allow input for the correct player role
    const isP1 = (currentPlayerRole === 'p1' || currentPlayerRole === null);
    const isP2 = (currentPlayerRole === 'p2' || currentPlayerRole === null);

    switch (event.key) {
        case 'd': if (isP1) { keys.d.pressed = true; player.lastKey = 'd'; } break;
        case 'a': if (isP1) { keys.a.pressed = true; player.lastKey = 'a'; } break;
        case 'w': if (isP1) player.jump(); break;
        case ' ': if (isP1) player.attack(); break;

        case 'ArrowRight': if (isP2) { keys.ArrowRight.pressed = true; enemy.lastKey = 'ArrowRight'; } break;
        case 'ArrowLeft': if (isP2) { keys.ArrowLeft.pressed = true; enemy.lastKey = 'ArrowLeft'; } break;
        case 'ArrowUp': if (isP2) enemy.jump(); break;
        case 'Enter': if (isP2) enemy.attack(); break;
    }
});

window.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'd': keys.d.pressed = false; break;
        case 'a': keys.a.pressed = false; break;
        case 'ArrowRight': keys.ArrowRight.pressed = false; break;
        case 'ArrowLeft': keys.ArrowLeft.pressed = false; break;
    }
});

// --- TOUCH CONTROLS LOGIC ---
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnJump = document.getElementById('btn-jump');
const btnAttack = document.getElementById('btn-attack');

function setupTouch(btn, actionStart, actionEnd) {
    const start = (e) => { e.preventDefault(); actionStart(); };
    const end = (e) => { e.preventDefault(); actionEnd(); };

    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('mousedown', start); // Mouse support for testing
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
}

// Left Movement
setupTouch(btnLeft, () => {
    if (currentPlayerRole === 'p1' || currentPlayerRole === null) {
        keys.a.pressed = true; player.lastKey = 'a';
    } else {
        keys.ArrowLeft.pressed = true; enemy.lastKey = 'ArrowLeft';
    }
}, () => {
    if (currentPlayerRole === 'p1' || currentPlayerRole === null) keys.a.pressed = false;
    else keys.ArrowLeft.pressed = false;
});

// Right Movement
setupTouch(btnRight, () => {
    if (currentPlayerRole === 'p1' || currentPlayerRole === null) {
        keys.d.pressed = true; player.lastKey = 'd';
    } else {
        keys.ArrowRight.pressed = true; enemy.lastKey = 'ArrowRight';
    }
}, () => {
    if (currentPlayerRole === 'p1' || currentPlayerRole === null) keys.d.pressed = false;
    else keys.ArrowRight.pressed = false;
});

// Jump (Trigger once)
setupTouch(btnJump, () => {
    if (currentPlayerRole === 'p1' || currentPlayerRole === null) {
        player.jump();
    } else {
        enemy.jump();
    }
}, () => { });

// Attack
setupTouch(btnAttack, () => {
    if (currentPlayerRole === 'p1' || currentPlayerRole === null) player.attack();
    else enemy.attack();
}, () => { });


function joinGame(role) {
    currentPlayerRole = role;
    document.getElementById('main-menu').style.display = 'none';

    // reset game state
    player.health = 100;
    enemy.health = 100;
    player.position = { x: 100, y: 0 };
    enemy.position = { x: 1600, y: 0 };
    player.projectiles = [];
    enemy.projectiles = [];
    timer = 99;
    document.getElementById('health-p1').style.width = '100%';
    document.getElementById('health-p2').style.width = '100%';
    decreaseTimer();

    // Ensure canvas fits screen on mobile join
    resizeCanvas();
}

function resizeCanvas() {
    // Optional: exact fit logic if needed, but CSS handles 100% mostly.
    // canvas.width = window.innerWidth;
    // canvas.height = window.innerHeight; 
    // ^ This would require scaling logic update for positions. Keeping fixed for now but CSS scales it.
}

animate();

// C++ Mock
function wasmDamageCalculator(baseDamage, multiplier) {
    return baseDamage * multiplier;
}
