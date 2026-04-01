// frontend/src/components/Lobby.js

import React from 'react';
import toast, { Toaster } from 'react-hot-toast';

const Lobby = ({ roomData, isHost, onStart, socket }) => {
    
    const handleSettingChange = (key, value) => {
        if (!isHost) return;
        const newSettings = { ...roomData.settings, [key]: value };
        socket.emit('change_settings', { roomId: roomData.id, settings: newSettings });
    };

    return (
        <div className="min-h-screen bg-transparent p-4 flex items-center justify-center font-sans">
            <Toaster position="top-center" />
            <div className="max-w-5xl w-full bg-white/75 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px] border-8 border-white/20">
                {/* LEFT: PLAYER LIST */}
                <div className="w-full md:w-80 bg-transparent border-r-4 border-gray-200/50 p-6 overflow-y-auto">
                    <h2 className="font-black text-2xl mb-6 text-gray-800 border-b-4 border-[#3052ad] pb-2 uppercase tracking-tight">Players ({roomData.players.length}/8)</h2>
                    <div className="space-y-3">
                        {roomData.players.map((p, index) => (
                            <div key={p.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border-2 border-gray-200 font-bold relative">
                                <span className="text-[#3052ad] font-black">#{index + 1}</span>
                                <img src={p.avatar || "https://api.dicebear.com/7.x/pixel-art/svg?seed=1"} alt="avatar" className="w-10 h-10 rounded-lg bg-gray-200" />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="truncate uppercase leading-tight">{p.username}</span>
                                    {p.id === socket.id && <span className="text-[10px] text-gray-500 font-black tracking-widest">THAT'S YOU!</span>}
                                </div>
                                
                                {p.isHost ? (
                                    <span title="Host" className="absolute right-3 top-4">👑</span>
                                ) : (
                                    isHost && (
                                        <button 
                                            onClick={() => socket.emit('kick_player', { roomId: roomData.id, playerId: p.id })}
                                            className="absolute right-3 top-4 text-[10px] bg-red-100 text-red-600 font-black px-3 py-1.5 rounded-lg hover:bg-red-500 hover:text-white transition-colors uppercase shadow-sm border border-red-200"
                                        >
                                            Kick
                                        </button>
                                    )
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: SETTINGS */}
                <div className="flex-1 p-10 flex flex-col justify-between bg-transparent">
                    <div>
                        <div className="flex justify-between items-start mb-10">
                            <div>
          <h1 
            className="text-5xl text-[#3052ad] font-black tracking-wide"
            style={{ fontFamily: "'Fredoka One', 'Comic Sans MS', cursive" }}
          >LOBBY</h1>                    
          <h1 
            className="animate-tick-tock text-3xl text-[#3052ad] font-black tracking-wide"
            style={{ fontFamily: "'Fredoka One', 'Comic Sans MS', cursive" }}
          >
          <i>swytch.sh</i>   
          </h1>
          
                                <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-xs">Waiting for players...</p>
                            </div>
                            <div className="bg-white border-4 border-[#3052ad] px-6 py-3 rounded-2xl text-center shadow-lg">
                                <p className="text-[10px] font-black text-gray-400 uppercase">Room Code</p>
                                <p className="text-3xl font-black text-[#3052ad] tracking-widest leading-none">{roomData.id}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-8 max-w-sm">
                            <div className="flex items-center justify-between">
                                <label className="font-black text-gray-600 uppercase text-sm">Draw Time</label>
                                <select 
                                    disabled={!isHost}
                                    value={roomData.settings.time}
                                    onChange={(e) => handleSettingChange('time', parseInt(e.target.value))}
                                    className="p-3 bg-white border-4 border-gray-200 rounded-xl font-black text-[#3052ad] w-44 outline-none focus:border-[#3052ad] transition-colors disabled:opacity-100"
                                >
                                    <option value={90}>90 Seconds</option>
                                    <option value={100}>100 Seconds</option>
                                    <option value={110}>110 Seconds</option>
                                    <option value={120}>120 Seconds</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="font-black text-gray-600 uppercase text-sm">Rounds</label>
                                <select 
                                    disabled={!isHost}
                                    value={roomData.settings.rounds}
                                    onChange={(e) => handleSettingChange('rounds', parseInt(e.target.value))}
                                    className="p-3 bg-white border-4 border-gray-200 rounded-xl font-black text-[#3052ad] w-44 outline-none focus:border-[#3052ad] transition-colors disabled:opacity-100"
                                >
                                    <option value={3}>3 Rounds</option>
                                    <option value={4}>4 Rounds</option>
                                    <option value={5}>5 Rounds</option>
                                    <option value={6}>6 Rounds</option>
                                    <option value={7}>7 Rounds</option>
                                    <option value={8}>8 Rounds</option>
                                    <option value={9}>9 Rounds</option>
                                    <option value={10}>10 Rounds</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            className="flex-1 bg-white border-4 border-gray-200 hover:border-[#3052ad] text-gray-400 hover:text-[#3052ad] font-black py-4 rounded-2xl transition-all uppercase tracking-widest text-sm"
                            onClick={() => {
                                navigator.clipboard.writeText(roomData.id);
                                toast.success("Room Code Copied!");
                            }}
                        >
                            Copy Link
                        </button>
                        {isHost && (
                            <button 
                                onClick={onStart}
                                className="flex-[2] bg-[#43b330] hover:bg-[#3da32b] text-white font-black py-4 rounded-2xl shadow-[0_6px_0_rgb(34,92,24)] transition-all active:translate-y-1 active:shadow-none text-xl uppercase tracking-tighter"
                            >
                                Start Game!
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Lobby;