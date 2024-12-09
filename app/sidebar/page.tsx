import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
}

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const [menuExpanded, setMenuExpanded] = useState(false);

  useEffect(() => {
    localStorage.setItem("menu-expanded", menuExpanded.toString());
  }, [menuExpanded]);

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
    { path: "/chatbot", label: "Fitness Assistant", icon: <RobotOutlined /> },
    {
      path: "/start-therapy",
      label: "Start Therapy",
      icon: <CameraOutlined />,
    },
    { path: "/contact", label: "Contact Us", icon: <MailOutlined /> },
  ];

  return (
    <div
      className={`h-screen bg-slate-900 transition-transform duration-300 ease-in-out p-4 flex flex-col ${
        sidebarOpen ? "translate-x-0" : "-translate-x-64"
      } lg:translate-x-0 lg:w-64`}
    >
      {/* Sidebar Header */}
      <div className="mb-8">
        <Link href="/" passHref>
          <Logo />
        </Link>
      </div>

      {/* Menu Items */}
      <ul className="flex-1 space-y-4">
        {menuItems.map((item) => (
          <li key={item.path}>
            <Link href={item.path} passHref>
              <div
                className={`flex items-center p-3 rounded-md text-lg font-medium cursor-pointer ${
                  pathname === item.path
                    ? "bg-slate-800 text-white"
                    : "text-gray-400"
                } hover:bg-opacity-90 hover:text-white hover:shadow-md transition-all duration-200 ease-in-out`}
              >
                <span className="mr-2 text-xl">{item.icon}</span>
                {item.label}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Logout Button */}
      <div className="mt-auto">
        <Link href="/logout" passHref>
          <div className="flex items-center p-3 rounded-md text-lg font-medium text-red-500 hover:bg-opacity-90 hover:text-white hover:shadow-md transition-all duration-200 ease-in-out">
            <span className="mr-3 text-xl">
              <LogoutOutlined />
            </span>
            Logout
          </div>
        </Link>
      </div>
    </div>
  );
}
