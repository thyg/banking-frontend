"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useCompose } from '@/hooks/use-compose-store';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { X, Minus, Expand, Minimize, GripVertical } from 'lucide-react';

interface Position {
    x: number;
    y: number;
}

export function ComposeWindow() {
    const {
        isOpen,
        title,
        content,
        isMinimized,
        isMaximized,
        onClose,
        onToggleMinimize,
        onToggleMaximize
    } = useCompose();

    // Position de la fenêtre (centrée par défaut)
    const [position, setPosition] = useState<Position | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
    const windowRef = useRef<HTMLDivElement>(null);

    // Centrer la fenêtre au montage
    useEffect(() => {
        if (isOpen && !position && !isMaximized) {
            const windowWidth = 500;
            const windowHeight = window.innerHeight * 0.7;
            setPosition({
                x: (window.innerWidth - windowWidth) / 2,
                y: (window.innerHeight - windowHeight) / 2
            });
        }
    }, [isOpen, position, isMaximized]);

    // Réinitialiser la position quand la fenêtre se ferme
    useEffect(() => {
        if (!isOpen) {
            setPosition(null);
        }
    }, [isOpen]);

    // Gérer le début du drag
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isMaximized || isMinimized) return;

        e.preventDefault();
        setIsDragging(true);

        const rect = windowRef.current?.getBoundingClientRect();
        if (rect) {
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    }, [isMaximized, isMinimized]);

    // Gérer le mouvement pendant le drag
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // Limiter la position pour que la fenêtre reste visible
        const maxX = window.innerWidth - 100;
        const maxY = window.innerHeight - 50;

        setPosition({
            x: Math.max(0, Math.min(newX, maxX)),
            y: Math.max(0, Math.min(newY, maxY))
        });
    }, [isDragging, dragOffset]);

    // Gérer la fin du drag
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Ajouter/retirer les listeners globaux
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    if (!isOpen) {
        return null;
    }

    // Styles de position
    const positionStyle: React.CSSProperties = isMaximized
        ? { top: 0, left: 0, right: 0, bottom: 0 }
        : position
            ? { top: position.y, left: position.x }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    return (
        <>
            {/* Overlay pour bloquer les interactions pendant le drag */}
            {isDragging && (
                <div className="fixed inset-0 z-40 cursor-move" />
            )}

            <div
                ref={windowRef}
                style={positionStyle}
                className={cn(
                    "fixed z-50 flex flex-col bg-background rounded-lg shadow-2xl border transition-shadow duration-300",
                    isMaximized
                        ? "w-screen h-screen rounded-none"
                        : "w-[500px]",
                    isMinimized ? "h-12" : (isMaximized ? "h-screen" : "h-[70vh] max-h-[600px]"),
                    isDragging ? "shadow-3xl cursor-move" : "shadow-2xl"
                )}
            >
                <header
                    className={cn(
                        "flex items-center justify-between px-4 py-2 bg-blue-600 text-white rounded-t-lg select-none",
                        !isMaximized && !isMinimized && "cursor-move"
                    )}
                    onMouseDown={handleMouseDown}
                    onClick={() => isMinimized && onToggleMinimize()}
                >
                    <div className="flex items-center gap-2">
                        {!isMaximized && !isMinimized && (
                            <GripVertical className="h-4 w-4 text-white/70" />
                        )}
                        <h3 className="font-semibold text-sm">{title}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white hover:bg-white/20"
                            onClick={(e) => { e.stopPropagation(); onToggleMinimize(); }}
                        >
                            <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white hover:bg-white/20"
                            onClick={(e) => { e.stopPropagation(); onToggleMaximize(); }}
                        >
                            {isMaximized ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-white hover:bg-red-500"
                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </header>
                {!isMinimized && (
                    <div className="flex-1 overflow-auto">
                        {content}
                    </div>
                )}
            </div>
        </>
    );
}