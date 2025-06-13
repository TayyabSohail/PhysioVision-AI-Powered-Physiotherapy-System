"use client";

import React, { useState } from "react";
import { Sidebar } from "../sidebar/page";
import emailjs from "emailjs-com";

export default function ContactUs() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    emailjs
      .send(
        "service_5i2cilv",
        "template_19nur38",
        formData,
        "gwPw-uj2JP1sKTIur"
      )
      .then(
        () => {
          alert("Message sent successfully!");
          setFormData({ name: "", email: "", message: "" });
        },
        (error) => {
          console.error("Email send error:", error);
          alert("Failed to send message.");
        }
      );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-gray-200 flex overflow-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div
        className={`flex-grow transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        <div className="flex flex-col items-center justify-center min-h-screen w-full px-8">
          <div className="w-full max-w-lg bg-slate-900 p-6 rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300">
            <div className="text-center text-3xl font-semibold text-gray-100 tracking-wide mb-4">
              Contact Us
            </div>
            <div className="text-center text-md font-medium text-gray-400 mb-6">
              <p>
                We'd love to hear from you! Please fill out the form below. 🚀
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <input
                name="name"
                type="text"
                placeholder="Enter your name"
                className="w-full p-3 text-white bg-slate-950 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7a73c1]"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <input
                name="email"
                type="email"
                placeholder="Enter your email"
                className="w-full p-3 text-white bg-slate-950 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7a73c1]"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <textarea
                name="message"
                rows={4}
                placeholder="Write your message here..."
                className="w-full p-3 text-white bg-slate-950 rounded-md focus:outline-none focus:ring-2 focus:ring-[#7a73c1]"
                value={formData.message}
                onChange={handleChange}
                required
              />
              <div className="flex justify-center">
                <button
                  type="submit"
                  className="px-6 py-3 text-white bg-[#42499b] rounded-md hover:bg-[#7a73c1] transition-all text-sm font-semibold"
                >
                  Submit
                </button>
              </div>
            </form>

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
