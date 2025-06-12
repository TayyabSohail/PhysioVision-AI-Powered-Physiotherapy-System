"use client";

import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "../../sidebar/page";
import { useAudio } from "@/contexts/AudioContexts";

export default function LungeVision() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "disconnected"
  >("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<"good" | "bad" | null>(null);
  const [goodFormFrames, setGoodFormFrames] = useState<number>(0);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [errorCounts, setErrorCounts] = useState<Record<string, number>>({});
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null); // Ref for audio element
  const MAX_RECONNECT_ATTEMPTS = 5;
  const [autoReconnect, setAutoReconnect] = useState(false);
  const { audiobot, language } = useAudio();

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // WebSocket cleanup
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        console.log("Cleaning up WebSocket connection");
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const connectWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus("connecting");
    setErrorMessage(null);

    const ws = new WebSocket("ws://localhost:8765");

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnectionStatus("connected");
      reconnectAttemptsRef.current = 0;

      ws.send(JSON.stringify({ action: "connect" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data);

        if (data.type === "frame" && data.frame) {
          setFrameSrc(`data:image/jpeg;base64,${data.frame}`);
          setGoodFormFrames(data.good_form_frames || 0);
          setFrameCount(data.frame_count || 0);
          setErrorCounts(data.error_counts || {});
          setIsRecording(data.recording || false);

          if (data.error_counts) {
            const hasErrors = Object.keys(data.error_counts).length > 0;

            if (hasErrors) {
              const topError = Object.entries(data.error_counts).sort(
                (a, b) => (b[1] as number) - (a[1] as number)
              )[0];

              if (topError) {
                setFeedback(topError[0]);
                setFormStatus("bad");
              }
            } else {
              setFeedback("Correct Form");
              setFormStatus("good");
            }
          }
        } else if (data.type === "audio") {
          if (data.audio_data && audiobot === "on") {
            const audioBlob = base64ToBlob(data.audio_data, "audio/mpeg");
            const audioUrl = URL.createObjectURL(audioBlob);
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
              audioRef.current.play().catch((e) => {
                console.error("Audio playback error:", e);
                setErrorMessage("Failed to play audio feedback.");
              });
              audioRef.current.onended = () => {
                URL.revokeObjectURL(audioUrl);
                audioRef.current!.onended = null;
              };
            }
          }
        } else if (data.status) {
          if (data.status === "connected") {
            setConnectionStatus("connected");
          } else if (
            data.status === "started" ||
            data.status === "already_running"
          ) {
            setIsRunning(true);
          } else if (
            data.status === "stopped" ||
            data.status === "not_running"
          ) {
            setIsRunning(false);
            setFrameSrc(null);
            setFeedback(null);
            setFormStatus(null);
            setGoodFormFrames(0);
            setFrameCount(0);
            setErrorCounts({});
            setIsRecording(false);
          }
        } else if (data.error) {
          setErrorMessage(data.error);
        } else if (data.type === "status") {
          if (data.message === "Not connected") {
            setConnectionStatus("disconnected");
            setErrorMessage("Server reports not connected. Try reconnecting.");
          } else if (data.message === "Connected") {
            setConnectionStatus("connected");
            setErrorMessage(null);
          }
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
        setErrorMessage("Error processing server message.");
      }
    };

    ws.onclose = (event) => {
      console.log("WebSocket closed", event);
      setConnectionStatus("disconnected");

      if (
        autoReconnect &&
        reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
      ) {
        const timeout = Math.min(
          3000 * (reconnectAttemptsRef.current + 1),
          15000
        );

        setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connectWebSocket();
        }, timeout);
      } else {
        setErrorMessage("Connection closed.");
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setErrorMessage("Connection error. Server might not be running.");
    };

    wsRef.current = ws;
  };

  // Convert base64 to Blob for audio playback
  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const startLunges = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setErrorMessage("Not connected to server. Please connect first.");
      return;
    }

    setErrorMessage(null);
    wsRef.current.send(
      JSON.stringify({
        action: "start",
        exercise: "Lunges",
        audiobot,
        language,
      })
    );
  };

  const stopLunges = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "stop" }));
    }

    setIsRunning(false);
    setFrameSrc(null);
    setFeedback(null);
    setFormStatus(null);
    setGoodFormFrames(0);
    setFrameCount(0);
    setErrorCounts({});
    setIsRecording(false);
  };

  const disconnect = () => {
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: "disconnect" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus("disconnected");
    setIsRunning(false);
    setFrameSrc(null);
    setFeedback(null);
    setFormStatus(null);
    setErrorMessage(null);
  };

  const manualConnect = () => {
    reconnectAttemptsRef.current = 0;
    setAutoReconnect(false);
    connectWebSocket();
  };

  // Calculate performance metrics
  const calculateFormPercentage = () => {
    if (frameCount === 0) return 0;
    return ((goodFormFrames / frameCount) * 100).toFixed(1);
  };

  // Format time from frame count (assuming 30fps)
  const formatTime = (frames: number) => {
    const seconds = Math.floor(frames / 30);
    return `${seconds}s`;
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-black">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 container mx-auto px-10 py-6 bg-black">
        <div className="h-16 w-full bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white">Lunges Exercise</h1>
        </div>

        {errorMessage && (
          <div className="mb-2 p-2 bg-red-500 text-white rounded-lg text-sm inline-block">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col items-center justify-center h-[80vh] bg-gray-900 rounded-lg overflow-hidden relative">
          {frameSrc ? (
            <>
              <img
                src={frameSrc}
                alt="Webcam Feed"
                className="w-full h-full object-contain"
                onError={() => {
                  console.error("Image load error");
                  setFrameSrc(null);
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
                {isRecording ? (
                  <>
                    <p>Recording: {formatTime(frameCount)}</p>
                  </>
                ) : (
                  <p>{frameCount > 0 ? `${formatTime(frameCount)}` : ""}</p>
                )}
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
                  ? 'Click "Start Lunges" to begin'
                  : connectionStatus === "connecting"
                  ? "Please wait..."
                  : "Please connect to start"}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-center mt-4 space-x-4">
          {connectionStatus === "connected" ? (
            <>
              <button
                onClick={isRunning ? stopLunges : startLunges}
                className={`px-6 py-3 text-white rounded-lg transition duration-200 ${
                  isRunning
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {isRunning ? "Stop Lunges" : "Start Lunges"}
              </button>

              <button
                onClick={disconnect}
                className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition duration-200"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={manualConnect}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition duration-200"
              disabled={connectionStatus === "connecting"}
            >
              {connectionStatus === "connecting"
                ? "Connecting..."
                : "Connect to Server"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
