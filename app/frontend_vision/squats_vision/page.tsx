"use client";
import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "../../sidebar/page";

export default function SquatVision() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<"good" | "bad" | null>(null);
  const [repCount, setRepCount] = useState<number>(0);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return; // Prevent duplicate connections
    }

    setConnectionStatus("connecting");
    setErrorMessage(null);

    const ws = new WebSocket("ws://localhost:8765/ws");

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnectionStatus("connected");
      reconnectAttemptsRef.current = 0;

      ws.send(JSON.stringify({ action: "connect", client: "squatvision" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data); // Log the entire message

        if (data.type === "frame") {
          console.log("Frame received, setting frameSrc");
          setFrameSrc(`data:image/jpeg;base64,${data.data}`);
          setPrediction(data.prediction || null);
          setConfidence(data.confidence || null);
          setRepCount(data.rep_count || 0);

          if (data.prediction) {
            setFeedback(
              data.prediction === "good"
                ? "Good form! Keep it up."
                : `Form issue: ${data.prediction}`
            );
            setFormStatus(data.prediction === "good" ? "good" : "bad");
          }
        } else if (data.status) {
          console.log(`Status update: ${data.status}`);
          if (data.status === "started") {
            setIsRunning(true);
          } else if (data.status === "stopped") {
            setIsRunning(false);
            setFrameSrc(null);
            setFeedback(null);
            setFormStatus(null);
          }
        } else if (data.error) {
          setErrorMessage(data.error);
          setIsRunning(false);
          setFrameSrc(null);
          setFeedback(null);
          setFormStatus(null);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onclose = (event) => {
      console.log(`WebSocket disconnected with code ${event.code}`);
      setConnectionStatus("disconnected");

      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        const timeout = Math.min(
          3000 * (reconnectAttemptsRef.current + 1),
          15000
        );
        console.log(`Reconnecting in ${timeout / 1000} seconds...`);

        setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connectWebSocket();
        }, timeout);
      } else {
        setErrorMessage("Failed to connect. Please try manually reconnecting.");
      }
    };

    ws.onerror = () => {
      setErrorMessage("Connection error. Retrying...");
    };

    wsRef.current = ws;
  };

  const startSquats = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setErrorMessage(null);
      // Updated to match the backend's expected format
      wsRef.current.send(
        JSON.stringify({ action: "start", exercise: "Squats" })
      );
    } else {
      setErrorMessage("Not connected to server. Trying to reconnect...");
      connectWebSocket();
    }
  };

  const stopSquats = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "stop" }));
    } else {
      setIsRunning(false);
      setFrameSrc(null);
      setFeedback(null);
      setFormStatus(null);
    }
  };

  const manualReconnect = () => {
    reconnectAttemptsRef.current = 0;
    connectWebSocket();
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-black">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 container mx-auto px-10 py-[1.4%] bg-black">
        <div className="h-16 w-full bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white">Squat Exercise</h1>
        </div>

        {errorMessage && (
          <div className="mb-4 p-4 bg-red-500 text-white rounded-lg">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col items-center justify-center h-[70vh] bg-gray-900 rounded-lg overflow-hidden relative">
          {frameSrc ? (
            <>
              <img
                src={frameSrc}
                alt="Webcam Feed"
                className="max-h-full max-w-full border rounded-lg shadow-lg"
                onError={(e) => {
                  console.error("Error loading image:", e);
                  setFrameSrc(null); // Reset frameSrc if there's an error
                }}
              />
              {feedback && (
                <div
                  className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-2 max-w-sm w-[90%] rounded-xl text-center text-base font-semibold backdrop-blur-md shadow-lg ${
                    formStatus === "good" ? "bg-green-500/70" : "bg-red-500/70"
                  } text-white`}
                >
                  {feedback}
                </div>
              )}
              <div className="absolute top-4 left-4 bg-black/50 p-2 rounded-lg text-white">
                <p>Reps: {repCount}</p>
                <p>Prediction: {prediction || "N/A"}</p>
              </div>
            </>
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
                  ? 'Click "Start Squats" to begin'
                  : connectionStatus === "connecting"
                  ? "Please wait..."
                  : "Please reconnect to start"}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-center mt-4 space-x-4">
          <button
            onClick={isRunning ? stopSquats : startSquats}
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
            {isRunning ? "Stop Squats" : "Start Squats"}
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
        </div>
      </div>
    </div>
  );
}
