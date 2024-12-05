"use client";

import React, { useState } from "react";
import { Sidebar } from "../sidebar/page";

interface Exercise {
  name: string;
  image: string;
  description: string;
}

export default function StartTherapy() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flippedCards, setFlippedCards] = useState<{ [key: number]: boolean }>(
    {}
  );

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const exercises: Exercise[] = [
    {
      name: "Leg Raises",
      image: "/images/legraises.jpg",
      description: "Helps strengthen core and lower body.",
    },
    {
      name: "Lunges",
      image: "/images/lunges.jpg",
      description: "Improves balance and strengthens legs.",
    },
    {
      name: "Squats",
      image: "/images/squats.jpg",
      description: "Enhances leg and glute strength.",
    },
    {
      name: "Warrior Pose",
      image: "/images/warriorpose.jpg",
      description: "Builds stamina and flexibility.",
    },
  ];

  const handleFlip = (idx: number) => {
    setFlippedCards((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

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
        {/* Top Section: Video and Intro */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Intro Text */}
          <div className="md:w-1/2 text-left space-y-6">
            <h1 className="text-3xl text-left font-semibold text-white mb-8 tracking-tight">
              Start Your Recovery Journey
            </h1>
            <p className="text-lg text-gray-300">
              A personalized fitness companion designed to guide you every step
              of the way. From real-time posture corrections to detailed
              progress tracking, start your journey today with our AI-driven
              support system.
            </p>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-semibold text-white">
                  What You Will Get:
                </h2>
                <ul className="list-disc pl-5 text-gray-400">
                  <li>Bilingual feedback in both English and Urdu.</li>
                  <li>Live posture correction.</li>
                  <li>Session report generation.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden w-full md:w-1/2 lg:w-2/3 xl:w-3/4 mt-[-90px]">
            {" "}
            {/* Adjust margin-top */}
            <video
              src="/videos/vision.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto object-cover object-top"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>

        {/* Bottom Section: Exercise Cards */}
        <div className="!mt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10  w-full rounded-lg max-w-screen-4xl mx-auto">
          {exercises.map((exercise, idx) => (
            <div
              key={idx}
              className="group relative w-full h-[400px] rounded-xl shadow-lg bg-slate-800 transform transition-transform hover:scale-105 duration-300 border border-white" // Added border-4 and border-white
            >
              {/* Card Inner */}
              <div
                className={`relative w-full h-full text-center transition-transform duration-500 transform ${
                  flippedCards[idx] ? "rotate-y-180" : ""
                }`}
                style={{
                  transformStyle: "preserve-3d",
                  perspective: "1000px",
                }}
              >
                {/* Card Front */}
                <div
                  className="absolute w-full h-full p-6 text-white rounded-xl bg-slate-800 backface-hidden"
                  style={{
                    backfaceVisibility: "hidden",
                  }}
                >
                  <div className="w-full h-[60%] overflow-hidden rounded-lg">
                    <img
                      src={exercise.image}
                      alt={exercise.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-200 mt-4">
                    {exercise.name}
                  </h3>
                  <button
                    className="mt-4 bg-red-900 text-white text-sm px-4 py-2 rounded-md hover:bg-red-800"
                    onClick={() => handleFlip(idx)}
                  >
                    Start Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
