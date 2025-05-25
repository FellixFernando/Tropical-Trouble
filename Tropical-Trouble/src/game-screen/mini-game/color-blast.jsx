import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import collision from '../../assets/map/map-collision/cblast';
import beachMape from '../../assets/map/map-image/cblast.png';
import '../../Citygame.css';

const MAP_WIDTH = 20;
const MAP_HEIGHT = 20;
const PIXEL_SIZE = 4; // Assuming a pixel size of 4, adjust as needed

// A simple random utility function
const random = (min, max) => Math.floor(Math.random() * (max - min) + min);

// Collision detection function for rectangles
const isRectCollision = (rect1, rect2) => {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
};

function isCollision(x, y) {
    const gridX = Math.floor(x / 16);
    const gridY = Math.floor(y / 16);

    if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) {
        return true;
    }

    const collisionValue = collision[gridY * MAP_WIDTH + gridX];
    return collisionValue !== 0 && collisionValue !== -1;
}

function checkPortalDestination(x, y) {
    // Konversi koordinat pixel ke grid coordinates
    const gridX = Math.floor(x / 32); // Karena tile size adalah 32px
    const gridY = Math.floor(y / 32);

    // Debug coordinates
    console.log(`Grid Position - X: ${gridX}, Y: ${gridY}`);

    // Check batas map
    if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) {
        return null;
    }

    // Check apakah player berada di row 5 (index 4) dan column 10/11 (index 9/10)
    if (gridY === 4 && (gridX === 9 || gridX === 10)) {
        console.log("Teleporting to forest...");
        return 'forest';
    }

    // Check untuk portal lain (city)
    const collisionIndex = gridY * MAP_WIDTH + gridX;
    if (collision[collisionIndex] === -1) {
        return 'city';
    }

    return null;
}

export default function Cblast({ onChangeWorld, startPosition }) {
    const [showGameOverAlert, setShowGameOverAlert] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60); // 60 detik = 1 menit
    const [isGameOver, setIsGameOver] = useState(false);
    const [bullets, setBullets] = useState([]);
    const [enemies, setEnemies] = useState([]); // State for enemies
    const [explosions, setExplosions] = useState([]); // State for explosions
    const [score, setScore] = useState(0); // State for score
    const [canShoot, setCanShoot] = useState(true);
    const SHOOT_COOLDOWN = 100;
    const characterRef = useRef(null);
    const mapRef = useRef(null);
    const [gameState, setGameState] = useState({
        x: startPosition?.x || 4.5 * 32,
        y: startPosition?.y || 2.2 * 32,
        pressedDirections: [],
        facing: "down",
        walking: false,
        cameraX: startPosition?.x || 8.5 * 32,
        cameraY: startPosition?.y || 10.7 * 32,
    });

    const directions = useMemo(() => ({ up: "up", down: "down", left: "left", right: "right" }), []);
    const keys = useMemo(() => ({ 'ArrowUp': directions.up, 'ArrowLeft': directions.left, 'ArrowRight': directions.right, 'ArrowDown': directions.down }), [directions]);

    const speed = 1;
    const BULLET_SPEED = 2;
    const MAX_ENEMIES = 40; // Max number of enemies on screen
    const EXPLOSION_DURATION = 1500; // Duration of explosion animation in milliseconds

    // Function to reset game to initial state
    const resetGame = useCallback(() => {
        setTimeLeft(60);
        setIsGameOver(false);
        setShowGameOverAlert(false);
        setBullets([]);
        setExplosions([]);
        setScore(0);
        setCanShoot(true);

        // Reset player position
        setGameState({
            x: startPosition?.x || 4.5 * 32,
            y: startPosition?.y || 1.7 * 32,
            pressedDirections: [],
            facing: "down",
            walking: false,
            cameraX: startPosition?.x || 8.5 * 32,
            cameraY: startPosition?.y || 10.7 * 32,
        });

        // Reset enemies
        const initialEnemies = [];
        for (let i = 0; i < MAX_ENEMIES; i++) {
            initialEnemies.push(createEnemy(i));
        }
        setEnemies(initialEnemies);
    }, [startPosition]);

    // Spawn initial enemies
    useEffect(() => {
        const initialEnemies = [];
        for (let i = 0; i < MAX_ENEMIES; i++) {
            initialEnemies.push(createEnemy(i));
        }
        setEnemies(initialEnemies);
    }, []);

    // Buat ref untuk menyimpan timer
    const timerRef = useRef(null);

    // Modifikasi useEffect timer
    useEffect(() => {
        if (isGameOver) return;

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setIsGameOver(true);
                    setShowGameOverAlert(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
        // Hanya dijalankan sekali saat mount, atau saat game over berubah
    }, [isGameOver]);

    useEffect(() => {
        if (isGameOver) return;

        const spawnInterval = setInterval(() => {
            setEnemies(prevEnemies => {
                // Jika jumlah enemy sudah mencapai batas maksimum
                if (prevEnemies.length >= MAX_ENEMIES) return prevEnemies;

                const newEnemies = [];
                // Spawn 3 enemy baru
                for (let i = 0; i < 1; i++) {
                    // Pastikan tidak melebihi MAX_ENEMIES
                    if (prevEnemies.length + newEnemies.length < MAX_ENEMIES) {
                        newEnemies.push(createEnemy(prevEnemies.length + i));
                    }
                }

                return [...prevEnemies, ...newEnemies];
            });
        }, 1000); // 1000ms = 1 detik

        return () => clearInterval(spawnInterval);
    }, [isGameOver]);

    // Function to create a new enemy
    const createEnemy = (id) => {
        const ENEMY_AREA = {
            minY: MAP_HEIGHT * 16 * 0.78, // Start at 78% of map height
            maxY: MAP_HEIGHT * 16 * 0.84, // End at 84% of map height
        };
        return {
            id: `enemy-${id}-${Date.now()}`,
            width: 32, // Adjusted size for the new context
            height: 32,
            x: random(0, MAP_WIDTH * 16 - 32),
            y: random(ENEMY_AREA.minY, ENEMY_AREA.maxY),
            speed: random(1, 3) * 1,
            movingLeft: Math.random() < 0.5,
            color: `hsl(${random(0, 360)}, 60%, 50%)`,
        };
    };

    // Function to create explosion effect
    const createExplosion = (x, y) => {
        const particles = [];
        const numParticles = 8;

        for (let i = 0; i < numParticles; i++) {
            particles.push({
                id: `particle-${i}-${Date.now()}`,
                x: x + 16, // Center of enemy
                y: y + 16,
                velocityX: (Math.random() - 0.5) * 4,
                velocityY: (Math.random() - 0.5) * 4,
                size: random(4, 12),
                color: ['#ff6b35', '#f7931e', '#ffcc02', '#fff200', '#ff4757'][random(0, 5)],
                life: 1.0,
                decay: random(0.02, 0.04)
            });
        }

        return {
            id: `explosion-${Date.now()}`,
            x: x,
            y: y,
            particles: particles,
            startTime: Date.now()
        };
    };

    const shoot = useCallback(() => {
        if (!canShoot || isGameOver) return;

        setBullets(prev => [...prev, {
            id: Date.now(),
            x: gameState.x + 16, // Center of player
            y: gameState.y + 15, // Bottom of player
            width: 8,
            height: 20,
            direction: 'down', // Always shoot down
            color: 'white'
        }]);

        setCanShoot(false);
        setTimeout(() => setCanShoot(true), SHOOT_COOLDOWN);
    }, [canShoot, gameState.x, gameState.y, isGameOver]);

    const handleKeyDown = useCallback((e) => {
        if (isGameOver) return;

        if (e.code === 'Space') {
            shoot();
            return;
        }
        const dir = keys[e.code];
        if (dir) {
            setGameState(prev => {
                if (!prev.pressedDirections.includes(dir)) {
                    return { ...prev, pressedDirections: [dir, ...prev.pressedDirections] };
                }
                return prev;
            });
        }
    }, [keys, shoot, isGameOver]);

    const handleKeyUp = useCallback((e) => {
        if (isGameOver) return;

        const dir = keys[e.code];
        if (dir) {
            setGameState(prev => ({
                ...prev,
                pressedDirections: prev.pressedDirections.filter(d => d !== dir),
            }));
        }
    }, [keys, isGameOver]);

    const updateGame = useCallback(() => {
        if (isGameOver) return;

        // Update Player
        setGameState(prev => {
            let { x, y, cameraX, cameraY, pressedDirections, facing, walking } = { ...prev };
            const direction = pressedDirections[0];
            walking = false;

            if (direction) {
                let nextX = x;
                let nextY = y;

                if (direction === directions.right) nextX += speed;
                if (direction === directions.left) nextX -= speed;
                if (direction === directions.down) nextY += speed;
                if (direction === directions.up) nextY -= speed;

                const feetX = nextX + 16; // Center point x
                const feetY = nextY + 32; // Bottom point y

                // Check portal destination
                const portalDestination = checkPortalDestination(feetX, feetY);
                if (portalDestination === 'forest') {
                    if (onChangeWorld) {
                        // Simpan posisi terakhir sebelum pindah
                        const lastPosition = {
                            x: nextX,
                            y: nextY
                        };
                        onChangeWorld('forest', lastPosition);
                    }
                    return prev; // Prevent movement if teleporting
                }

                if (!isCollision(feetX, feetY)) {
                    x = nextX;
                    y = nextY;
                    walking = true;
                }
                facing = direction;
            }

            const LOOKAHEAD_DISTANCE = 6;
            let lookaheadX = 0;
            let lookaheadY = 0;

            if (direction === directions.left) lookaheadX -= LOOKAHEAD_DISTANCE;
            if (direction === directions.right) lookaheadX += LOOKAHEAD_DISTANCE;
            if (direction === directions.up) lookaheadY -= LOOKAHEAD_DISTANCE;
            if (direction === directions.down) lookaheadY += LOOKAHEAD_DISTANCE;

            const cameraDstX = x + lookaheadX;
            const cameraDstY = y + lookaheadY;

            const lerpSpeed = 0.1;
            const newCameraX = cameraX * (1 - lerpSpeed) + cameraDstX * lerpSpeed;
            const newCameraY = cameraY * (1 - lerpSpeed) + cameraDstY * lerpSpeed;

            return { ...prev, x, y, cameraX: newCameraX, cameraY: newCameraY, pressedDirections, facing, walking };
        });

        // Update Bullets
        setBullets(prevBullets =>
            prevBullets.map(bullet => {
                // Bullets only move downward
                const newY = bullet.y + BULLET_SPEED;

                // Remove bullets that go off screen
                if (newY > MAP_HEIGHT * 16) return null;

                return { ...bullet, y: newY };
            }).filter(Boolean)
        );

        // Update Enemies
        setEnemies(prevEnemies =>
            prevEnemies.map(enemy => {
                let newX = enemy.x;
                let newY = enemy.y; // Enemies in this version won't move down constantly

                if (enemy.movingLeft) {
                    if (enemy.x > 0) {
                        newX -= enemy.speed;
                    } else {
                        enemy.movingLeft = false;
                    }
                } else {
                    if (enemy.x + enemy.width < MAP_WIDTH * 16) {
                        newX += enemy.speed;
                    } else {
                        enemy.movingLeft = true;
                    }
                }

                return { ...enemy, x: newX, y: newY };
            })
        );

        // Update Explosions
        setExplosions(prevExplosions => {
            const currentTime = Date.now();
            return prevExplosions.map(explosion => {
                const updatedParticles = explosion.particles.map(particle => ({
                    ...particle,
                    x: particle.x + particle.velocityX,
                    y: particle.y + particle.velocityY,
                    velocityY: particle.velocityY + 0.1, // Gravity effect
                    life: particle.life - particle.decay,
                    size: Math.max(0, particle.size - 0.2)
                })).filter(particle => particle.life > 0 && particle.size > 0);

                if (updatedParticles.length === 0 || currentTime - explosion.startTime > EXPLOSION_DURATION) {
                    return null;
                }

                return { ...explosion, particles: updatedParticles };
            }).filter(Boolean);
        });


        // Collision Detection: Bullets vs Enemies
        setBullets(prevBullets => {
            const bulletsToRemove = new Set();
            let scoreIncrease = 0;
            const newExplosions = [];

            setEnemies(prevEnemies => {
                return prevEnemies.filter(enemy => {
                    // Check each bullet for collision with this enemy
                    for (const bullet of prevBullets) {
                        if (bullet.x < enemy.x + enemy.width &&
                            bullet.x + bullet.width > enemy.x &&
                            bullet.y < enemy.y + enemy.height &&
                            bullet.y + bullet.height > enemy.y) {
                            bulletsToRemove.add(bullet.id);
                            scoreIncrease += 10; // Ubah dari 15 ke 10

                            // Create explosion at enemy position
                            newExplosions.push(createExplosion(enemy.x, enemy.y));

                            return false; // Remove enemy
                        }
                    }
                    return true; // Keep enemy if no collision
                });
            });

            // Add new explosions
            if (newExplosions.length > 0) {
                setExplosions(prev => [...prev, ...newExplosions]);
            }

            if (scoreIncrease > 0) {
                setScore(prevScore => prevScore + scoreIncrease);
            }

            return prevBullets.filter(bullet => !bulletsToRemove.has(bullet.id));
        });

    }, [directions, onChangeWorld, isGameOver]);

    // Main Game Loop
    useEffect(() => {
        let animationFrameId;
        const gameLoop = () => {
            updateGame();
            animationFrameId = requestAnimationFrame(gameLoop);
        };
        animationFrameId = requestAnimationFrame(gameLoop);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, [handleKeyDown, handleKeyUp, updateGame]);

    // DOM Updates
    useEffect(() => {
        if (!characterRef.current || !mapRef.current) return;

        const CAMERA_LEFT_OFFSET_PX = 206;
        const CAMERA_TOP_OFFSET_PX = 32;

        const cameraTransformLeft = -gameState.cameraX * PIXEL_SIZE + (PIXEL_SIZE * CAMERA_LEFT_OFFSET_PX);
        const cameraTransformTop = -gameState.cameraY * PIXEL_SIZE + (PIXEL_SIZE * CAMERA_TOP_OFFSET_PX);

        mapRef.current.style.transform = `translate3d(${cameraTransformLeft}px, ${cameraTransformTop}px, 0)`;
        characterRef.current.style.transform = `translate3d(${gameState.x * PIXEL_SIZE}px, ${gameState.y * PIXEL_SIZE}px, 0)`;
        characterRef.current.setAttribute('facing', gameState.facing);
        characterRef.current.setAttribute('walking', gameState.walking ? 'true' : 'false');
    }, [gameState]);

    // Format timer display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    function renderGridCells() {
        const gridCell = 64;
        const cells = [];
        for (let y = 0; y < 20; y++) {
            for (let x = 0; x < 20; x++) {
                cells.push(
                    <div
                        key={`grid-${x}-${y}`}
                        style={{
                            position: 'absolute',
                            left: x * gridCell,
                            top: y * gridCell,
                            width: gridCell,
                            height: gridCell,
                            border: '1px solid white',
                            boxSizing: 'border-box',
                            pointerEvents: 'none',
                            zIndex: 20,
                            opacity: 0.5,
                            fontSize: 10,
                            color: 'yellow',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'flex-start',
                            padding: 2,
                            background: 'transparent',
                        }}
                    >
                        {y + 1},{x + 1}
                    </div>
                );
            }
        }
        return cells;
    }

    return (
        <div className="game-screen">
            {/* Visual Timer Display */}
            <div style={{
                position: 'fixed',
                top: '50px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '48px',
                fontWeight: 'bold',
                color: 'white',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                zIndex: 999,
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: '10px 20px',
                borderRadius: '10px',
                border: timeLeft <= 10 ? '3px solid red' : '3px solid white'
            }}>
                {formatTime(timeLeft)}
            </div>

            {/* Score Display */}
            <div style={{
                position: 'fixed',
                top: '10px',
                left: '10px',
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'white',
                textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                zIndex: 999,
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: '10px 15px',
                borderRadius: '5px'
            }}>
                {/* Score: {score} */}
            </div>

            {/* Game Over Alert */}
            {showGameOverAlert && (
                <div style={{
                    position: 'fixed',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1001
                }}>
                    <div style={{
                        backgroundColor: 'rgba(20, 20, 20, 0.95)',
                        padding: '40px',
                        borderRadius: '15px',
                        color: 'white',
                        textAlign: 'center',
                        border: enemies.length === 0 ? '3px solid #4CAF50' : '3px solid #ff4757',
                        boxShadow: enemies.length === 0 ?
                            '0 0 30px rgba(76, 175, 80, 0.5)' :
                            '0 0 30px rgba(255, 71, 87, 0.5)'
                    }}>
                        <h1 style={{
                            fontSize: '48px',
                            marginBottom: '20px',
                            color: enemies.length === 0 ? '#4CAF50' : '#ff4757',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
                        }}>
                            {enemies.length === 0 ? 'VICTORY!' : 'GAME OVER!'}
                        </h1>
                        <p style={{ fontSize: '24px', marginBottom: '10px' }}>
                            {enemies.length === 0 ? 'All enemies defeated!' : "Time's up!"}
                        </p>
                        {enemies.length === 0 && (
                            <div style={{
                                fontSize: '28px',
                                marginBottom: '30px',
                                color: '#ffd700',
                                animation: 'glow 1.5s ease-in-out infinite alternate'
                            }}>
                                🌊 You got Holy Water! ✨
                            </div>
                        )}
                        <p style={{ fontSize: '28px', marginBottom: '30px', color: '#ffd700' }}>
                          
                        </p>
                        <p style={{ fontSize: '18px', marginBottom: '30px', color: '#ccc' }}>
                            {enemies.length > 0 ? `${enemies.length} enemies remaining` : 'All enemies defeated!'}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            {enemies.length > 0 ? (
                                // Show Play Again button only when game is lost
                                <button
                                    onClick={resetGame}
                                    style={{
                                        padding: '15px 30px',
                                        fontSize: '20px',
                                        backgroundColor: '#ff4757',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                                    }}
                                    onMouseOver={(e) => {
                                        e.target.style.backgroundColor = '#ff3742';
                                        e.target.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.backgroundColor = '#ff4757';
                                        e.target.style.transform = 'scale(1)';
                                    }}
                                >
                                    Play Again
                                </button>
                            ) : (
                                // Show Back to Forest button only when game is won
                                <button
                                    onClick={() => onChangeWorld('forest')}
                                    style={{
                                        padding: '15px 30px',
                                        fontSize: '20px',
                                        backgroundColor: '#4CAF50',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                                    }}
                                    onMouseOver={(e) => {
                                        e.target.style.backgroundColor = '#45a049';
                                        e.target.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.backgroundColor = '#4CAF50';
                                        e.target.style.transform = 'scale(1)';
                                    }}
                                >
                                    Back to Forest
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add the glow animation style */}
            <style>
                {`
        @keyframes glow {
            from {
                text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #4CAF50, 0 0 20px #4CAF50;
            }
            to {
                text-shadow: 0 0 10px #fff, 0 0 20px #fff, 0 0 30px #4CAF50, 0 0 40px #4CAF50;
            }
        }
    `}
            </style>

            <div ref={mapRef} className="map" style={{ backgroundImage: `url(${beachMape})` }}>
                {/* Display collision areas and portals */}
                {collision.map((val, idx) => {
                    if (val === 0) return null;
                    const gridCell = 64;
                    const x = (idx % MAP_WIDTH) * gridCell;
                    const y = Math.floor(idx / MAP_WIDTH) * gridCell;
                    return (
                        <div
                            key={idx}
                            style={{
                                position: 'absolute',
                                left: x,
                                top: y,
                                width: gridCell,
                                height: gridCell,
                                background: val === -1 ? 'rgba(0,255,0,0.5)' : 'rgba(255,0,0,0.5)',
                                border: val === -1 ? '1px solid green' : '1px solid red',
                                boxSizing: 'border-box',
                                pointerEvents: 'none',
                                zIndex: 10,
                            }}
                        />
                    );
                })}
                {/* Grid overlay */}
                {renderGridCells()}
                {/* Render Enemies */}
                {enemies.map(enemy => (
                    <div
                        key={enemy.id}
                        className="enemy"
                        style={{
                            width: `${enemy.width + 45}px`,
                            height: `${enemy.height}px`,
                            backgroundColor: enemy.color,
                            transform: `translate3d(${enemy.x * PIXEL_SIZE}px, ${enemy.y * PIXEL_SIZE}px, 0)`,
                            position: 'absolute'
                        }}
                    />
                ))}

                {/* Render Explosions */}
                {explosions.map(explosion => (
                    <div key={explosion.id} style={{ position: 'absolute' }}>
                        {explosion.particles.map(particle => (
                            <div
                                key={particle.id}
                                style={{
                                    position: 'absolute',
                                    width: `${particle.size}px`,
                                    height: `${particle.size}px`,
                                    backgroundColor: particle.color,
                                    borderRadius: '50%',
                                    transform: `translate3d(${particle.x * PIXEL_SIZE}px, ${particle.y * PIXEL_SIZE}px, 0)`,
                                    opacity: particle.life,
                                    boxShadow: `0 0 ${particle.size}px ${particle.color}`,
                                    animation: `explosion-particle ${EXPLOSION_DURATION}ms ease-out`
                                }}
                            />
                        ))}
                        {/* Central explosion flash */}
                        <div
                            style={{
                                position: 'absolute',
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,107,53,0.6) 30%, rgba(255,71,87,0.4) 60%, transparent 100%)',
                                transform: `translate3d(${(explosion.x + 16) * PIXEL_SIZE - 30}px, ${(explosion.y + 16) * PIXEL_SIZE - 30}px, 0)`,
                                animation: `explosion-flash ${EXPLOSION_DURATION}ms ease-out`,
                                pointerEvents: 'none'
                            }}
                        />
                    </div>
                ))}

                {/* Render Bullets */}
                {bullets.map(bullet => (
                    <div
                        key={bullet.id}
                        className="bullet"
                        style={{
                            width: `${bullet.width}px`,
                            height: `${bullet.height}px`,
                            transform: `translate3d(${bullet.x * PIXEL_SIZE}px, ${bullet.y * PIXEL_SIZE}px, 0)`,
                        }}
                    />
                ))}

                <div ref={characterRef} className="character" facing="down" walking="false">
                    <div className="shadow pixel-art"></div>
                    <div className="character_spritesheet"></div>
                </div>
            </div>
        </div>
    );
}