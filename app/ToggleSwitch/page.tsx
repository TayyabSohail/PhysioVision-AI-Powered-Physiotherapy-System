"use client";

import React, { useState, useEffect } from "react";

// Define the props interface
interface ToggleSwitchProps {
  onToggleChange: ({
    isEnabled,
    isOriginalChecked,
  }: {
    isEnabled: boolean;
    isOriginalChecked: boolean;
  }) => void;
}

export function ToggleSwitch({ onToggleChange }: ToggleSwitchProps) {
  const [isEnabled, setIsEnabled] = useState(false); // controls if original toggle is enabled
  const [isOriginalChecked, setIsOriginalChecked] = useState(false); // state of original toggle

  // Reset isOriginalChecked when isEnabled becomes false
  useEffect(() => {
    if (!isEnabled) {
      setIsOriginalChecked(false);
    }
  }, [isEnabled]);

  // Notify parent of toggle state changes
  useEffect(() => {
    onToggleChange({ isEnabled, isOriginalChecked });
  }, [isEnabled, isOriginalChecked, onToggleChange]);

  return (
    <div className="p-6 flex items-center gap-8">
      {/* Controller Switch */}
      <div className="flex items-center">
        <input
          className="mr-2 mt-[0.3rem] h-3.5 w-8 appearance-none rounded-[0.4375rem] bg-neutral-300 
          before:pointer-events-none before:absolute before:h-3.5 before:w-3.5 before:rounded-full 
          before:bg-transparent before:content-[''] after:absolute after:z-[2] after:-mt-[0.1875rem] 
          after:h-5 after:w-5 after:rounded-full after:border-none after:bg-neutral-100 
          after:shadow-[0_0px_3px_0_rgb(0_0_0_/_7%),_0_2px_2px_0_rgb(0_0_0_/_4%)] 
          after:transition-[background-color_0.2s,transform_0.2s] after:content-[''] 
          checked:bg-primary checked:after:ml-[1.0625rem] 
          checked:after:bg-primary checked:after:shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),_0_2px_2px_0_rgba(0,0,0,0.14),_0_1px_5px_0_rgba(0,0,0,0.12)] 
          hover:cursor-pointer focus:outline-none"
          type="checkbox"
          role="switch"
          id="controllerSwitch"
          checked={isEnabled}
          onChange={() => setIsEnabled((prev) => !prev)}
        />
        <label htmlFor="controllerSwitch" className="inline-block pl-[0.15rem]">
          Enable Audiobot
        </label>
      </div>

      {/* Language Switch */}
      <div className="flex items-center">
        <input
          className="mr-2 mt-[0.3rem] h-3.5 w-8 appearance-none rounded-[0.4375rem] bg-neutral-300 
          before:pointer-events-none before:absolute before:h-3.5 before:w-3.5 before:rounded-full 
          before:bg-transparent before:content-[''] after:absolute after:z-[2] after:-mt-[0.1875rem] 
          after:h-5 after:w-5 after:rounded-full after:border-none after:bg-neutral-100 
          after:shadow-[0_0px_3px_0_rgb(0_0_0_/_7%),_0_2px_2px_0_rgb(0_0_0_/_4%)] 
          after:transition-[background-color_0.2s,transform_0.2s] after:content-[''] 
          checked:bg-primary checked:after:ml-[1.0625rem] 
          checked:after:bg-primary checked:after:shadow-[0_3px_1px_-2px_rgba(0,0,0,0.2),_0_2px_2px_0_rgba(0,0,0,0.14),_0_1px_5px_0_rgba(0,0,0,0.12)] 
          hover:cursor-pointer focus:outline-none disabled:cursor-default disabled:opacity-60"
          type="checkbox"
          role="switch"
          id="originalSwitch"
          disabled={!isEnabled}
          checked={isOriginalChecked}
          onChange={() => setIsOriginalChecked((prev) => !prev)}
        />
        <label
          htmlFor="originalSwitch"
          className={`inline-block pl-[0.15rem] ${
            !isEnabled ? "opacity-50" : ""
          }`}
        >
          Use Urdu
        </label>
      </div>
    </div>
  );
}
