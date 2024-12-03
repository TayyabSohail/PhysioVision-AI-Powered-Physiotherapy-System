import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Sidebar } from "./app/sidebar/page";
import Dashboard from "./app/dashboard/page";
//import Recommendations from "./pages/Recommendations";
import StartTherapy from "./app/start-therapy/page";
//import Contact from "./pages/Contact";

function App() {
  return (
    <Router>
      <Sidebar sidebarOpen={true} setSidebarOpen={() => {}} />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/start-therapy" element={<StartTherapy />} />
      </Routes>
    </Router>
  );
}

export default App;
