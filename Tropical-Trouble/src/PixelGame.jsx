import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './PixelGame.css'

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
        if (dir && !gameState.pressedDirections.includes(dir)) {
            setGameState(prev => ({
                ...prev,
                pressedDirections: [dir, ...prev.pressedDirections],
            }));
        }
    }, [keys, gameState.pressedDirections]);

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
        const stepTime = 1 / 60;

        function lerp(currentValue, destinationValue, time) {
            return currentValue * (1 - time) + destinationValue * time;
        }

        const placeCharacter = () => {
            setGameState(prev => {
                let newX = prev.x;
                let newY = prev.y;
                let newCameraX = prev.cameraX;
                let newCameraY = prev.cameraY;
                let facing = prev.facing;
                let walking = false;

                const direction = prev.pressedDirections[0];

                if (direction) {
                    if (direction === directions.right) newX += speed;
                    if (direction === directions.left) newX -= speed;
                    if (direction === directions.down) newY += speed;
                    if (direction === directions.up) newY -= speed;
                    facing = direction;
                    walking = true;
                }

                const leftLimit = -8;
                const rightLimit = (16 * 11) + 8;
                const topLimit = -8 + 32;
                const bottomLimit = (16 * 7);

                if (newX < leftLimit) newX = leftLimit;
                if (newX > rightLimit) newX = rightLimit;
                if (newY < topLimit) newY = topLimit;
                if (newY > bottomLimit) newY = bottomLimit;

                const LOOKAHEAD_DISTANCE = 6;
                let lookaheadX = 0;
                let lookaheadY = 0;

                if (direction === directions.left) lookaheadX -= LOOKAHEAD_DISTANCE;
                if (direction === directions.right) lookaheadX += LOOKAHEAD_DISTANCE;
                if (direction === directions.up) lookaheadY -= LOOKAHEAD_DISTANCE;
                if (direction === directions.down) lookaheadY += LOOKAHEAD_DISTANCE;

                let cameraDstX = newX + lookaheadX;
                let cameraDstY = newY + lookaheadY;

                const lerpSpeed = 0.1;
                newCameraX = lerp(prev.cameraX, cameraDstX, lerpSpeed);
                newCameraY = lerp(prev.cameraY, cameraDstY, lerpSpeed);

                return {
                    ...prev,
                    x: newX,
                    y: newY,
                    cameraX: newCameraX,
                    cameraY: newCameraY,
                    facing,
                    walking,
                };
            });
        };

        const tick = () => {
            placeCharacter();
            requestAnimationFrame(tick);
        };

        requestAnimationFrame(tick);

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
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

        mapRef.current.style.transform = 'translate3d(${cameraTransformLeft}px, ${cameraTransformTop}px, 0)';

        characterRef.current.style.transform = 'translate3d(${gameState.x * pixelSize}px, ${gameState.y * pixelSize}px, 0)';
    }, [gameState]);

    return (
        <div className="bg-purple-500 h-screen flex items-center justify-center overflow-hidden">
            <div className="relative w-[calc(var(--pixel-size)*160)] h-[calc(var(--pixel-size)*144)] outline-white outline outline-[length:var(--pixel-size)] z-10">
                <div className="w-[calc(var(--pixel-size)*160)] h-[calc(var(--pixel-size)*144)] overflow-hidden bg-sky-400">
                    <div ref={mapRef} className="pixel-art w-[calc(13*var(--grid-cell))] h-[calc(10*var(--grid-cell))] relative" style={{
                        backgroundImage: "url('https://assets.codepen.io/21542/CameraDemoMap.png')",
                        backgroundSize: "100%",
                        imageRendering: "pixelated"
                    }}>
                        <div
                            ref={characterRef}
                            className="absolute w-[calc(var(--grid-cell)*2)] h-[calc(var(--grid-cell)*2)] overflow-hidden"
                            data-facing={gameState.facing}
                            data-walking={gameState.walking}
                        >
                            <div className="absolute w-[calc(var(--grid-cell)*2)] h-[calc(var(--grid-cell)*2)] left-0 top-0 pixel-art" style={{
                                background: "url('https://assets.codepen.io/21542/DemoRpgCharacterShadow.png') no-repeat no-repeat",
                                backgroundSize: "100%",
                                imageRendering: "pixelated"
                            }}></div>
                            <div className="absolute pixel-art characters-1" style={{
                                background: "url('https://assets.codepen.io/21542/DemoRpgCharacter.png') no-repeat no-repeat",
                                backgroundSize: "100%",
                                width: "calc(var(--grid-cell)*8)",
                                height: "calc(var(--grid-cell)*8)",
                                imageRendering: "pixelated",
                                backgroundPositionY: gameState.facing === "right" ? "calc(var(--pixel-size) * -32)" :
                                    gameState.facing === "up" ? "calc(var(--pixel-size) * -64)" :
                                        gameState.facing === "left" ? "calc(var(--pixel-size) * -96)" : "0",
                                animation: gameState.walking ? "walkAnimation 0.6s steps(4) infinite" : "none"
                            }}></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}