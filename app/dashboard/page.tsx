"use client";

import React, { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { Sidebar } from "../sidebar/page";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    console.log("Sidebar Open State: ", sidebarOpen); // Log state change
  };

  // Function to generate circular progress with gradient and attractive styles
  const CircleProgressWithGradient = ({ progress }: { progress: number }) => {
    const radius = 40;
    const stroke = 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <svg className="w-32 h-32" viewBox="0 0 120 120">
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              style={{ stopColor: "#4CAF50", stopOpacity: 1 }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "#FFEB3B", stopOpacity: 1 }}
            />
          </linearGradient>
        </defs>
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={stroke}
          fill="none"
          className="transition-all duration-500 ease-out shadow-md"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="url(#grad1)" // Applying the gradient
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out transform hover:scale-110 hover:rotate-6"
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          stroke="white"
          strokeWidth="1px"
          dy=".3em"
          className="text-2xl font-extrabold tracking-tight"
        >
          {progress}%
        </text>
      </svg>
    );
  };

  return (
    <BrowserRouter>
      <div className="flex">
        {/* Sidebar */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="flex-1 container mx-auto px-4 py-8">
          <h1 className="text-2xl centered font-semibold">
            Welcome to PhysioVision
          </h1>

          {/* Cards Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {/* Card 1: Patient Info */}
            <div className="bg-slate-800 text-white p-6 rounded-lg shadow-lg hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105">
              <h2 className="text-xl font-bold mb-4">Patient Info</h2>
              <div className="space-y-2">
                <p>
                  <strong>Name:</strong> John Doe
                </p>
                <p>
                  <strong>Email:</strong> john@example.com
                </p>
                <p>
                  <strong>Focus Area:</strong> Knee
                </p>
                <p>
                  <strong>Problem/Pain Type:</strong> Chronic & Acute
                </p>
                <p>
                  <strong>BMI:</strong> 24.5
                </p>
                <p>
                  <strong>Weight:</strong> 75 kg
                </p>
                <p>
                  <strong>Height:</strong> 175 cm
                </p>
              </div>
            </div>

            {/* Card 2: Recovery Plan */}
            <div className="bg-slate-800 text-white p-6 rounded-lg shadow-lg hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105">
              <h2 className="text-xl font-bold mb-4">Recovery Plan</h2>
              <div className="space-y-2">
                <p>
                  <strong>Week 1 Plan:</strong> Exercise & Food Plan
                </p>
                <p>
                  <strong>Week 2 Plan:</strong> Exercise & Food Plan
                </p>
                <p>
                  <strong>No. of Weeks to Recover:</strong> 8 Weeks
                </p>
                <p>
                  <strong>Exercise Completion Rate:</strong> 85%
                </p>
              </div>
            </div>

            {/* Card 3: Progress Graph */}
            <div className="bg-slate-800 text-white p-6 rounded-lg shadow-lg hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105">
              <h2 className="text-xl font-bold mb-4">Progress & Graphs</h2>
              <div className="space-y-2">
                <p>
                  <strong>Last Report:</strong> Updated Report
                </p>
                <div className="mt-6">
                  {/* Circular Progress Graphs */}
                  <div className="flex justify-around">
                    <div className="flex flex-col items-center">
                      <CircleProgressWithGradient progress={60} />
                      <p className="mt-2">Exercise Progress</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <CircleProgressWithGradient progress={40} />
                      <p className="mt-2">Nutrition Progress</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <CircleProgressWithGradient progress={75} />
                      <p className="mt-2">Pain Reduction</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Exercise & Nutrition Progress */}
            <div className="bg-slate-800 text-white p-6 rounded-lg shadow-lg hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105">
              <h2 className="text-xl font-bold mb-4">
                Exercise & Nutrition Progress
              </h2>
              <div className="space-y-2">
                <p>
                  <strong>Exercise Completion Rate:</strong> 85%
                </p>
                <p>
                  <strong>Last Report:</strong> Updated Report
                </p>
              </div>
              <div className="mt-6">
                {/* Circular Progress */}
                <div className="flex justify-around">
                  <div className="flex flex-col items-center">
                    <CircleProgressWithGradient progress={70} />
                    <p className="mt-2">Exercise Completion</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <CircleProgressWithGradient progress={50} />
                    <p className="mt-2">Nutrition Consistency</p>
                  </div>
                </div>
              </div>
            </div>

            {/* New Card 5: Recent Activity */}
            <div className="bg-slate-800 text-white p-6 rounded-lg shadow-lg hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105">
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              <div className="space-y-2">
                <p>
                  <strong>Latest Exercise Completed:</strong> Knee Stretch
                </p>
                <p>
                  <strong>Nutrition Consistency:</strong> 90%
                </p>
                <p>
                  <strong>Recent Report:</strong> No major changes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}
