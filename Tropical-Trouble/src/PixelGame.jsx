import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export default function PixelGame() {
    const characterRef = useRef(null);
    const mapRef = useRef(null);
    const [gameState, setGameState] = useState({
        x: 90,
        y: 34,
        pressedDirections: [],
        facing: "down",
        walking: false,
        cameraX: 90,
        cameraY: 34,
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

        const stepTime = 1 / 60;

        function lerp(currentValue, destinationValue, time) {
            return currentValue * (1 - time) + destinationValue * time;
        }

        const placeCharacter = () => {
            setGameState(prev => {
                let { x, y, cameraX, cameraY, pressedDirections, facing, walking } = prev;

                const direction = pressedDirections[0];
                walking = false;

                if (direction) {
                    if (direction === directions.right) x += speed;
                    if (direction === directions.left) x -= speed;
                    if (direction === directions.down) y += speed;
                    if (direction === directions.up) y -= speed;
                    facing = direction;
                    walking = true;
                }

                const leftLimit = -8;
                const rightLimit = (16 * 11) + 8;
                const topLimit = -8 + 32;
                const bottomLimit = (16 * 7);

                x = Math.max(leftLimit, Math.min(rightLimit, x));
                y = Math.max(topLimit, Math.min(bottomLimit, y));

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
    }, [directions, handleKeyDown, handleKeyUp]);

    useEffect(() => {
        if (!characterRef.current || !mapRef.current) return;

        const pixelSize = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--pixel-size') || '4'
        );

        const CAMERA_LEFT_OFFSET_PX = 66;
        const CAMERA_TOP_OFFSET_PX = 42;

        const cameraTransformLeft = -gameState.cameraX * pixelSize + (pixelSize * CAMERA_LEFT_OFFSET_PX);
        const cameraTransformTop = -gameState.cameraY * pixelSize + (pixelSize * CAMERA_TOP_OFFSET_PX);

        mapRef.current.style.transform = `translate3d(${cameraTransformLeft}px, ${cameraTransformTop}px, 0)`;
        characterRef.current.style.transform = `translate3d(${gameState.x * pixelSize}px, ${gameState.y * pixelSize}px, 0)`;
        characterRef.current.setAttribute('facing', gameState.facing);
        characterRef.current.setAttribute('walking', gameState.walking ? 'true' : 'false');
    }, [gameState]);

    return (
        <div className="frame">
            <div className="game-screen">
                <div ref={mapRef} className="map pixel-art">
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
        </div>
    );
}
