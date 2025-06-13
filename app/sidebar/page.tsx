import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DashboardOutlined,
  RobotOutlined,
  CameraOutlined,
  MailOutlined,
  LogoutOutlined,
  SettingOutlined, // Import the settings icon
} from "@ant-design/icons";
import Logo from "@/components/ui/logo";
import { Modal } from "antd";
import { UserInfoForm } from "../UserInfoForm/page";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false); // State for the modal visibility

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
    {
      label: "Edit Profile",
      icon: <SettingOutlined />,
      onClick: () => setIsModalVisible(true),
    }, // Edit Profile item
  ];

  // Handle the form modal visibility
  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <div
      className={`bg-slate-900 transition-transform duration-300 ease-in-out p-4 flex flex-col rounded-lg ${
        sidebarOpen ? "translate-x-0" : "-translate-x-64"
      } lg:translate-x-0 overflow-hidden`}
    >
      {/* Sidebar Header */}
      <div className="mb-6">
        <Link href="/" passHref>
          <Logo />
        </Link>
      </div>

      {/* Menu Items */}
      <ul className="flex-1 space-y-3">
        {menuItems.map((item, index) => (
          <li key={index}>
            {item.path ? (
              <Link href={item.path} passHref>
                <div
                  className={`flex items-center p-3 rounded-md text-lg font-medium cursor-pointer transition-all duration-200 ease-in-out ${
                    pathname === item.path
                      ? "bg-slate-800 text-white"
                      : "text-gray-400"
                  } hover:bg-opacity-90 hover:text-white hover:shadow-md`}
                >
                  <span className="mr-2 text-xl">{item.icon}</span>
                  {item.label}
                </div>
              </Link>
            ) : (
              <div
                className="flex items-center p-3 rounded-md text-lg font-medium cursor-pointer transition-all duration-200 ease-in-out text-gray-400 hover:bg-opacity-90 hover:text-white hover:shadow-md"
                onClick={item.onClick}
              >
                <span className="mr-2 text-xl">{item.icon}</span>
                {item.label}
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Logout Button */}
      <div className="mt-auto">
        <Link href="/" passHref>
          <div className="flex items-center p-3 rounded-md text-lg font-medium text-red-500 hover:bg-opacity-90 hover:text-white hover:shadow-md transition-all duration-200 ease-in-out">
            <span className="mr-3 text-xl">
              <LogoutOutlined />
            </span>
            Logout
          </div>
        </Link>
      </div>

      {/* Edit Profile Form Modal */}
      <Modal
        title="Edit Profile"
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        footer={null} // Optional: Customize footer if needed
      >
        {/* Display UserInfoForm instead of EditProfileForm */}
        <UserInfoForm onClose={handleCancel} />
      </Modal>
    </div>
  );
}
