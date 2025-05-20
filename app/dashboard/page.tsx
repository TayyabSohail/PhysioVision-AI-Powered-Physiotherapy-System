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

interface ErrorData {
  message: string;
  duration: number;
  percent: number;
}

interface Report {
  exercise: string;
  timestamp: string;
  content: string;
  errors: ErrorData[];
  good_form_duration: number;
  total_duration: number;
  analyzer?: string; // Added analyzer field
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
  const [report, setReport] = useState<Report | null>(null);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

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

      // Fetch latest vision report (no username needed)
      try {
        const res = await fetch(
          `http://localhost:8000/vision-report/latest` // <-- changed here, no username param
        );
        if (res.ok) {
          const reportData = await res.json();

          // Parse the content to extract information
          const contentLines = reportData.content.split("\n");
          const totalDurationMatch = contentLines
            .find((line: string) => line.includes("Total Recorded Time"))
            ?.match(/(\d+\.\d+) seconds/);
          const totalDuration = totalDurationMatch
            ? parseFloat(totalDurationMatch[1])
            : 0;

          // Example errors, adjust as needed
          const potentialErrors = [
            {
              message: "Knee alignment issue",
              duration: totalDuration * 0.2,
              percent: 20,
            },
            {
              message: "Arm position incorrect",
              duration: totalDuration * 0.15,
              percent: 15,
            },
            {
              message: "Torso not straight",
              duration: totalDuration * 0.1,
              percent: 10,
            },
          ];

          const errorTime = potentialErrors.reduce(
            (total, err) => total + err.duration,
            0
          );
          const goodFormDuration = Math.max(0, totalDuration - errorTime);

          const processedReport: Report = {
            exercise: reportData.exercise,
            timestamp: reportData.timestamp,
            content: reportData.content,
            errors: potentialErrors,
            good_form_duration: goodFormDuration,
            total_duration: totalDuration,
            analyzer: reportData.analyzer, // in case backend sends it
          };

          setReport(processedReport);
        }
      } catch (error) {
        console.error("Error fetching vision report:", error);
      }
    };

    fetchData();
  }, [username]);

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

            {/* Card 3: Exercise Form Score */}
            <div className="bg-slate-800 text-white p-4 rounded-lg shadow-xl hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105 text-left">
              <h2 className="text-xl font-bold text-indigo-400 mb-4 tracking-tight">
                Form Accuracy
              </h2>
              {report ? (
                <div className="flex flex-col items-center">
                  <CircleProgressWithGradient
                    progress={
                      report.total_duration > 0
                        ? Math.round(
                            (report.good_form_duration /
                              report.total_duration) *
                              100
                          )
                        : 0
                    }
                  />
                  <p className="mt-4 text-sm text-center text-gray-300">
                    Good form maintained for{" "}
                    <strong>{report.good_form_duration.toFixed(1)}s</strong> out
                    of <strong>{report.total_duration.toFixed(1)}s</strong>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Loading report...</p>
              )}
            </div>

            {/* Card 4: Top Errors Feedback */}
            <div className="bg-slate-800 text-white p-4 rounded-lg shadow-xl hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105 text-left">
              <h2 className="text-xl font-bold text-indigo-400 mb-4 tracking-tight">
                Form Feedback
              </h2>
              {report && report.errors && report.errors.length > 0 ? (
                <ul className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {report.errors
                    .sort((a, b) => b.percent - a.percent)
                    .map((error, index) => (
                      <li
                        key={index}
                        className="text-sm border-l-4 border-red-500 pl-2"
                      >
                        <strong>{error.message}</strong> —{" "}
                        {error.duration.toFixed(1)}s ({error.percent.toFixed(1)}
                        %)
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No feedback available.</p>
              )}
            </div>

            {/* Card 5: Session Summary */}
            <div className="bg-slate-800 text-white p-4 rounded-lg shadow-xl hover:bg-slate-700 transition-transform duration-300 transform hover:scale-105 text-left">
              <h2 className="text-xl font-bold text-indigo-400 mb-4 tracking-tight">
                Session Summary
              </h2>
              {report ? (
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Exercise:</strong> {report.exercise}
                  </p>
                  <p>
                    <strong>Date:</strong>{" "}
                    {new Date(report.timestamp).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Analyzer:</strong>{" "}
                    {report.analyzer || "Default Analyzer"}
                  </p>
                  <p>
                    <strong>Total Duration:</strong>{" "}
                    {report.total_duration.toFixed(1)}s
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No session data yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default Dashboard;
