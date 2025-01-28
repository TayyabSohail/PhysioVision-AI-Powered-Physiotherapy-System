"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "../sidebar/page";

export default function SquatVision() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [stage, setStage] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [countdown, setCountdown] = useState(5); // Countdown state
  const [isRunning, setIsRunning] = useState(false); // To track if the model is running

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    // Countdown logic
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsRunning(true); // Start the model after countdown ends
    }
  }, [countdown]);

  useEffect(() => {
    if (!isRunning) return;

    const websocket = new WebSocket("ws://localhost:5000/ws");

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.frame) {
          setFrameSrc(`data:image/jpeg;base64,${data.frame}`);
        }
        if (data.count !== undefined) {
          setCount(data.count);
        }
        if (data.stage) {
          setStage(data.stage);
        }
        if (data.confidence !== undefined) {
          setConfidence(data.confidence);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      websocket.close();
    };
  }, [isRunning]);

  return (
    <div
      className="flex min-h-screen overflow-hidden bg-black"
      style={{
        background: "linear-gradient(to bottom, #000 40%, #1e293b 45%)",
      }}
    >
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex-1 container mx-auto px-10 py-[1.4%] bg-black">
        {/* Navbar Placeholder */}
        <div className="h-16 w-full bg-gray-800 rounded-lg mb-4">
          <h1 className="text-4xl font-bold text-white text-center">
            Squats Exercise
          </h1>
        </div>

        {/* Page Heading */}

        {/* Video Feed or Countdown */}
        <div className="flex flex-col items-center justify-center h-[70vh] bg-gray-900 rounded-lg overflow-hidden">
          {countdown > 0 ? (
            <div className="flex flex-col items-center justify-center text-gray-200">
              <p className="text-5xl font-bold mb-4">Starting in</p>
              <p className="text-6xl font-extrabold">{countdown}</p>
            </div>
          ) : frameSrc ? (
            <img
              src={frameSrc}
              alt="Processed Frame"
              className="w-full h-full object-contain"
            />
          ) : (
            <p className="text-gray-500 italic">Loading video feed...</p>
          )}
        </div>

        {/* Prediction Data */}
        {isRunning && (
          <div className="flex justify-between items-center mt-4 text-gray-200">
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-lg">Count: {count}</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-lg">Stage: {stage}</p>
            </div>
            {/* 
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-lg">Confidence: {(confidence * 100).toFixed(0)}%</p>
            </div>
            */}
          </div>
        )}
      </div>
    </div>
  );
}
