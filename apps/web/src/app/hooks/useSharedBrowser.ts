"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

export interface BrowserState {
    active: boolean;
    url?: string;
    noVncUrl?: string;
    controllerUserId?: string;
}

interface UseSharedBrowserOptions {
    socketRef: React.MutableRefObject<Socket | null>;
    isAdmin: boolean;
}

interface UseSharedBrowserReturn {
    browserState: BrowserState;
    isLaunching: boolean;
    launchError: string | null;
    launchBrowser: (url: string) => Promise<boolean>;
    navigateTo: (url: string) => Promise<boolean>;
    closeBrowser: () => Promise<boolean>;
    clearError: () => void;
}

export function useSharedBrowser({
    socketRef,
    isAdmin,
}: UseSharedBrowserOptions): UseSharedBrowserReturn {
    const [browserState, setBrowserState] = useState<BrowserState>({ active: false });
    const [isLaunching, setIsLaunching] = useState(false);
    const [launchError, setLaunchError] = useState<string | null>(null);
    const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const clearError = useCallback(() => {
        setLaunchError(null);
    }, []);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        socket.emit("browser:getState", (state: BrowserState) => {
            setBrowserState(state);
        });
    }, [socketRef]);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleBrowserState = (state: BrowserState) => {
            setBrowserState(state);
            setIsLaunching(false);
        };

        const handleBrowserClosed = () => {
            setBrowserState({ active: false });
            setIsLaunching(false);
        };

        socket.on("browser:state", handleBrowserState);
        socket.on("browser:closed", handleBrowserClosed);

        return () => {
            socket.off("browser:state", handleBrowserState);
            socket.off("browser:closed", handleBrowserClosed);
        };
    }, [socketRef]);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !browserState.active) {
            if (activityIntervalRef.current) {
                clearInterval(activityIntervalRef.current);
                activityIntervalRef.current = null;
            }
            return;
        }

        activityIntervalRef.current = setInterval(() => {
            socket.emit("browser:activity");
        }, 30000);

        return () => {
            if (activityIntervalRef.current) {
                clearInterval(activityIntervalRef.current);
                activityIntervalRef.current = null;
            }
        };
    }, [browserState.active, socketRef]);

    const launchBrowser = useCallback(
        async (url: string): Promise<boolean> => {
            const socket = socketRef.current;
            if (!socket || !isAdmin) return false;

            setIsLaunching(true);
            setLaunchError(null);

            return new Promise((resolve) => {
                socket.emit(
                    "browser:launch",
                    { url },
                    (response: { success?: boolean; noVncUrl?: string; error?: string }) => {
                        setIsLaunching(false);
                        if (response.error) {
                            setLaunchError(response.error);
                            resolve(false);
                        } else {
                            setBrowserState({
                                active: true,
                                url,
                                noVncUrl: response.noVncUrl,
                            });
                            resolve(true);
                        }
                    }
                );
            });
        },
        [socketRef, isAdmin]
    );

    const navigateTo = useCallback(
        async (url: string): Promise<boolean> => {
            const socket = socketRef.current;
            if (!socket || !isAdmin) return false;

            setIsLaunching(true);
            setLaunchError(null);

            return new Promise((resolve) => {
                socket.emit(
                    "browser:navigate",
                    { url },
                    (response: { success?: boolean; noVncUrl?: string; error?: string }) => {
                        setIsLaunching(false);
                        if (response.error) {
                            setLaunchError(response.error);
                            resolve(false);
                        } else {
                            setBrowserState((prev) => ({
                                ...prev,
                                url,
                                noVncUrl: response.noVncUrl,
                            }));
                            resolve(true);
                        }
                    }
                );
            });
        },
        [socketRef, isAdmin]
    );

    const closeBrowser = useCallback(async (): Promise<boolean> => {
        const socket = socketRef.current;
        if (!socket || !isAdmin) return false;

        return new Promise((resolve) => {
            socket.emit("browser:close", (response: { success?: boolean; error?: string }) => {
                if (response.error) {
                    setLaunchError(response.error);
                    resolve(false);
                } else {
                    setBrowserState({ active: false });
                    resolve(true);
                }
            });
        });
    }, [socketRef, isAdmin]);

    return {
        browserState,
        isLaunching,
        launchError,
        launchBrowser,
        navigateTo,
        closeBrowser,
        clearError,
    };
}
