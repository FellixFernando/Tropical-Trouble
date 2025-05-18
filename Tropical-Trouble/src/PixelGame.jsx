
import { useState } from 'react';
import City from './game-screen/game-map/city';
import Beach from './game-screen/game-map/beach'; 
import Forest from './game-screen/game-map/forest'; 
// import CityTown from "./game-screen/game-map/cityTown";
// import CityNight from "./game-screen/game-map/cityNight";
import './pixelgame.css';

export default function PixelGame() {
    const [currentWorld, setCurrentWorld] = useState('city');
    // const [beachStart, setBeachStart] = useState({ x: 5 * 32, y: 2 * 32 }); // Anda bisa simpan atau hapus ini jika tidak diperlukan untuk transisi spesifik ini

    // Ubah handleChangeWorld agar bisa menerima posisi (opsional untuk kasus ini)
    const handleChangeWorld = (newWorld, startPos) => { // startPos bersifat opsional di sini
        // if (newWorld === 'beach' && startPos) { // Logika ini bisa disederhanakan jika startPos tidak digunakan untuk portal ini
        //     setBeachStart(startPos);
        // }
        console.log(`Mengubah dunia ke: ${newWorld}`); // Untuk debugging
        setCurrentWorld(newWorld);
    };

    return (
        <div className="frame">
            <div className="game-screen">
                {currentWorld === 'city' && <City onChangeWorld={handleChangeWorld} />}
                {currentWorld === 'beach' && <Beach onChangeWorld={handleChangeWorld}/>} 
                {currentWorld === 'forest' && <Forest onChangeWorld={handleChangeWorld}/>}
            </div>
        </div>
    );
}


// import { useState } from "react";
// // import CityTown from "./game-screen/game-map/cityTown";
// import CityNight from "./game-screen/game-map/cityNight";

// export default function PixelGame() {
//     return (
//         <div className="frame">
//             <div className="game-screen">
//                 <CityNight />
//             </div>
//         </div>
//     )
// }
