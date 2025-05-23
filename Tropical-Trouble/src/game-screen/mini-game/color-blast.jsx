import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import collision from '../../assets/map/map-collision/cblast';
import beachMape from '../../assets/map/map-image/cblast.png';
import '../../Citygame.css';

const MAP_WIDTH = 20;
const MAP_HEIGHT = 20;

// Fungsi isCollision dan isPortalToCity tidak perlu diubah, sudah benar.
function isCollision(x, y) {
    const gridX = Math.floor(x / 16);
    const gridY = Math.floor(y / 16);

    if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) {
        return true; // Out of bounds = collision
    }

    const collisionValue = collision[gridY * MAP_WIDTH + gridX];
    return collisionValue !== 0 && collisionValue !== -1;
}

function isPortalToCity(x, y) {
    const gridX = Math.floor(x / 16);
    const gridY = Math.floor(y / 16);

    if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) {
        return false;
    }

    const collisionIndex = gridY * MAP_WIDTH + gridX;
    return collision[collisionIndex] === -1;
}

export default function Cblast({ onChangeWorld, startPosition }) {
    const [bullets, setBullets] = useState([]);
    const characterRef = useRef(null);
    const mapRef = useRef(null);
    const [gameState, setGameState] = useState({
        x: startPosition?.x || 4.5 * 32,
        y: startPosition?.y || 1.7 * 32,
        pressedDirections: [],
        facing: "down",
        walking: false,
        cameraX: startPosition?.x || 8.5 * 32,
        cameraY: startPosition?.y || 10.7 * 32,
    });

    // Bagian useMemo untuk 'directions' dan 'keys' sudah benar.
    const directions = useMemo(() => ({
        up: "up",
        down: "down",
        left: "left",
        right: "right",
    }), []);

    const keys = useMemo(() => ({
        'ArrowUp': directions.up,
        'ArrowLeft': directions.left,
        'ArrowRight': directions.right,
        'ArrowDown': directions.down,
    }), [directions]);

    const speed = 1;
    const BULLET_SPEED = 2;

    // PERBAIKAN: Fungsi shoot sudah benar, tidak perlu diubah.
    const shoot = useCallback(() => {
        setBullets(prev => [...prev, {
            id: Date.now(),
            x: gameState.x + 16, // Pusatkan peluru pada karakter
            y: gameState.y + 10,
            direction: gameState.facing,
        }]);
    }, [gameState.x, gameState.y, gameState.facing]);

    const handleKeyDown = useCallback((e) => {
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
    }, [keys, shoot]);

    const handleKeyUp = useCallback((e) => {
        const dir = keys[e.code];
        if (dir) {
            setGameState(prev => ({
                ...prev,
                pressedDirections: prev.pressedDirections.filter(d => d !== dir),
            }));
        }
    }, [keys]);
    
    // PERBAIKAN: Pindahkan logika update game ke dalam useCallback agar tidak dibuat ulang di setiap render.
    const updateBullets = useCallback(() => {
        setBullets(prevBullets =>
            prevBullets.map(bullet => {
                let newX = bullet.x;
                let newY = bullet.y;
                switch (bullet.direction) {
                    case 'up': newY -= BULLET_SPEED; break;
                    case 'down': newY += BULLET_SPEED; break;
                    case 'left': newX -= BULLET_SPEED; break;
                    case 'right': newX += BULLET_SPEED; break;
                    default: break;
                }
                return { ...bullet, x: newX, y: newY };
            })
                // Hapus peluru jika kena tembok atau keluar la)
        );
    }, []); // Dependency kosong karena fungsi ini tidak bergantung pada state luar secara langsung (menggunakan functional update)


    const placeCharacter = useCallback(() => {
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

                const feetX = nextX + 16; // Cek bagian tengah bawah karakter
                const feetY = nextY + 32; // Cek bagian bawah karakter

                if (isPortalToCity(feetX, feetY)) {
                    if (onChangeWorld) {
                        onChangeWorld('city', nextX, nextY);
                    }
                    return prev; // Hentikan update state di map ini
                }

                if (!isCollision(feetX, feetY)) {
                    x = nextX;
                    y = nextY;
                    walking = true;
                }
                facing = direction;
            }

            // Camera logic
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

            return { x, y, cameraX: newCameraX, cameraY: newCameraY, pressedDirections, facing, walking };
        });
    }, [directions, onChangeWorld]); // Tambahkan dependensi


    // PERBAIKAN: Gabungkan semua game loop ke dalam satu useEffect
    useEffect(() => {
        let animationFrameId;

        const gameLoop = () => {
            placeCharacter();
            updateBullets(); // Panggil update peluru di setiap frame
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
    }, [handleKeyDown, handleKeyUp, placeCharacter, updateBullets]); // Tambahkan semua fungsi sebagai dependensi


    // useEffect untuk render/transformasi DOM, sudah benar.
    useEffect(() => {
        if (!characterRef.current || !mapRef.current) return;

        const pixelSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pixel-size') || '4');
        const CAMERA_LEFT_OFFSET_PX = 206; // Sesuaikan jika perlu
        const CAMERA_TOP_OFFSET_PX = 32;   // Sesuaikan jika perlu

        const cameraTransformLeft = -gameState.cameraX * pixelSize + (pixelSize * CAMERA_LEFT_OFFSET_PX);
        const cameraTransformTop = -gameState.cameraY * pixelSize + (pixelSize * CAMERA_TOP_OFFSET_PX);

        mapRef.current.style.transform = `translate3d(${cameraTransformLeft}px, ${cameraTransformTop}px, 0)`;
        characterRef.current.style.transform = `translate3d(${gameState.x * pixelSize}px, ${gameState.y * pixelSize}px, 0)`;
        characterRef.current.setAttribute('facing', gameState.facing);
        characterRef.current.setAttribute('walking', gameState.walking ? 'true' : 'false');
    }, [gameState]);
    
    // Fungsi render grid tidak diubah, namun disarankan untuk menghapusnya pada build produksi
    // agar tidak mengganggu performa.
    function renderGridCells() { /* ... kode Anda ... */ }
    
    return (
        <div className="game-screen">
            <div ref={mapRef} className="map" style={{ backgroundImage: `url(${beachMape})` }}>
                
                {/* Visualisasi kolisi dan portal, sudah benar */}
                {/* {collision.map(...)} */}

                {/* Visualisasi grid, sudah benar */}
                {/* {renderGridCells()} */}

                {/* Render bullets */}
                {bullets.map(bullet => (
                    <div
                        key={bullet.id}
                        className="bullet"
                        style={{
                            // PERBAIKAN: Gunakan pixelSize untuk konsistensi
                            transform: `translate3d(${bullet.x * parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pixel-size') || '4')}px, ${bullet.y * parseInt(getComputedStyle(document.documentElement).getPropertyValue('--pixel-size') || '4')}px, 0)`,
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