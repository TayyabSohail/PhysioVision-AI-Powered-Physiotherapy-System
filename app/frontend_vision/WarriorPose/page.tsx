"use client";
import React, { useState, useEffect, useRef } from "react";
import { Sidebar } from "../../sidebar/page";

export default function WarriorPose() {
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
  const MAX_RECONNECT_ATTEMPTS = 5;
  const [autoReconnect, setAutoReconnect] = useState(false);

  // Remove the automatic connection on component mount
  // We'll now require manual connection only

  const connectWebSocket = () => {
    // Close any existing connection first
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus("connecting");
    setErrorMessage(null);

    const ws = new WebSocket("ws://localhost:8765/ws");

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnectionStatus("connected");
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data);

        if (data.type === "frame") {
          setFrameSrc(`data:image/jpeg;base64,${data.data}`);
          setGoodFormFrames(data.good_form_frames || 0);
          setFrameCount(data.frame_count || 0);
          setErrorCounts(data.error_counts || {});
          setIsRecording(data.recording || false);

          // Determine current form status
          const hasErrors = Object.keys(data.error_counts || {}).length > 0;

          if (hasErrors) {
            // Get the most recent error (highest count)
            const topError = Object.entries(data.error_counts || {}).sort(
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
        } else if (data.status) {
          if (data.status === "started" || data.status === "already_running") {
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
      console.log("WebSocket closed");
      setConnectionStatus("disconnected");

      // Only attempt to reconnect if autoReconnect is true
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
      setErrorMessage("Connection error.");
      // Don't auto-retry on error
    };

    wsRef.current = ws;
  };

  // Cleanup function to ensure WebSocket is properly closed
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        console.log("Cleaning up WebSocket connection");
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const startWarriorPose = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setErrorMessage("Not connected to server. Please connect first.");
      return;
    }

    setErrorMessage(null);
    wsRef.current.send(
      JSON.stringify({ action: "start", exercise: "Warrior" })
    );
  };

  const stopWarriorPose = () => {
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
    setAutoReconnect(false); // Disable auto reconnect by default
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
          <h1 className="text-4xl font-bold text-white">
            Warrior Pose Exercise
          </h1>
        </div>

        {errorMessage && (
          <div className="mb-2 p-2 bg-red-500 text-white rounded-lg text-sm inline-block">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col items-center justify-center h-[600px] bg-gray-900 rounded-lg overflow-hidden relative">
          {" "}
          {frameSrc ? (
            <>
              <img
                src={frameSrc}
                alt="Webcam Feed"
                className="max-h-full max-w-full border rounded-lg shadow-lg"
                onError={() => setFrameSrc(null)}
              />
              {/* {feedback && (
                <div
                  className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-2 max-w-sm w-[90%] rounded-xl text-center text-base font-semibold backdrop-blur-md shadow-lg ${
                    formStatus === "good" ? "bg-green-500/70" : "bg-red-500/70"
                  } text-white`}
                >
                  {feedback}
                </div>
              )} */}
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
                  ? 'Click "Start Warrior Pose" to begin'
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
                onClick={isRunning ? stopWarriorPose : startWarriorPose}
                className={`px-6 py-3 text-white rounded-lg transition duration-200 ${
                  isRunning
                    ? "bg-red-500 hover:bg-red-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {isRunning ? "Stop Warrior Pose" : "Start Warrior Pose"}
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
