"use client";

import React, { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { Sidebar } from "../sidebar/page"; // Ensure the correct path to Sidebar

// Dummy Start Therapy Page
export default function StartTherapy() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
    console.log("Sidebar Open State: ", sidebarOpen); // Log state change
  };

  return (
    <BrowserRouter>
      <div className="flex">
        {/* Sidebar */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="flex-1 container mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold text-center">
            Start Your Therapy Journey
          </h1>
          <div className="mt-8 text-center">
            <p className="text-lg text-gray-600">
              Welcome to PhysioVision! Ready to begin your journey to better
              health? We’re here to guide you through every step of your
              recovery.
            </p>

            <div className="mt-8">
              <button
                onClick={() => alert("Therapy Started!")}
                className="bg-blue-600 text-white py-3 px-6 rounded-full shadow-md hover:bg-blue-700 transition duration-300 transform hover:scale-105"
              >
                Start Therapy
              </button>
            </div>

            <div className="mt-8">
              <p className="text-gray-500">
                Need assistance? Reach out to our support team at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}
