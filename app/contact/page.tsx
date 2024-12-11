"use client"; // Marking the component as Client Component

import React, { useState } from "react";
import { Sidebar } from "../sidebar/page";

export default function ContactUs() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-gray-200 flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div
        className={`flex-grow transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <div className="flex flex-col items-center justify-center min-h-screen w-full px-8">
          <div className="w-full max-w-lg bg-slate-900 p-6 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300">
            {/* Header */}
            <div className="text-center text-3xl font-semibold text-gray-100 tracking-wide mb-4">
              Contact Us
            </div>

            {/* Description */}
            <div className="text-center text-md font-medium text-gray-400 mb-6">
              <p>
                We'd love to hear from you! Please fill out the form below and
                we will get back to you shortly. 🚀
              </p>
            </div>

            {/* Contact Form */}
            <form className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col">
                  <label
                    htmlFor="name"
                    className="text-white text-sm font-medium mb-2"
                  ></label>
                  <input
                    type="text"
                    id="name"
                    placeholder="Enter your name"
                    className="w-full p-3 text-white bg-slate-950 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7a73c1]"
                  />
                </div>

                <div className="flex flex-col">
                  <label
                    htmlFor="email"
                    className="text-white text-sm font-medium mb-2"
                  ></label>
                  <input
                    type="email"
                    id="email"
                    placeholder="Enter your email"
                    className="w-full p-3 text-white bg-slate-950 rounded-md focus:outline-none focus:ring-2 focus:ring-[#]"
                  />
                </div>

                <div className="flex flex-col">
                  <label
                    htmlFor="message"
                    className="text-white text-sm font-medium mb-2"
                  ></label>
                  <textarea
                    id="message"
                    rows={4}
                    placeholder="Write your message here..."
                    className="w-full p-3 text-white bg-slate-950 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7a73c1]"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="submit"
                  className="px-6 py-3 text-white bg-[#42499b] rounded-md hover:bg-[#7a73c1] transition-all text-sm font-semibold"
                >
                  Submit
                </button>
              </div>
            </form>

            {/* Footer Note */}
            <div className="text-center text-gray-500 text-sm mt-6">
              <p>
                We respect your privacy and will never share your information.
                💜
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
