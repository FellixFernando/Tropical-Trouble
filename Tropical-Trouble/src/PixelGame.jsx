import City from "./game-screen/game-map/city";
// import Beach from "./game-screen/game-map/beach";

export default function PixelGame() {
	return (
		<div className="frame">
			<div className="game-screen">
				<City />
			</div>
		</div>
	);
}
