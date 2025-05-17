import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import collision from '../../assets/map/map-collision/map-city';
import cityMape from '../../assets/map/map-image/mapCity.png'
import '../../Citygame.css';

const MAP_WIDTH = 20;
const MAP_HEIGHT = 20;

// Function to check collision
function isCollision(x, y) {
    const gridX = Math.floor(x / 16);
    const gridY = Math.floor(y / 16);

    if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) {
        return true;
    }

    const collisionIndex = gridY * MAP_WIDTH + gridX;
    if (collisionIndex < 0 || collisionIndex >= collision.length) {
        return true;
    }
    const collisionValue = collision[collisionIndex];
    return collisionValue !== 0 && collisionValue !== -1;
}

// Function to check if position is a portal (-1 in array)
function checkPortalDestination(x, y) {
    const gridX = Math.floor(x / 16);
    const gridY = Math.floor(y / 16);

    if (gridX < 0 || gridX >= MAP_WIDTH || gridY < 0 || gridY >= MAP_HEIGHT) {
        return null;
    }

    const collisionIndex = gridY * MAP_WIDTH + gridX;

  
    if (gridY === 17 && collision[collisionIndex] === -1) {
        if (gridX === 0) { 
            return 'beach';
        } else if (gridX === 19) { 
            return 'forest';
        }
    }

    return null;
}

export default function City({ onChangeWorld, startPosition }) {
    console.log('city');

    const characterRef = useRef(null);
    const mapRef = useRef(null);
    const [gameState, setGameState] = useState({
        x: startPosition?.x || 6 * 32,
        y: startPosition?.y || 8 * 32,
        pressedDirections: [],
        facing: "down",
        walking: false,
        cameraX: startPosition?.x || 6 * 32,
        cameraY: startPosition?.y || 8 * 32,
    });

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

    const handleKeyDown = useCallback((e) => {
        const dir = keys[e.code];
        if (dir) {
            setGameState(prev => {
                if (!prev.pressedDirections.includes(dir)) {
                    return {
                        ...prev,
                        pressedDirections: [dir, ...prev.pressedDirections],
                    };
                }
                return prev;
            });
        }
    }, [keys]);

    const handleKeyUp = useCallback((e) => {
        const dir = keys[e.code];
        if (dir) {
            setGameState(prev => ({
                ...prev,
                pressedDirections: prev.pressedDirections.filter(d => d !== dir),
            }));
        }
    }, [keys]);

    useEffect(() => {
        let animationFrameId;

        function lerp(currentValue, destinationValue, time) {
            return currentValue * (1 - time) + destinationValue * time;
        }

        const placeCharacter = () => {
            setGameState(prev => {
                let { x, y, cameraX, cameraY, pressedDirections, facing, walking } = prev;

                const direction = pressedDirections[0];
                walking = false;

                if (direction) {
                    let nextX = x;
                    let nextY = y;

                    if (direction === directions.right) nextX += speed;
                    if (direction === directions.left) nextX -= speed;
                    if (direction === directions.down) nextY += speed;
                    if (direction === directions.up) nextY -= speed;

                    const characterWidth = 32;
                    const characterHeight = 20;

                    const feetX = nextX + (characterWidth / 2);
                    const feetY = nextY + characterHeight;

                    // Check if player is at the specific portal (row 18, column 20)
                    const portalDestination = checkPortalDestination(feetX, feetY);
                    if (portalDestination) {
                        if (onChangeWorld) {
                            // Send current position and destination
                            onChangeWorld(portalDestination, nextX, nextY);
                        }
                        return {
                            ...prev,
                            x: nextX,
                            y: nextY,
                            walking: true,
                            facing: direction,
                        };
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
                const newCameraX = lerp(cameraX, cameraDstX, lerpSpeed);
                const newCameraY = lerp(cameraY, cameraDstY, lerpSpeed);

                return {
                    x,
                    y,
                    cameraX: newCameraX,
                    cameraY: newCameraY,
                    pressedDirections,
                    facing,
                    walking,
                };
            });
        };

        const tick = () => {
            placeCharacter();
            animationFrameId = requestAnimationFrame(tick);
        };

        animationFrameId = requestAnimationFrame(tick);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, [directions, handleKeyDown, handleKeyUp, onChangeWorld]);

    useEffect(() => {
        if (!characterRef.current || !mapRef.current) return;

        const pixelSize = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--pixel-size') || '3'
        );

        const CAMERA_LEFT_OFFSET_PX = 206;
        const CAMERA_TOP_OFFSET_PX = 102;

        const cameraTransformLeft = -gameState.cameraX * pixelSize + (pixelSize * CAMERA_LEFT_OFFSET_PX);
        const cameraTransformTop = -gameState.cameraY * pixelSize + (pixelSize * CAMERA_TOP_OFFSET_PX);

        mapRef.current.style.transform = `translate3d(${cameraTransformLeft}px, ${cameraTransformTop}px, 0)`;
        characterRef.current.style.transform = `translate3d(${gameState.x * pixelSize}px, ${gameState.y * pixelSize}px, 0)`;
        characterRef.current.setAttribute('facing', gameState.facing);
        characterRef.current.setAttribute('walking', gameState.walking ? 'true' : 'false');
    }, [gameState]);

    function renderGridCells() {
        const gridCell = 48;
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
            <div ref={mapRef} className="map" style={{ backgroundImage: `url(${cityMape})` }}>
                {collision.map((val, idx) => {
                    if (val === 0) return null;
                    const gridCell = 48;
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
                <div
                    ref={characterRef}
                    className="character"
                    facing="down"
                    walking="true"
                >
                    <div className="shadow pixel-art"></div>
                    <div className="character_spritesheet"></div>
                </div>
            </div>
        </div>
    );
}