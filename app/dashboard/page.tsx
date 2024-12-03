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

  return (
    <BrowserRouter>
      <div className="flex">
        {/* Sidebar */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div className="flex-1 container mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold">Welcome to the Dashboard</h1>
          <p className="mt-4">This is your dashboard page.</p>

 
        </div>
      </div>
    </BrowserRouter>
  );
}
