// backend/server.js

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const wordsList = require('./words.json');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

const rooms = {};

function getSafeRoom(room) {
    if (!room) return null;
    const safeRoom = { ...room };
    delete safeRoom.gameInterval;     
    delete safeRoom.selectionTimeout;  
    return safeRoom;
}

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // --- LOBBY LOGIC ---
    socket.on('create_room', ({ username, avatar, settings }) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        socket.join(roomId);
        
        rooms[roomId] = {
            id: roomId, 
            host: socket.id,
            players: [{ id: socket.id, username, avatar, score: 0, isHost: true }],
            settings: settings, 
            isStarted: false, 
            currentRound: 1, 
            usedWords: [],
            banned: [], 
            gameState: {}
        };
        socket.emit('room_created', rooms[roomId]);
    });

    socket.on('join_room', ({ roomId, username, avatar }) => {
        const room = rooms[roomId];
        
        if (!room) return socket.emit('error_message', 'Room not found.');
        if (room.isStarted) return socket.emit('error_message', 'Game has already started.');
        if (room.players.length >= 8) return socket.emit('error_message', 'Room is full.');

        const isBanned = room.banned.some(bannedName => bannedName.toLowerCase() === username.trim().toLowerCase());
        if (isBanned) {
            return socket.emit('error_message', 'You have been kicked from this room and cannot rejoin.');
        }

        socket.join(roomId);
        room.players.push({ id: socket.id, username, avatar, score: 0, isHost: false });
        io.to(roomId).emit('update_room', room);
    });

    socket.on('change_settings', ({ roomId, settings }) => {
        if (rooms[roomId] && socket.id === rooms[roomId].host) {
            rooms[roomId].settings = settings;
            io.to(roomId).emit('update_room', rooms[roomId]);
        }
    });

    // GAME LOGIC 
    socket.on('start_game', (roomId) => {
        if (rooms[roomId] && socket.id === rooms[roomId].host) {
            // NEW: Enforce 3 to 8 players
            if (rooms[roomId].players.length < 3) {
                return socket.emit('error_message', 'Need at least 3 players to start!');
            }
            if (rooms[roomId].players.length > 8) {
                return socket.emit('error_message', 'Too many players! Maximum is 8.');
            }
            
            rooms[roomId].isStarted = true;
            startNewRound(roomId);
        }
    });

    socket.on('send_guess', ({ roomId, message, username }) => {
    const room = rooms[roomId];
    if (!room || !room.gameState || room.gameState.total <= 0) return;

    const secretWord = room.gameState.wordObj.word.toLowerCase();
    const typedMessage = message.toLowerCase().trim();
    const isCorrect = typedMessage === secretWord; 
    
    const hasAlreadyGuessed = room.gameState.correctPlayers.includes(socket.id);
    const isDrawer = socket.id === room.gameState.drawer1.id || socket.id === room.gameState.drawer2.id;

    if (isCorrect) {
        if (isDrawer) {
            socket.emit('receive_message', { 
                username: "SYSTEM", message: "You are the drawer!! Shhh...", isCorrect: false 
            });
            return;
        }

        if (!hasAlreadyGuessed) {
            room.gameState.correctPlayers.push(socket.id);
            room.gameState.timeRemainingAtGuesses.push(room.gameState.total); 
            
            const player = room.players.find(p => p.id === socket.id);
            if (player) {
                const bonus = room.gameState.correctPlayers.length === 1 ? 200 : 0;
                player.score += (room.gameState.total * 5) + bonus;
            }

            io.to(roomId).emit('receive_message', { 
                username: "SYSTEM", message: `${username} guessed the word!`, isCorrect: true 
            });

const cleanRoomForEmit = getSafeRoom({
    ...room,
    gameState: {
        ...room.gameState,
        drawer1: { id: room.gameState.drawer1.id }, 
        drawer2: { id: room.gameState.drawer2.id }
    }
});
io.to(roomId).emit('update_room', cleanRoomForEmit); 

            const totalGuessers = room.players.length - 2; 
            if (room.gameState.correctPlayers.length >= totalGuessers) {
                if(room.gameState.total > 0) room.gameState.total = 0;
            }
        }
    } else {
        io.to(roomId).emit('receive_message', { username, message, isCorrect: false });
    }
});

    socket.on('draw', ({ roomId, data }) => {
        socket.to(roomId).emit('draw_line', data);
    });

    socket.on('fill', ({ roomId, data }) => {
        socket.to(roomId).emit('fill_canvas', data);
    });

    socket.on('sync_canvas', ({ roomId, dataUrl }) => {
        socket.to(roomId).emit('set_canvas', dataUrl);
    });

    socket.on('choose_word', ({ roomId, wordObj }) => {
        const room = rooms[roomId];
        if (room && room.gameState.activeDrawer === socket.id && !room.gameState.wordObj) {
            room.gameState.wordObj = wordObj;
            room.usedWords.push(wordObj.word);
            
            clearTimeout(room.selectionTimeout);
            beginDrawingPhase(roomId);
        }
    });

    socket.on('kick_player', ({ roomId, playerId }) => {
        const room = rooms[roomId];
        if (room && socket.id === room.host && socket.id !== playerId) {
            
            const playerToKick = room.players.find(p => p.id === playerId);
            if (playerToKick) {
                room.banned.push(playerToKick.username.toLowerCase());
            }

            room.players = room.players.filter(p => p.id !== playerId);
            
            io.to(playerId).emit('kicked');
            
            const targetSocket = io.sockets.sockets.get(playerId);
            if (targetSocket) targetSocket.leave(roomId);
            
            if (room.isStarted && room.players.length < 3) {
                room.isStarted = false;
                io.to(roomId).emit('game_ended_early');
                room.currentRound = 1;
                room.usedWords = [];
                room.players.forEach(p => p.score = 0);
            }
            
            io.to(roomId).emit('update_room', room);
        }
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            const room = rooms[roomId];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            
            if (playerIndex !== -1) {
                const wasHost = room.players[playerIndex].isHost;
                room.players.splice(playerIndex, 1);
                
                if (room.players.length === 0) {
                    delete rooms[roomId];
                    continue;
                }
                
                if (wasHost) {
                    const newHostIndex = Math.floor(Math.random() * room.players.length);
                    room.players[newHostIndex].isHost = true;
                    room.host = room.players[newHostIndex].id;
                }
                
                if (room.isStarted && room.players.length < 3) {
                    room.isStarted = false;
                    io.to(roomId).emit('game_ended_early');
                    room.currentRound = 1;
                    room.usedWords = [];
                    room.players.forEach(p => p.score = 0);
                }
                io.to(roomId).emit('update_room', room);
            }
        }
    });

    socket.on('end_game_early', (roomId) => {
        const room = rooms[roomId];
        if (room && socket.id === room.host) {
            
            room.isStarted = false;
            room.currentRound = 1;
            room.usedWords = [];
            room.players.forEach(p => p.score = 0); 
            
            io.to(roomId).emit('game_ended_early');
            
            io.to(roomId).emit('update_room', room);
        }
    });

});

//ROUND MANAGER 
function startNewRound(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    let availableWords = wordsList.filter(w => !room.usedWords.includes(w.word));
    let availablePlayers = [...room.players];

    const d1Index = Math.floor(Math.random() * availablePlayers.length);
    const d1 = availablePlayers.splice(d1Index, 1)[0];
    
    const d2Index = Math.floor(Math.random() * availablePlayers.length);
    const d2 = availablePlayers[d2Index];

    if (availableWords.length < 3) {
        availableWords = wordsList;
        room.usedWords = []; 
    }

    const choices = [];
    for(let i=0; i<3; i++) {
        const idx = Math.floor(Math.random() * availableWords.length);
        choices.push(availableWords.splice(idx, 1)[0]);
    }

    room.gameState = {
        activeDrawer: d1.id,
        drawer1: d1,
        drawer2: d2,
        wordObj: null, 
        choices: choices,
        total: room.settings.time,
        relay: 20, 
        elapsed: 0,
        correctPlayers: [],
        timeRemainingAtGuesses: [],
        revealedIndices: []
    };

    io.to(roomId).emit('round_init', {
        activeDrawer: d1.id,
        drawer1: d1,
        drawer2: d2,
        currentRound: room.currentRound,
        totalRounds: room.settings.rounds
    });

    io.to(d1.id).emit('word_choices', choices);
    io.to(roomId).emit('clear_canvas');

    room.selectionTimeout = setTimeout(() => {
        if (!room.gameState.wordObj) {
            // Auto-pick the first option if they take too long
            room.gameState.wordObj = room.gameState.choices[0];
            room.usedWords.push(room.gameState.wordObj.word);
        }
        beginDrawingPhase(roomId);
    }, 10000); 
}

function beginDrawingPhase(roomId) {
    const room = rooms[roomId];
    if (!room) return;
    io.to(roomId).emit('round_start', { totalTime: room.gameState.total });

    io.to(room.gameState.drawer1.id).emit('secret_word', { word: room.gameState.wordObj.word });
    io.to(room.gameState.drawer2.id).emit('secret_hint', { hint: room.gameState.wordObj.hint });

    room.gameInterval = setInterval(() => {
        if (!rooms[roomId]) return clearInterval(room.gameInterval);
        
        room.gameState.total--;
        room.gameState.relay--;
        room.gameState.elapsed++;

        if (room.gameState.elapsed > 0 && room.gameState.elapsed % 25 === 0) {
            const word = room.gameState.wordObj.word;
            let unrevealed = [];
            for(let i=0; i<word.length; i++) {
                if(!room.gameState.revealedIndices.includes(i) && word[i] !== ' ') unrevealed.push(i);
            }
            if(unrevealed.length > 0) {
                const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
                room.gameState.revealedIndices.push(idx);
            }
        }

        const masked = room.gameState.wordObj.word.split('').map((char, i) => {
            return (room.gameState.revealedIndices.includes(i) || char === ' ') ? char : '_';
        }).join(' ');

        if (room.gameState.relay <= 0 && room.gameState.total > 0) {
            room.gameState.activeDrawer = room.gameState.activeDrawer === room.gameState.drawer1.id 
                ? room.gameState.drawer2.id 
                : room.gameState.drawer1.id;
            room.gameState.relay = 20; // 20 SECONDS
            io.to(roomId).emit('switch_turn', { activeDrawer: room.gameState.activeDrawer });
            
            if (room.gameState.elapsed >= 60) {
                io.to(room.gameState.drawer2.id).emit('secret_word', { word: room.gameState.wordObj.word });
            }
        }

        io.to(roomId).emit('timer_update', { 
            total: room.gameState.total, 
            relay: room.gameState.relay,
            maskedWord: masked 
        });

if (room.gameState.total <= 0) {
    clearInterval(room.gameInterval);
    
    if (room.gameState.correctPlayers && room.gameState.correctPlayers.length > 0) {
        const sumRemaining = room.gameState.timeRemainingAtGuesses.reduce((a, b) => a + b, 0);
        const avgRemaining = sumRemaining / room.gameState.correctPlayers.length;
        const drawerPoints = Math.floor((room.gameState.correctPlayers.length * 50) + (avgRemaining * 4));

        const d1 = room.players.find(p => p.id === room.gameState.drawer1.id);
        const d2 = room.players.find(p => p.id === room.gameState.drawer2.id);
        if (d1) d1.score += drawerPoints;
        if (d2) d2.score += drawerPoints;

        io.to(roomId).emit('receive_message', { 
            username: "SYSTEM", message: `Drawers earned ${drawerPoints} points!`, isCorrect: true 
        });
    } else {
        io.to(roomId).emit('receive_message', { 
            username: "SYSTEM", message: "No one guessed it! 0 points for drawers.", isCorrect: false 
        });
    }

    io.to(roomId).emit('receive_message', { 
        username: "SYSTEM", message: `Round over! The word was: ${room.gameState.wordObj.word}`, isCorrect: true 
    });

    io.to(roomId).emit('round_ended');

const endRoundCleanRoom = getSafeRoom({
    ...room,
    gameState: {
        ...room.gameState,
        drawer1: { id: room.gameState.drawer1.id },
        drawer2: { id: room.gameState.drawer2.id }
    }
});
io.to(roomId).emit('update_room', endRoundCleanRoom);

    setTimeout(() => {
        if (room.currentRound < room.settings.rounds) {
            room.currentRound++;
            startNewRound(roomId);
        } else {
            io.to(roomId).emit('game_over', room.players);
            room.isStarted = false;
            room.currentRound = 1;
            room.usedWords = [];
            room.players.forEach(p => p.score = 0);
            
            io.to(roomId).emit('update_room', { ...room, gameState: {} });
        }
    }, 2000);
}
    }, 1000);
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});