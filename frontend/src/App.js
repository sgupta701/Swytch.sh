// frontend/src/App.js

import React, { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import io from 'socket.io-client';
import Canvas from './components/Canvas';
import Chat from './components/Chat';
import GameUI from './components/GameUI';
import Lobby from './components/Lobby';
import './App.css';

const socket = io.connect(
  process.env.NODE_ENV === "production" 
  ? "https://xyz.onrender.com" 
  : "http://localhost:4000"
);

// pixelart avatar
// const AVATARS = Array.from({length: 50}, (_, i) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${i + 1}`);


const AVATARS = Array.from({length: 50}, (_, i) => `https://api.dicebear.com/7.x/adventurer/svg?seed=${i + 1}`);
function App() {
  const [view, setView] = useState('landing'); 
  const [username, setUsername] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomData, setRoomData] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [timers, setTimers] = useState({ total: 90, relay: 15 });
  const [mySecretWord, setMySecretWord] = useState("");
  const [showReveal, setShowReveal] = useState(false);

  const [avatarIndex, setAvatarIndex] = useState(0);
  const [showAvatarGrid, setShowAvatarGrid] = useState(false);

  const [finalScores, setFinalScores] = useState([]);

  const [myHint, setMyHint] = useState("");         
  const [maskedWord, setMaskedWord] = useState(""); 
  const [wordChoices, setWordChoices] = useState([]);
  
    const [showHowToPlay, setShowHowToPlay] = useState(false); 

  useEffect(() => {
    // --- LOBBY LISTENERS ---
    socket.on('room_created', (data) => {
      setRoomData(data);
      setView('lobby');
    });

    socket.on('update_room', (data) => {
      setRoomData(data);
      
      setView((prevView) => {
        if (prevView === 'landing') return 'lobby';
        return prevView;
      });
    });

    socket.on('error_message', (msg) => {
      toast.error(msg);
    });

    socket.on('round_init', (data) => {
      setGameState(data);
      setView('game');
      setMySecretWord(""); 
      setMyHint("");
      setMaskedWord("");
      setWordChoices([]);
      setShowReveal(true);
    });

    socket.on('word_choices', (choices) => setWordChoices(choices));
    
    socket.on('round_start', (data) => {
      setShowReveal(false); 
      setTimers({ total: data.totalTime, relay: 20 });
    });

    socket.on('secret_hint', (data) => setMyHint(data.hint));
    
    socket.on('secret_word', (data) => setMySecretWord(data.word));

    socket.on('timer_update', (data) => {
      setTimers({ total: data.total, relay: data.relay });
      if (data.maskedWord) setMaskedWord(data.maskedWord);
    });

    socket.on('switch_turn', (data) => {
      setGameState(prev => ({ ...prev, activeDrawer: data.activeDrawer }));
    });

    socket.on('kicked', () => {
      toast.error("You were kicked by the host.");
      setView('landing');
      setRoomData(null);
      setRoomId(""); 
    });

    socket.on('game_over', (finalPlayers) => {
      const sorted = [...finalPlayers].sort((a, b) => b.score - a.score);
      setFinalScores(sorted);
      setView('game_over');

      setTimeout(() => {
        setView('lobby');
      }, 10000);
    });

    socket.on('game_ended_early', () => {
      toast.error("The host ended the game midway.");
      setView('lobby');
    });

    return () => {
      socket.off('room_created');
      socket.off('update_room');
      socket.off('error_message');
      socket.off('round_init');
      socket.off('secret_word');
      socket.off('timer_update');
      socket.off('switch_turn');
      socket.off('game_over');
      socket.off('kicked');
      socket.off('game_ended_early');
    };
  }, []);

  const handleCreateRoom = () => {
    if (!username.trim()) return toast.error("Enter a name!");
    socket.emit('create_room', { username: username.trim(), avatar: AVATARS[avatarIndex], settings: { rounds: 3, time: 90 } });
  };

  const handleJoinRoom = () => {
    if (!username.trim() || !roomId.trim()) return toast.error("Enter name and Room ID!");
    socket.emit('join_room', { roomId: roomId.trim().toUpperCase(), username: username.trim(), avatar: AVATARS[avatarIndex] });
  };

  const handleStartGame = () => {
    socket.emit('start_game', roomData.id);
  };

  const nextAvatar = () => setAvatarIndex((prev) => (prev + 1) % AVATARS.length);
  const prevAvatar = () => setAvatarIndex((prev) => (prev - 1 + AVATARS.length) % AVATARS.length);
  const randomAvatar = () => setAvatarIndex(Math.floor(Math.random() * AVATARS.length));

// LANDING SCREEN 
  if (view === 'landing') {
    return (
      <div className="h-screen flex flex-col items-center justify-center font-sans relative" style={{ backgroundImage: "linear-gradient(rgba(20, 30, 48, 0.7), rgba(20, 30, 48, 0.7)), url('/background.png')", backgroundSize: 'cover', backgroundPosition: 'contain', backgroundRepeat: 'no-repeat' }}>
        <Toaster position="top-center" />

        <button 
          onClick={() => setShowHowToPlay(true)} 
          className="absolute top-6 right-6 bg-white/70 backdrop-blur-sm text-[#3052ad] px-5 py-2 rounded-2xl shadow-[0_4px_0_rgba(20,40,90,0.5)] hover:translate-y-1 hover:shadow-none transition-all font-black uppercase tracking-widest z-10"
          style={{ fontFamily: "'Fredoka One', 'Comic Sans MS', cursive" }}
        >
          How to Play ❓
        </button>

        {showHowToPlay && (
          <div className="absolute inset-0 z-50 bg-black/30 backdrop-blur-md flex items-center justify-center p-4">
            <div 
              className="bg-white/60 backdrop-blur-lg rounded-3xl p-6 max-w-4xl w-full mx-4 relative shadow-2xl border-4 border-[#3052ad] animate-slide-up" 
              style={{ fontFamily: "'Fredoka One', 'Comic Sans MS', cursive" }}
            >
              <button 
                onClick={() => setShowHowToPlay(false)} 
                className="absolute top-4 right-6 text-3xl text-gray-200 hover:text-red-500 transition-colors"
              >
                ✖
              </button>
              
              <h2 className="text-3xl text-[#3052ad] mb-2 text-center tracking-wide">How to Play!</h2>
              
              <p className="text-center text-base text-gray-600 mb-6 font-sans font-bold">
                two players are randomly chosen to draw together in the beginning of every round
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-800 text-left font-sans">
                
                <div className="bg-[#e6f4ea]/80 p-4 rounded-xl border-2 border-[#bce4c6] flex flex-col items-center transform -rotate-1 hover:rotate-0 transition-transform shadow-sm">
                  <span className="text-[#43b330] text-xl block mb-2 leading-tight font-black text-center" style={{ fontFamily: "'Fredoka One', cursive" }}>Drawer 1<br/><span className="text-sm opacity-80">(The Starter)</span></span> 
                  <p className="text-sm leading-relaxed font-bold">You know the secret word! You get the first 20 seconds to start scribbling.</p>
                </div>

                <div className="bg-[#fff9e6]/80 p-4 rounded-xl border-2 border-[#ffecb3] flex flex-col items-center transform rotate-1 hover:rotate-0 transition-transform shadow-sm">
                  <span className="text-yellow-600 text-xl block mb-2 leading-tight font-black text-center" style={{ fontFamily: "'Fredoka One', cursive" }}>Drawer 2<br/><span className="text-sm opacity-80">(The Finisher)</span></span> 
                  <p className="text-sm leading-relaxed font-bold">You start with just a hint! Pick up exactly where Drawer 1 left off. The pen <strong>SWYTCHes</strong> between you two every 20 seconds! <br/><span className="text-[11px] text-yellow-700 opacity-80 mt-2 block text-center">(and don't worry, the real word is revealed to you after 60 seconds!)</span></p>
                </div>

                <div className="bg-[#f3e5f5]/80 p-4 rounded-xl border-2 border-[#e1bee7] flex flex-col items-center transform -rotate-1 hover:rotate-0 transition-transform shadow-sm">
                  <span className="text-purple-600 text-xl block mb-2 leading-tight font-black text-center" style={{ fontFamily: "'Fredoka One', cursive" }}>The Guessers<br/><span className="text-sm opacity-80">(Everyone Else)</span></span> 
                  <p className="text-sm leading-relaxed font-bold">Type your guesses in the chat! The fastest guesser gets the most points. <br/><span className="text-[11px] text-purple-700 opacity-80 mt-2 block text-center">(Drawer's score is based on how fast you guys guess!)</span></p>
                </div>
              </div>

              <p className="text-center text-sm text-gray-600 mt-6 mb-4 font-sans font-bold italic opacity-100 px-10">
                Host can adjust the no. of rounds and time per round in the lobby. At the end, the player with the most points wins!
              </p>

              <button 
                onClick={() => setShowHowToPlay(false)} 
                className="w-64 mx-auto block bg-[#3052ad] text-white py-3 rounded-xl shadow-[0_4px_0_rgb(20,40,90)] hover:translate-y-1 hover:shadow-none transition-all text-xl uppercase tracking-wider"
              >
                Got it? Let's Go! 
              </button>
            </div>
          </div>
        )}

        {/* MAIN LOGIN BOX */}
        <div className="bg-white/40  p-10 rounded-2xl shadow-2xl w-96 text-center border-b-8 border-black/20">
          <h1 
            className="animate-tick-tock text-5xl text-[#3052ad] mb-8 font-black tracking-wide" 
            style={{ fontFamily: "'Fredoka One', 'Comic Sans MS', cursive" }}
          >
            swytch.sh
          </h1>      
          
          <div className="bg-[#28448f] rounded-xl p-4 mb-6 relative select-none">
            <button 
              onClick={randomAvatar} 
              className="absolute top-2 right-2 text-white/50 hover:text-white transition-colors z-10 text-xl"
            >
              🔄
            </button>

            <div className="flex items-center justify-between">
                <button onClick={prevAvatar} className="text-white text-4xl font-black hover:scale-110 transition-transform">❮</button>
                
                <div 
                    onClick={() => setShowAvatarGrid(!showAvatarGrid)}
                    className="w-24 h-24 bg-black/20 rounded-xl cursor-pointer hover:bg-black/40 transition-colors flex items-center justify-center border-4 border-transparent hover:border-white/50"
                    title="Click to see all avatars!"
                >
                    <img src={AVATARS[avatarIndex]} alt="Avatar" className="w-20 h-20" />
                </div>
                
                <button onClick={nextAvatar} className="text-white text-4xl font-black hover:scale-110 transition-transform">❯</button>
            </div>

            {/* AVATAR GRID */}
            {showAvatarGrid && (
                <div className="absolute top-full left-0 w-full bg-white/95 backdrop-blur-md border-4 border-[#28448f] rounded-xl mt-2 p-2 grid grid-cols-5 gap-2 h-64 overflow-y-auto z-50 shadow-2xl">
                    {AVATARS.map((av, idx) => (
                        <img 
                            key={idx} 
                            src={av} 
                            alt={`av-${idx}`} 
                            onClick={() => { setAvatarIndex(idx); setShowAvatarGrid(false); }}
                            className={`w-12 h-12 rounded cursor-pointer hover:bg-gray-200 border-2 ${avatarIndex === idx ? 'border-blue-500 bg-blue-100' : 'border-transparent'}`}
                        />
                    ))}
                </div>
            )}
          </div>
          
          <input 
            className="w-full bg-white/60 p-3 rounded-lg mb-4 font-bold focus:border-blue-400"
            placeholder="YOUR NAME"
            maxLength={12}
            value={username}
            onChange={(e) => setUsername(e.target.value.toUpperCase())}
          />
          <div className="flex flex-col gap-3">
            <button onClick={handleCreateRoom} className="bg-[#43b330] hover:bg-[#3da32b] text-white font-black py-3 rounded-lg shadow-[0_5px_0_rgb(34,92,24)] transition-all active:translate-y-1 active:shadow-none">CREATE ROOM</button>
            <div className="flex gap-2">
              <input 
                className="flex-1 bg-white/60 p-3 rounded-lg mb-4 font-bold focus:border-blue-400"
                placeholder="ROOM ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              />
              <button onClick={handleJoinRoom} className="bg-[#3052ad] hover:bg-[#28448f] text-white font-black px-6 rounded-lg shadow-[0_5px_0_rgb(30,51,107)] transition-all active:translate-y-1 active:shadow-none">JOIN</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOBBY SCREEN 
  if (view === 'lobby') {
    return (
  <div className="min-h-screen" style={{ backgroundImage: "linear-gradient(rgba(20, 30, 48, 0.7), rgba(20, 30, 48, 0.7)), url('/background.png')", backgroundSize: 'contain', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
    <Lobby 
      roomData={roomData} 
      isHost={socket.id === roomData.host} 
      onStart={handleStartGame} 
      socket={socket}
    />
  </div>
);
  }

  // GAME SCREEN
  if (view === 'game') {
    let myRole = "GUESSER";
if (socket.id === (gameState?.drawer1?.id || gameState?.drawer1)) myRole = "DRAWER 1 (FOUNDATION)";
else if (socket.id === (gameState?.drawer2?.id || gameState?.drawer2)) myRole = "DRAWER 2 (FINISHER)";    return (
      <div className="min-h-screen flex flex-col items-center justify-start py-10 font-sans relative" style={{ backgroundImage: "linear-gradient(rgba(20, 30, 48, 0.7), rgba(20, 30, 48, 0.7)), url('/background.png')", backgroundSize: 'contain', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>        <Toaster position="top-center" />
        {showReveal && (
            <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center animate-fade-in-out">
                <div className="bg-white p-6 rounded-2xl text-center shadow-2xl max-w-sm w-full">
                    <h1 className="text-2xl font-black text-[#3052ad] mb-4">ROUND {gameState?.currentRound}</h1>
                    
                    {socket.id === gameState?.drawer1?.id ? (
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">You are drawing first! Pick a word:</p>
                            <div className="flex flex-col gap-2">
                                {wordChoices.map((choice, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => socket.emit('choose_word', { roomId: roomData.id, wordObj: choice })}
                                        className="bg-[#43b330] hover:bg-[#3da32b] text-white font-black py-2 rounded-lg shadow-[0_4px_0_rgb(34,92,24)] transition-all active:translate-y-1 active:shadow-none text-sm tracking-widest uppercase"
                                    >
                                        {choice.word}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">Your Role:</p>
                            <div className="bg-yellow-400 text-black px-4 py-2 rounded-xl text-lg font-black border-4 border-black mb-4 inline-block">
                                {myRole}
                            </div>
                            <p className="animate-pulse text-xs text-gray-400 font-bold uppercase">Waiting for Drawer 1...</p>
                        </div>
                    )}
                </div>
            </div>
        )}
        <GameUI 
            totalTime={timers.total} 
            relayTime={timers.relay}
            gameState={gameState}
            currentWord={mySecretWord}
            myHint={myHint}                
            maskedWord={maskedWord}         
            username={username}
            roomId={roomData.id}                  
            isHost={socket.id === roomData.host}  
            socket={socket}                      
        />
        
        <div className="flex gap-4 mt-4 w-full justify-center items-start px-4">
          <div className="w-80 bg-white rounded-xl shadow-xl overflow-hidden border-b-4 border-black/10 flex-shrink-0">
             <div className="bg-gray-200 p-3 font-black text-gray-700 border-b-2 border-gray-300 uppercase text-sm tracking-widest">Players</div>
             <div className="p-2">
               {roomData.players.map((p, idx) => (
                 <div key={p.id} className={`flex justify-between items-center p-2 mb-1 rounded ${gameState?.activeDrawer === p.id ? 'bg-yellow-100 ring-2 ring-yellow-400 font-bold' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-xs font-bold text-gray-400">#{idx+1}</span>
                        <img src={p.avatar} alt="av" className="w-8 h-8 rounded bg-gray-200" />
                        <span className="truncate flex items-center gap-1">
                            {p.username}
                            {p.id === socket.id && <span className="text-[10px] text-[#3052ad] font-black tracking-widest">(YOU)</span>}
                        {roomData.host === socket.id && p.id !== socket.id && (
                                <button 
                                    onClick={() => socket.emit('kick_player', { roomId: roomData.id, playerId: p.id })}
                                    className="ml-2 text-[10px] bg-red-100 text-red-600 font-black px-2 py-0.5 rounded hover:bg-red-500 hover:text-white uppercase transition-colors border border-red-200"
                                >
                                    Kick
                                </button>
                            )}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-black text-[#3052ad]">{p.score}</span>
                        {gameState?.activeDrawer === p.id && <span className="animate-bounce">✏️</span>}
                    </div>
                 </div>
               ))}
             </div>
          </div>

          <Canvas socket={socket} roomId={roomData.id} isActive={socket.id === gameState?.activeDrawer} />
          <Chat socket={socket} roomId={roomData.id} username={username} />
        </div>
      </div>
    );
  }

  // GAME OVER SCREEN
  if (view === 'game_over') {
    // Grab top 3 players
    const first = finalScores[0];
    const second = finalScores[1];
    const third = finalScores[2];

    return (
      <div className="h-screen flex flex-col items-center justify-center font-sans relative overflow-hidden" style={{ backgroundImage: "linear-gradient(rgba(20, 30, 48, 0.7), rgba(20, 30, 48, 0.7)), url('/background.png')", backgroundSize: 'contain', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
        <Toaster position="top-center" />
        <div className="absolute inset-0 pointer-events-none flex justify-around">
            {[...Array(20)].map((_, i) => (
                <div key={i} className="animate-bounce text-4xl" style={{
                    animationDuration: `${Math.random() * 2 + 1}s`,
                    animationDelay: `${Math.random()}s`,
                    opacity: 0.7
                }}>
                    {i % 2 === 0 ? '✨' : '🎉'}
                </div>
            ))}
        </div>

        <h1 className="text-7xl font-black text-yellow-400 mb-16 tracking-tighter drop-shadow-lg z-10 uppercase italic">
            MATCH COMPLETE!
        </h1>

        <div className="flex items-end gap-4 h-96 z-10">
            
            {second && (
                <div className="flex flex-col items-center justify-end h-[80%] animate-slide-up" style={{ animationDelay: '0.5s' }}>
                    <div className="bg-gray-300 w-32 h-40 rounded-t-xl border-4 border-gray-400 flex flex-col items-center justify-center relative shadow-2xl">
                        <img src={second.avatar} alt="rank2" className="w-16 h-16 rounded-lg bg-white absolute -top-8 border-4 border-gray-400" />
                        <span className="text-4xl font-black text-gray-500 mt-4">2</span>
                        <span className="font-bold text-gray-800 uppercase truncate w-28 text-center mt-2">{second.username}</span>
                        <span className="font-black text-[#3052ad] text-xl">{second.score}</span>
                    </div>
                </div>
            )}

            {first && (
                <div className="flex flex-col items-center justify-end h-full animate-slide-up">
                    <div className="text-6xl mb-2 animate-pulse">👑</div>
                    <div className="bg-yellow-400 w-40 h-56 rounded-t-xl border-4 border-yellow-500 flex flex-col items-center justify-center relative shadow-2xl z-20">
                        <img src={first.avatar} alt="rank1" className="w-20 h-20 rounded-lg bg-white absolute -top-10 border-4 border-yellow-500" />
                        <span className="text-6xl font-black text-yellow-600 mt-6">1</span>
                        <span className="font-bold text-gray-900 uppercase truncate w-36 text-center mt-2 text-lg">{first.username}</span>
                        <span className="font-black text-[#3052ad] text-2xl">{first.score}</span>
                    </div>
                </div>
            )}

            {third && (
                <div className="flex flex-col items-center justify-end h-[60%] animate-slide-up" style={{ animationDelay: '1s' }}>
                    <div className="bg-[#cd7f32] w-32 h-32 rounded-t-xl border-4 border-[#a05d20] flex flex-col items-center justify-center relative shadow-2xl">
                        <img src={third.avatar} alt="rank3" className="w-16 h-16 rounded-lg bg-white absolute -top-8 border-4 border-[#a05d20]" />
                        <span className="text-4xl font-black text-[#8b5a2b] mt-4">3</span>
                        <span className="font-bold text-gray-900 uppercase truncate w-28 text-center mt-2">{third.username}</span>
                        <span className="font-black text-[#3052ad] text-xl">{third.score}</span>
                    </div>
                </div>
            )}
        </div>

        {finalScores.length > 3 && (
            <div className="mt-8 flex gap-4 bg-white/10 p-4 rounded-2xl z-10 backdrop-blur-sm">
                {finalScores.slice(3).map((p, idx) => (
                    <div key={p.id} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg font-bold">
                        <span className="text-gray-400">#{idx + 4}</span>
                        <img src={p.avatar} alt="av" className="w-6 h-6 rounded" />
                        <span className="uppercase">{p.username}</span>
                        <span className="text-[#3052ad]">{p.score}</span>
                    </div>
                ))}
            </div>
        )}

        <div className="absolute bottom-10 text-white/50 font-bold uppercase tracking-widest animate-pulse">
            Returning to lobby in 10 seconds...
        </div>
      </div>
    );
  }

}
export default App;