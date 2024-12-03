import React, { useState, useEffect, useRef } from "react";
import Link from "next/link"; // Use Next.js Link for navigation
import { usePathname } from "next/navigation"; // Use usePathname for App Router
import {
  DashboardOutlined,
  RobotOutlined,
  CameraOutlined,
  MailOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import Logo from "@/components/ui/logo";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  variant?: "default" | "v2";
}

export function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  variant = "default",
}: SidebarProps) {
  const pathname = usePathname(); // Use usePathname for App Router

  const trigger = useRef<HTMLButtonElement | null>(null);
  const sidebar = useRef<HTMLDivElement | null>(null);

  const storedSidebarExpanded = localStorage.getItem("sidebar-expanded");
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === "true"
  );

  useEffect(() => {
    localStorage.setItem("sidebar-expanded", sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector("body")?.classList.add("sidebar-expanded");
    } else {
      document.querySelector("body")?.classList.remove("sidebar-expanded");
    }
  }, [sidebarExpanded]);

  const menuItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: <DashboardOutlined />,
    },
    {
      path: "/recommendations",
      label: "Get Advice",
      icon: <RobotOutlined />,
    },
    {
      path: "/start-therapy",
      label: "Start Therapy",
      icon: <CameraOutlined />,
    },
    {
      path: "/contact",
      label: "Contact Us",
      icon: <MailOutlined />,
    },
  ];

  return (
    <div className="min-w-fit">
      <div
        id="sidebar"
        ref={sidebar}
        className={`flex flex-col absolute z-40 left-0 top-0 lg:static lg:left-auto lg:top-auto lg:translate-x-0 h-[100vh] overflow-hidden w-64 lg:w-20 lg:sidebar-expanded:w-64 bg-slate-900 p-4 transition-all duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-64"
        } ${variant === "v2" ? "border-r border-slate-800" : "rounded-r-2xl"}`}
      >
        {/* Sidebar Header */}
        <div className="flex justify-between mb-10 ml-10">
          <Link href="/" passHref>
            <Logo />
          </Link>
        </div>

        {/* Links */}
        <div className="space-y-4">
          <ul>
            {menuItems.map((item) => (
              <li key={item.path} className="mb-2">
                <Link href={item.path} passHref>
                  <div
                    className={`flex items-center p-3 rounded-md text-lg font-medium transition-colors duration-150 ${
                      pathname === item.path
                        ? "bg-slate-800 text-white"
                        : "text-gray-400"
                    } hover:bg-opacity-90 hover:text-white hover:shadow-md`}
                  >
                    <span className="mr-3 text-xl">{item.icon}</span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Logout */}
        <div className="mt-auto">
          <Link href="/logout" passHref>
            <div className="flex items-center p-3 rounded-md text-lg font-medium text-red-500 hover:bg-opacity-90 hover:text-white hover:shadow-md">
              <span className="mr-3 text-xl">
                <LogoutOutlined />
              </span>
              Logout
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
