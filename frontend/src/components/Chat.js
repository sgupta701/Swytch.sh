// frontend/src/components/Chat.js

import React, { useState, useEffect, useRef } from 'react';

const Chat = ({ socket, roomId, username, isDrawer }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        socket.on('receive_message', (data) => {
            setMessages((prev) => [...prev, data]);
        });
        return () => socket.off('receive_message');
    }, [socket]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('send_guess', { roomId, message, username });
            setMessage('');
        }
    };

    return (
<div className="flex flex-col h-[400px] md:h-[500px] lg:h-[545px] w-full lg:w-[300px] bg-[#eeeeee] border-4 border-white rounded-xl shadow-xl overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-1 font-sans">
                {messages.map((msg, i) => (
                    <div key={i} className={`text-sm p-2 rounded ${
                        msg.username === "SYSTEM" 
                        ? "bg-green-100 text-green-800 font-bold text-center border border-green-200" 
                        : "bg-white border-b border-gray-200"
                    }`}>
                        {msg.username !== "SYSTEM" && <b className="text-blue-600 mr-2">{msg.username}:</b>}
                        <span className={msg.isCorrect ? "text-green-600 font-black" : "text-gray-700"}>
                            {msg.message}
                        </span>
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <div className="p-3 bg-white border-t-2 border-gray-200">
                <form onSubmit={sendMessage} className="flex gap-2">
                    <input 
                        className="flex-1 bg-gray-100 border-2 border-gray-200 p-2 rounded-lg text-sm outline-none focus:border-blue-400 font-bold transition-all"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your guess here..."
                        autoComplete="off"
                    />
                </form>
            </div>
        </div>
    );
};

export default Chat;