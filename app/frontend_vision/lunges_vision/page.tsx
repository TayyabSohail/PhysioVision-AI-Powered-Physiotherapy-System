"use client";
import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "../../sidebar/page";

export default function LungeVision() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RECONNECT_ATTEMPTS = 5;

  useEffect(() => {
    // Connect to WebSocket when component mounts
    connectWebSocket();

    // Clean up on unmount
    return () => {
      cleanupConnection();
    };
  }, []);

  const cleanupConnection = () => {
    // Clear any pending reconnect timers
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    // Close any existing connection
    if (wsRef.current) {
      try {
        // Only try to send stop if connection is open
        if (isRunning && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ action: "stop" }));
        }
        wsRef.current.close();
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
      wsRef.current = null;
    }

    // Reset state
    setIsRunning(false);
    setFrameSrc(null);
  };

  const connectWebSocket = () => {
    // Clean up any existing connections first
    cleanupConnection();

    setConnectionStatus("connecting");
    setErrorMessage(null);

    // Create new WebSocket connection
    const ws = new WebSocket("ws://localhost:8765/ws");

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnectionStatus("connected");
      setReconnectAttempts(0); // Reset reconnect attempts on successful connection
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle different message types
        if (data.frame) {
          setFrameSrc(`data:image/jpeg;base64,${data.frame}`);
        } else if (data.status) {
          console.log(`Status update: ${data.status}`);
          if (data.status === "started") {
            setIsRunning(true);
            setErrorMessage(null);
          } else if (data.status === "stopped") {
            setIsRunning(false);
            setFrameSrc(null);
          }
        } else if (data.error) {
          setErrorMessage(data.error);
          setIsRunning(false);
          setFrameSrc(null);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = (event) => {
      console.log(`WebSocket disconnected with code ${event.code}`);
      setConnectionStatus("disconnected");
      setIsRunning(false);
      setFrameSrc(null);

      // Only attempt to reconnect if not exceeding max attempts and not a normal closure
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && event.code !== 1000) {
        const timeout = Math.min(3000 * (reconnectAttempts + 1), 15000); // Exponential backoff
        console.log(`Will try to reconnect in ${timeout / 1000} seconds...`);

        reconnectTimerRef.current = setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connectWebSocket();
        }, timeout);
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setErrorMessage(
          `Failed to connect after ${MAX_RECONNECT_ATTEMPTS} attempts. Please try manually reconnecting.`
        );
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setErrorMessage("Connection error occurred.");
      // Don't set connection status here, let onclose handle it
    };

    wsRef.current = ws;
  };

  const startLunges = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setErrorMessage(null);
      wsRef.current.send(
        JSON.stringify({ action: "start", exercise: "Lunges" })
      );
    } else {
      setErrorMessage("Not connected to server. Trying to reconnect...");
      connectWebSocket();
    }
  };

  const stopLunges = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "stop" }));
    } else {
      // Even if we can't send the stop command, update the UI
      setIsRunning(false);
      setFrameSrc(null);
    }
  };

  const manualReconnect = () => {
    setReconnectAttempts(0); // Reset counter on manual reconnect
    connectWebSocket();
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-black">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 container mx-auto px-10 py-[1.4%] bg-black">
        <div className="h-16 w-full bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white">Lunges Exercise</h1>
        </div>

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-500 text-white rounded-lg">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col items-center justify-center h-[70vh] bg-gray-900 rounded-lg overflow-hidden">
          {frameSrc ? (
            <img
              src={frameSrc}
              alt="Webcam Feed"
              className="max-h-full max-w-full border rounded-lg shadow-lg"
            />
          ) : (
            <div className="text-white text-center">
              <p className="text-gray-400 text-xl mb-4">
                {connectionStatus === "connected"
                  ? "Ready to start exercise detection"
                  : connectionStatus === "connecting"
                  ? "Connecting to server..."
                  : "Disconnected from server"}
              </p>
              <p className="text-gray-500">
                {connectionStatus === "connected"
                  ? 'Click "Start Lunges" to begin'
                  : connectionStatus === "connecting"
                  ? "Please wait..."
                  : "Please reconnect to start"}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-center mt-4 space-x-4">
          <button
            onClick={isRunning ? stopLunges : startLunges}
            disabled={connectionStatus !== "connected"}
            className={`px-6 py-3 text-white rounded-lg transition duration-200 ${
              isRunning
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            } ${
              connectionStatus !== "connected"
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {isRunning ? "Stop Lunges" : "Start Lunges"}
          </button>

          {connectionStatus !== "connected" && (
            <button
              onClick={manualReconnect}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition duration-200"
            >
              {connectionStatus === "connecting"
                ? "Reconnecting..."
                : "Reconnect"}
            </button>
          )}
        </div>

        <div className="mt-4 text-center text-gray-500">
          Status:{" "}
          {connectionStatus === "connected" ? (
            <span className="text-green-500">Connected</span>
          ) : connectionStatus === "connecting" ? (
            <span className="text-yellow-500">Connecting...</span>
          ) : (
            <span className="text-red-500">Disconnected</span>
          )}
          {reconnectAttempts > 0 && connectionStatus === "connecting" && (
            <span className="ml-2 text-yellow-500">
              (Attempt {reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
