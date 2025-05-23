import { useState, useEffect, useRef, useCallback } from "react";
import "./ObstacleGame.css"; // Make sure the path is correct relative to this file

// Define constants OUTSIDE the component function
const playerVisualSize = 40;
const obstacleVisualSize = 40;
const playerBottomOffsetPx = 40; // The 'bottom: 40px' from your CSS
const GAME_DURATION = 60; // seconds

export default function ObstacleGame() {
	const [gameStarted, setGameStarted] = useState(false);
	const [gameOver, setGameOver] = useState(false);
	const [score, setScore] = useState(0);
	const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
	const [playerPosition, setPlayerPosition] = useState(50); // Horizontal position %
	const [obstacles, setObstacles] = useState([]); // [{ id, x: %, y: % }, ...]
	const [backgroundPosition, setBackgroundPosition] = useState(0); // For background scroll effect

	const gameAreaRef = useRef(null); // Ref to the game area div
	const requestRef = useRef(null); // Ref for requestAnimationFrame ID
	const obstacleTimerRef = useRef(null); // Ref for the setTimeout ID for spawning
	const lastTimeRef = useRef(0); // Ref for timestamp in game loop
	const gameStateRef = useRef({
		// Use a ref to track state without re-renders
		gameStarted: false,
		gameOver: false,
		playerPosition: 50,
		obstacles: [],
	});

	// Update the ref whenever state changes
	useEffect(() => {
		gameStateRef.current = {
			...gameStateRef.current,
			gameStarted,
			gameOver,
			playerPosition,
			obstacles,
		};
	}, [gameStarted, gameOver, playerPosition, obstacles]);

	// Function to end the game
	const endGame = useCallback((survived = false) => {
		console.log(`Game ending. Survived: ${survived}`);
		setGameOver(true);
		setGameStarted(false);

		if (requestRef.current) {
			cancelAnimationFrame(requestRef.current);
			requestRef.current = null;
		}
		if (obstacleTimerRef.current) {
			clearTimeout(obstacleTimerRef.current);
			obstacleTimerRef.current = null;
		}
	}, []);

	// Game loop function with improved collision detection
	const gameLoop = useCallback(
		(timestamp) => {
			const { gameStarted, gameOver, playerPosition, obstacles } =
				gameStateRef.current;

			// Check game state early
			if (!gameStarted || gameOver) {
				return;
			}

			// Calculate delta time with a maximum to prevent huge jumps if tab is inactive
			const deltaTime = Math.min(timestamp - lastTimeRef.current, 50);
			lastTimeRef.current = timestamp;

			// Get game area dimensions for pixel calculations
			const gameAreaDims = gameAreaRef.current
				? {
						width: gameAreaRef.current.offsetWidth,
						height: gameAreaRef.current.offsetHeight,
				  }
				: { width: 500, height: 400 }; // Fallback

			// Update background position
			setBackgroundPosition(
				(prev) => (prev + deltaTime * 0.05) % gameAreaDims.height
			);

			// Create new obstacles array with updated positions
			const updatedObstacles = obstacles
				.map((obstacle) => ({
					...obstacle,
					y: obstacle.y + deltaTime * 0.05, // Move down based on deltaTime
				}))
				.filter((obstacle) => obstacle.y < 100); // Remove off-screen obstacles

			// Check for collisions
			let collisionDetected = false;

			// Player hitbox (in pixels)
			const playerCenterPx = (playerPosition / 100) * gameAreaDims.width;
			const playerLeftPx = playerCenterPx - playerVisualSize / 2;
			const playerRightPx = playerLeftPx + playerVisualSize;
			const playerBottomPx = gameAreaDims.height - playerBottomOffsetPx;
			const playerTopPx = playerBottomPx - playerVisualSize;

			// Player hitbox reduced by 20% for more forgiving collisions
			const hitboxReduction = playerVisualSize * 0.2;
			const playerHitboxLeft = playerLeftPx + hitboxReduction;
			const playerHitboxRight = playerRightPx - hitboxReduction;
			const playerHitboxTop = playerTopPx + hitboxReduction;
			const playerHitboxBottom = playerBottomPx - hitboxReduction;

			// Check each obstacle for collision
			for (const obstacle of updatedObstacles) {
				// Obstacle pixel coordinates
				const obstacleLeftPx = (obstacle.x / 100) * gameAreaDims.width;
				const obstacleTopPx = (obstacle.y / 100) * gameAreaDims.height;

				// Obstacle hitbox reduced by 20% for more forgiving collisions
				const obstacleHitboxReduction = obstacleVisualSize * 0.2;
				const obstacleHitboxLeft = obstacleLeftPx + obstacleHitboxReduction;
				const obstacleHitboxRight =
					obstacleLeftPx + obstacleVisualSize - obstacleHitboxReduction;
				const obstacleHitboxTop = obstacleTopPx + obstacleHitboxReduction;
				const obstacleHitboxBottom =
					obstacleTopPx + obstacleVisualSize - obstacleHitboxReduction;

				// Check for overlap using reduced hitboxes
				const xOverlap =
					playerHitboxLeft < obstacleHitboxRight &&
					playerHitboxRight > obstacleHitboxLeft;
				const yOverlap =
					playerHitboxTop < obstacleHitboxBottom &&
					playerHitboxBottom > obstacleHitboxTop;

				if (xOverlap && yOverlap) {
					console.warn(`COLLISION DETECTED with obstacle ${obstacle.id}!`);
					collisionDetected = true;
					break; // Exit loop early once collision is found
				}
			}

			// Update state only if needed
			if (collisionDetected) {
				endGame(false);
			} else {
				setObstacles(updatedObstacles);
			}

			// Continue the game loop
			requestRef.current = requestAnimationFrame(gameLoop);
		},
		[endGame]
	);

	// Function to start the game
	const startGame = () => {
		console.log("Starting game...");
		setGameStarted(true);
		setGameOver(false);
		setScore(0);
		setTimeLeft(GAME_DURATION);
		setPlayerPosition(50);
		setObstacles([]);
		setBackgroundPosition(0);

		lastTimeRef.current = performance.now();

		// Clear any outstanding frame request before starting
		if (requestRef.current) cancelAnimationFrame(requestRef.current);
		requestRef.current = requestAnimationFrame(gameLoop);
	};

	// Effect for keyboard input with improved boundary calculations
	useEffect(() => {
		const handleKeyDown = (e) => {
			if (!gameStateRef.current.gameStarted || gameStateRef.current.gameOver)
				return;

			const gameAreaWidth = gameAreaRef.current
				? gameAreaRef.current.offsetWidth
				: 500;
			const playerWidthPercent = (playerVisualSize / gameAreaWidth) * 100;
			const moveStep = 3; // Movement step in percentage

			if (e.key === "ArrowLeft") {
				setPlayerPosition((prev) =>
					Math.max(playerWidthPercent / 2, prev - moveStep)
				);
			} else if (e.key === "ArrowRight") {
				setPlayerPosition((prev) =>
					Math.min(100 - playerWidthPercent / 2, prev + moveStep)
				);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	// Effect to manage the obstacle spawning timer with improved cleanup
	useEffect(() => {
		// Clear any existing timer
		if (obstacleTimerRef.current) {
			clearTimeout(obstacleTimerRef.current);
			obstacleTimerRef.current = null;
		}

		if (!gameStarted || gameOver) return;

		const gameAreaWidth = gameAreaRef.current
			? gameAreaRef.current.offsetWidth
			: 500;
		const obstacleWidthPercent = (obstacleVisualSize / gameAreaWidth) * 100;

		const spawnAndScheduleNext = () => {
			// Check game state again when timeout fires
			if (!gameStateRef.current.gameStarted || gameStateRef.current.gameOver)
				return;

			const newObstacle = {
				id: Date.now() + Math.random(),
				x: Math.random() * (100 - obstacleWidthPercent),
				y: 0,
			};

			setObstacles((prev) => [...prev, newObstacle]);

			// Gradually decrease spawn interval as game progresses for increasing difficulty
			const progress = 1 - timeLeft / GAME_DURATION;
			const minDelay = 800 - 400 * progress; // Starts at 800ms, goes down to 400ms
			const maxDelay = 1500 - 700 * progress; // Starts at 1500ms, goes down to 800ms
			const nextDelay = minDelay + Math.random() * (maxDelay - minDelay);

			obstacleTimerRef.current = setTimeout(spawnAndScheduleNext, nextDelay);
		};

		// Start obstacle spawning
		spawnAndScheduleNext();

		return () => {
			if (obstacleTimerRef.current) {
				clearTimeout(obstacleTimerRef.current);
				obstacleTimerRef.current = null;
			}
		};
	}, [gameStarted, gameOver, timeLeft]);

	// Effect for the game timer with improved score handling
	useEffect(() => {
		if (!gameStarted || gameOver) return;

		const timerInterval = setInterval(() => {
			setTimeLeft((prev) => {
				if (prev <= 1) {
					clearInterval(timerInterval);
					endGame(true); // Player survived!
					return 0;
				}

				// Increase score
				setScore((currentScore) => currentScore + 1);
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timerInterval);
	}, [gameStarted, gameOver, endGame]);

	// Clean up all timers and animations on unmount
	useEffect(() => {
		return () => {
			if (requestRef.current) cancelAnimationFrame(requestRef.current);
			if (obstacleTimerRef.current) clearTimeout(obstacleTimerRef.current);
		};
	}, []);

	return (
		<div className="game-container">
			<div className="game-stats">
				<div className="stat-item">Score: {score}</div>
				<div className="stat-item">Time: {timeLeft}s</div>
			</div>

			<div
				ref={gameAreaRef}
				className="game-area"
				style={{ backgroundPositionY: `${backgroundPosition}px` }}>
				{/* Player with improved positioning */}
				<div
					className="player"
					style={{
						left: `calc(${playerPosition}% - ${playerVisualSize / 2}px)`,
						bottom: `${playerBottomOffsetPx}px`,
						width: `${playerVisualSize}px`,
						height: `${playerVisualSize}px`,
					}}
				/>

				{/* Obstacles with improved rendering */}
				{obstacles.map((obstacle) => (
					<div
						key={obstacle.id}
						className="obstacle"
						style={{
							width: `${obstacleVisualSize}px`,
							height: `${obstacleVisualSize}px`,
							left: `${obstacle.x}%`,
							top: `${obstacle.y}%`,
						}}
					/>
				))}

				{/* Game overlay (Start/End screens) */}
				{!gameStarted && (
					<div className="game-overlay">
						<h2 className="game-title">
							{gameOver
								? timeLeft <= 0
									? "You Won!"
									: "Game Over!"
								: "Obstacle Avoidance"}
						</h2>
						{gameOver && (
							<p className="game-score">Your final score: {score}</p>
						)}
						<button className="game-button" onClick={startGame}>
							{gameOver ? "Play Again" : "Start Game"}
						</button>
						<div className="game-instructions">
							<p>Use left and right arrow keys to move</p>
							<p>Avoid obstacles for 60 seconds to win!</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
