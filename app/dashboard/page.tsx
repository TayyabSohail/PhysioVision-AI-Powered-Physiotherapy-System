"use client";

import React, { useState, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { Sidebar } from "../sidebar/page";
import { useUser } from "@/contexts/AppContext";

// Types for the data
interface User {
  name?: string;
  email?: string;
  sex?: string;
  hypertension?: string;
  diabetes?: string;
  pain_category?: string;
  bmi?: number;
  age?: number;
  height?: number;
}

interface WeeklyPlan {
  username: string;
  weekly_plans: string[];
}

// API functions
const fetchUserData = async (username: string): Promise<User | null> => {
  try {
    const response = await fetch(`http://localhost:8000/user/${username}`);
    if (!response.ok) {
      console.error("Failed to fetch user data");
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

const fetchWeeklyPlan = async (
  username: string
): Promise<WeeklyPlan | null> => {
  try {
    const response = await fetch(
      `http://localhost:8000/weekly-plan/${username}`
    );
    if (!response.ok) {
      console.error("Failed to fetch weekly plan");
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching weekly plan:", error);
    return null;
  }
};

const Dashboard: React.FC = () => {
  const { username } = useUser(); // Use username from context
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<User | null>(null);
  const [weeklyPlanData, setWeeklyPlanData] = useState<WeeklyPlan | null>(null);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Fetch user data and weekly plan when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (username) {
        // Fetch user data
        const data = await fetchUserData(username);
        setUserData(data);

        // Fetch weekly plan data
        const weeklyPlan = await fetchWeeklyPlan(username);
        setWeeklyPlanData(weeklyPlan);
      }
    };

    fetchData();
  }, [username]); // Effect will rerun when username changes

  // Function to parse and display weekly plan
  const renderWeeklyPlan = () => {
    if (
      !weeklyPlanData ||
      !weeklyPlanData.weekly_plans ||
      weeklyPlanData.weekly_plans.length === 0
    ) {
      return <p className="text-sm">No weekly plan available.</p>;
    }

    // Display only up to 4 weeks in the card for space considerations
    const displayWeeks = weeklyPlanData.weekly_plans.slice(0, 4);

    return (
      <>
        {displayWeeks.map((plan, index) => {
          const [exercisePart, nutritionPart] = plan.split("| Nutrition:");

          return (
            <div key={index} className="mb-3 pb-3 border-b border-gray-700">
              <p className="text-sm font-semibold text-indigo-300">
                Week {index + 1}
              </p>
              <p className="text-sm">
                <strong>Exercises:</strong>{" "}
                {exercisePart.replace(/Week \d+: /, "")}
              </p>
              {nutritionPart && (
                <p className="text-sm">
                  <strong>Nutrition:</strong> {nutritionPart}
                </p>
              )}
            </div>
          );
        })}
        <p className="text-sm mt-3">
          <strong>No. of Weeks to Recover:</strong>{" "}
          {weeklyPlanData.weekly_plans.length} Weeks
        </p>
      </>
    );
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
      <div className="flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="flex-1 container mx-auto px-4 py-8">
          <h1 className="text-4xl text-center font-semibold text-white mb-8 tracking-tight">
            Welcome to PhysioVision
          </h1>

          {/* Cards Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-center">
            {/* Card 1: Patient Info */}
            <div className="bg-slate-800 text-white p-4 rounded-lg shadow-xl hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105 text-left">
              <h2 className="text-xl font-bold text-indigo-400 mb-4 tracking-tight">
                Patient Info
              </h2>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Name:</strong> {userData?.name ?? "N/A"}
                </p>
                <p className="text-sm">
                  <strong>Email:</strong> {userData?.email ?? "N/A"}
                </p>
                <p className="text-sm">
                  <strong>Sex:</strong> {userData?.sex ?? "N/A"}
                </p>
                <p className="text-sm">
                  <strong>Hypertension:</strong>{" "}
                  {userData?.hypertension ?? "N/A"}
                </p>{" "}
                <p className="text-sm">
                  <strong>Diabetes:</strong> {userData?.diabetes ?? "N/A"}
                </p>
                <p className="text-sm">
                  <strong>Mobility:</strong> {userData?.pain_category ?? "N/A"}
                </p>
                <p className="text-sm">
                  <strong>BMI:</strong> {userData?.bmi ?? "N/A"}
                </p>
                <p className="text-sm">
                  <strong>Weight:</strong>{" "}
                  {userData?.age ? userData.age * 0.9 : "N/A"} kg
                </p>
                <p className="text-sm">
                  <strong>Height:</strong> {userData?.height ?? "N/A"} cm
                </p>
              </div>
            </div>

            {/* Card 2: Recovery Plan */}
            <div className="bg-slate-800 text-white p-4 rounded-lg shadow-xl hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105 text-left">
              <h2 className="text-xl font-bold text-indigo-400 mb-4 tracking-tight">
                Recovery Plan
              </h2>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {renderWeeklyPlan()}
              </div>
            </div>

            {/* Card 3: Progress Graph */}
            <div className="bg-slate-800 text-white p-4 rounded-lg shadow-xl hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105 text-left">
              <h2 className="text-xl font-bold text-indigo-400 mb-4 tracking-tight">
                Progress & Graphs
              </h2>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Last Report:</strong> Updated Report
                </p>
                <div className="mt-6">
                  {/* Circular Progress Graphs */}
                  <div className="flex justify-around">
                    <div className="flex flex-col items-center">
                      <CircleProgressWithGradient progress={60} />
                      <p className="mt-2 text-sm">Exercise Progress</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <CircleProgressWithGradient progress={40} />
                      <p className="mt-2 text-sm">Nutrition Progress</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Exercise & Nutrition Progress */}
            <div className="bg-slate-800 text-white p-4 rounded-lg shadow-xl hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105 text-left">
              <h2 className="text-xl font-bold text-indigo-400 mb-4 tracking-tight">
                Exercise & Nutrition Progress
              </h2>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Exercise Completion Rate:</strong> 85%
                </p>
                <p className="text-sm">
                  <strong>Last Report:</strong> Updated Report
                </p>
              </div>
              <div className="mt-6">
                {/* Circular Progress */}
                <div className="flex justify-around space-x-4 p-4 bg-slate-800 rounded-lg shadow-md">
                  {/* Exercise Completion */}
                  <div className="flex flex-col items-center w-1/2">
                    <p className="text-sm font-semibold mb-2">
                      Exercise Completion
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-blue-500 h-4 rounded-full transition-all"
                        style={{ width: "70%" }}
                      ></div>
                    </div>
                    <p className="mt-2 text-sm text-white">70%</p>
                  </div>

                  {/* Nutrition Consistency */}
                  <div className="flex flex-col items-center w-1/2">
                    <p className="text-sm font-semibold mb-2">
                      Nutrition Consistency
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-green-500 h-4 rounded-full transition-all"
                        style={{ width: "50%" }}
                      ></div>
                    </div>
                    <p className="mt-2 text-sm text-white">50%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* New Card 5: Recent Activity */}
            <div className="bg-slate-800 text-white p-4 rounded-lg shadow-xl hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105 text-left">
              <h2 className="text-xl font-bold text-indigo-400 mb-4 tracking-tight">
                Recent Activity
              </h2>
              <div className="space-y-2">
                <p className="text-sm">
                  No activity yet, start your recovery journey!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default Dashboard;
