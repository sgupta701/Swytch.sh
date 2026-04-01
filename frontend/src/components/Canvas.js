// frontend/src/components/Canvas.js

import React, { useRef, useEffect, useState } from 'react';

const COLORS = [
    '#000000', '#555555', '#AAAAAA', '#FFFFFF', '#FF0000', 
    '#FF5500', '#FFAA00', '#FFFF00', '#00FF00', '#00AA00', 
    '#00FFFF', '#0000FF', '#5500FF', '#AA00FF', '#FF00FF', 
    '#FF00AA', '#8B4513', '#D2B48C', '#FFC0CB', '#800000'
];

const Canvas = ({ socket, roomId, isActive }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(3);
    const [tool, setTool] = useState('pen'); 

    const [history, setHistory] = useState([]);
    const [step, setStep] = useState(-1);

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const applySnapshot = (dataUrl, emitSync = false) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            if (emitSync) {
                socket.emit('sync_canvas', { roomId, dataUrl });
            }
        };
    };

    const saveState = () => {
        if (!canvasRef.current) return;
        const dataUrl = canvasRef.current.toDataURL();
        setHistory(prev => {
            const newHistory = prev.slice(0, step + 1);
            newHistory.push(dataUrl);
            return newHistory;
        });
        setStep(prev => prev + 1);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (history.length === 0) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            saveState();
        }

        socket.on('draw_line', (data) => drawLine(ctx, data.x0, data.y0, data.x1, data.y1, data.color, data.size));
        socket.on('fill_canvas', (data) => executeFill(ctx, data.x, data.y, data.color, false));
        socket.on('set_canvas', (dataUrl) => applySnapshot(dataUrl, false));

        socket.on('clear_canvas', () => {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            setHistory([]);
            setStep(-1);
            setTimeout(saveState, 50); 
        });

        return () => {
            socket.off('draw_line');
            socket.off('fill_canvas');
            socket.off('clear_canvas');
            socket.off('set_canvas');
        };
    }, [socket, step]); 

    const drawLine = (ctx, x0, y0, x1, y1, strokeColor, size) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.stroke();
    };

    const hexToRgba = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16), 255] : [0,0,0,255];
    };

    const executeFill = (ctx, startX, startY, fillColorHex, isLocal = true) => {
        const canvas = ctx.canvas;
        const width = canvas.width;
        const height = canvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const startPos = (Math.floor(startY) * width + Math.floor(startX)) * 4;
        const startR = data[startPos], startG = data[startPos + 1], startB = data[startPos + 2], startA = data[startPos + 3];
        const fillColor = hexToRgba(fillColorHex);

        if (startR === fillColor[0] && startG === fillColor[1] && startB === fillColor[2] && startA === fillColor[3]) return;

        const matchStartColor = (pos) => data[pos] === startR && data[pos + 1] === startG && data[pos + 2] === startB && data[pos + 3] === startA;
        const colorPixel = (pos) => { data[pos] = fillColor[0]; data[pos + 1] = fillColor[1]; data[pos + 2] = fillColor[2]; data[pos + 3] = 255; };

        const pixelStack = [[Math.floor(startX), Math.floor(startY)]];
        while (pixelStack.length > 0) {
            const [x, y] = pixelStack.pop();
            const pos = (y * width + x) * 4;

            if (x < 0 || x >= width || y < 0 || y >= height || !matchStartColor(pos)) continue;

            colorPixel(pos);
            pixelStack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        ctx.putImageData(imageData, 0, 0);
        if (isLocal) saveState(); 
    };

    const handleStart = (e) => {
        if (!isActive) return;
        const { x, y } = getCoordinates(e);

        if (tool === 'fill') {
            const ctx = canvasRef.current.getContext('2d');
            executeFill(ctx, x, y, color, true);
            socket.emit('fill', { roomId, data: { x, y, color } });
        } else {
            setLastPos({ x, y });
            setIsDrawing(true);
        }
    };

    const handleMove = (e) => {
        if (!isDrawing || !isActive || tool === 'fill') return;
        if (e.touches) e.preventDefault(); 

        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        const activeColor = tool === 'eraser' ? '#ffffff' : color;

        drawLine(ctx, lastPos.x, lastPos.y, x, y, activeColor, brushSize);
        
        socket.emit('draw', {
            roomId,
            data: { x0: lastPos.x, y0: lastPos.y, x1: x, y1: y, color: activeColor, size: brushSize }
        });
        setLastPos({ x, y });
    };

    const handleEnd = () => {
        if (isDrawing && isActive) {
            setIsDrawing(false);
            saveState(); 
        }
    };

    const handleUndo = () => {
        if (step > 0) {
            const newStep = step - 1;
            setStep(newStep);
            applySnapshot(history[newStep], true); 
        }
    };

    const handleRedo = () => {
        if (step < history.length - 1) {
            const newStep = step + 1;
            setStep(newStep);
            applySnapshot(history[newStep], true); 
        }
    };

    const cursorStyle = tool === 'fill' 
        ? "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><text y=\"20\" font-size=\"20\">🪣</text></svg>') 4 20, pointer"
        : "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\"><text y=\"20\" font-size=\"20\">✏️</text></svg>') 0 24, crosshair";

    return (
        <div className="flex flex-col gap-1 w-full flex-1 max-w-[900px]">
            {/* TOOLBAR */}
            <div className={`flex flex-col gap-1 p-1.5 bg-gray-200 rounded-t-lg border-b-2 border-gray-400 ${!isActive && 'opacity-85 pointer-events-none'}`}>
                <div className="flex gap-2 items-center justify-between flex-wrap">
                    <div className="flex gap-1">
                        <button onClick={() => setTool('pen')} className={`px-2 py-0.5 text-xs bg-white border-2 rounded font-bold ${tool === 'pen' ? 'border-blue-500 text-blue-600' : 'border-gray-400'}`}>✏️</button>
                        <button onClick={() => setTool('fill')} className={`px-2 py-0.5 text-xs bg-white border-2 rounded font-bold ${tool === 'fill' ? 'border-blue-500 text-blue-600' : 'border-gray-400'}`}>🪣</button>
                        <button onClick={() => setTool('eraser')} className={`px-2 py-0.5 text-xs bg-white border-2 rounded font-bold ${tool === 'eraser' ? 'border-blue-500 text-blue-600' : 'border-gray-400'}`}>🧼</button>
                        <button onClick={handleUndo} disabled={step <= 0} className="px-2 py-0.5 text-xs bg-white border-2 border-gray-400 rounded font-bold disabled:opacity-50">↩️</button>
                        <button onClick={handleRedo} disabled={step >= history.length - 1} className="px-2 py-0.5 text-xs bg-white border-2 border-gray-400 rounded font-bold disabled:opacity-50">↪️</button>
                    </div>
                    <div className="flex items-center gap-1">
                        <input type="range" min="2" max="30" value={brushSize} onChange={(e) => setBrushSize(e.target.value)} className="w-16 md:w-24" />
                    </div>
                </div>
                <div className="grid grid-cols-10 gap-1 w-fit bg-gray-300 p-1 rounded">
                    {COLORS.map((c) => (
                        <div key={c} onClick={() => { setColor(c); if(tool === 'eraser') setTool('pen'); }}
                            className={`w-4 h-4 md:w-5 md:h-5 cursor-pointer border-2 shadow-sm ${color === c && tool !== 'eraser' ? 'border-white scale-110' : 'border-black/20'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <canvas 
                ref={canvasRef} 
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseOut={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
                width={800}
                height={500}
                style={{ 
                    cursor: isActive ? cursorStyle : 'default',
                    touchAction: 'none' 
                }}
                className={`bg-white shadow-xl border-4 w-full h-auto max-h-[60vh] object-contain ${isActive ? 'border-green-500' : 'border-gray-300'}`}
            />
        </div>
    );
};

export default Canvas;