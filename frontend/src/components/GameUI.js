// frontend/src/components/GameUI.js

import React from 'react';

const GameUI = ({ totalTime, relayTime, currentWord, myHint, maskedWord, gameState, username, isHost, roomId, socket }) => {
    const d1Name = gameState?.drawer1?.username || "Player 1";
    const d2Name = gameState?.drawer2?.username || "Player 2";

    // --- SMART WORD DISPLAY LOGIC ---
    let mainWord = "_ _ _ _ _ _";
    let subHint = "";

    if (currentWord) {
        // Drawers (or Drawer 2 after 60s) see the full word, spaced out nicely
        mainWord = currentWord.split('').join(' '); 
    } else if (maskedWord) {
        // Guessers and Drawer 2 see the masked dashes/revealed letters
        mainWord = maskedWord; 
        
        // ONLY Drawer 2 gets the hint before 60s
        if (myHint) {
            subHint = `(${myHint.toLowerCase()})`;
        }
    }

    return (
        <div className="w-full max-w-4xl flex flex-col gap-2 relative mt-8">
            
            {/* Player Name Tag */}
            <div className="absolute -top-10 left-0 bg-white/20 text-white px-4 py-1 rounded-t-lg border-2 border-b-0 border-white/30 backdrop-blur-sm">
                <span className="text-[10px] font-bold uppercase opacity-70 mr-2">Playing as:</span>
                <span className="font-black text-sm">{username}</span>
            </div>

            <div className="bg-gray-800 text-white p-4 rounded-t-xl flex justify-between items-center">
                {/* Round Count */}
                <div className="text-lg font-bold w-1/4">
                    ROUND {gameState?.currentRound} / {gameState?.totalRounds}
                </div>

                {/* Drawers Highlight */}
                <div className="flex gap-4 justify-center w-2/4">
                    <div className={`px-4 py-1 rounded border-2 ${gameState?.activeDrawer === gameState?.drawer1?.id ? 'border-yellow-400 bg-gray-700' : 'border-transparent'}`}>
                        {d1Name} {gameState?.activeDrawer === gameState?.drawer1?.id && "✏️"}
                    </div>
                    <span className="text-blue-400 font-black">&</span>
                    <div className={`px-4 py-1 rounded border-2 ${gameState?.activeDrawer === gameState?.drawer2?.id ? 'border-yellow-400 bg-gray-700' : 'border-transparent'}`}>
                        {d2Name} {gameState?.activeDrawer === gameState?.drawer2?.id && "✏️"}
                    </div>
                </div>

                {/* Timer & End Game Button */}
                <div className="flex items-center justify-end gap-4 w-1/4">
                    <div className="text-2xl font-mono text-yellow-400 font-black">
                        {totalTime}s
                    </div>
                    {isHost && (
                        <button 
                            onClick={() => socket.emit('end_game_early', roomId)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg border border-red-400 font-bold uppercase text-xs transition-colors shadow-lg"
                        >
                            🛑 End
                        </button>
                    )}
                </div>
            </div>
            
            {/* UNIFIED BANNER */}
            <div className="bg-white p-2 text-center border-2 border-gray-300 rounded-b-lg flex flex-col items-center justify-center min-h-[70px]">
                <p className="tracking-[0.3em] font-black text-2xl uppercase">
                    {mainWord}
                </p>
                {/* HINT DISPLAY (Only renders if subHint is not empty) */}
                {subHint && (
                    <p className="text-sm font-bold text-gray-500 mt-1 tracking-widest">
                        {subHint}
                    </p>
                )}
            </div>
        </div>
    );
};

export default GameUI;