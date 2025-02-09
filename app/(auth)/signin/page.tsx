"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/app/api/auth.api";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/AppContext"; // Import the correct hook

interface User {
  username: string;
  name: string;
}

export default function SignIn() {
  const [username, setUsernameInput] = useState<string>(""); // Local state for username
  const [password, setPassword] = useState<string>(""); // Local state for password
  const router = useRouter();
  const { setUsername, username: contextUsername } = useUser(); // Get username from context

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Attempting to sign in with username:", username);

    try {
      const notification = {
        error: (msg: any) => alert(msg.message),
      };

      // Pass setUsername to login function and set the username in context
      const user = await login({
        username,
        password,
        notification,
        setUsername: (username: string | null) => {
          setUsername(username); // Update global context here
        },
      });

      if (user) {
        // Log context username before and after login
        console.log(
          "Context username before login:",
          contextUsername ?? "No username set"
        );

        // Fetch user data from the dashboard API after login
        const response = await fetch(`/api/dashboard/${user.username}`);
        const userData: User = await response.json();

        if (userData) {
          console.log("User data fetched:", userData);
          router.push("/dashboard");
        } else {
          console.error("Failed to fetch user data from the API.");
        }
      }
    } catch (error) {
      console.error("Authentication failed:", error);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setUsernameInput(newUsername); // Update local state for username
    console.log("Username input changed:", newUsername); // Log new username
  };

  console.log(
    "Current context username before login:",
    contextUsername ?? "No username set"
  ); // Log context username

  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-12 md:py-20">
          <div className="pb-12 text-center">
            <h1 className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-indigo-200 to-gray-50 md:text-4xl">
              Welcome back
            </h1>
          </div>
          <form className="mx-auto max-w-[400px]" onSubmit={handleSignIn}>
            <div className="space-y-5">
              <div>
                <label
                  className="mb-1 block text-sm font-medium text-indigo-200/65"
                  htmlFor="username"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  className="form-input w-full"
                  placeholder="Your username"
                  required
                  value={username}
                  onChange={handleUsernameChange} // Update username on change
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label
                    className="block text-sm font-medium text-indigo-200/65"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <Link
                    className="text-sm text-white hover:underline"
                    href="/reset-password"
                  >
                    Forgot?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  className="form-input w-full"
                  placeholder="Your password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 space-y-5">
              <button
                type="submit"
                className="btn w-full bg-gradient-to-t from-slate-800 to-indigo-500 text-white"
              >
                Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
