import { POST } from "@/utils/api.service"; // Assuming POST method is available for sending data

// Define the type for the form data (assuming these are user-specific data)
export interface UserFormData {
  name: string;
  username: string;
  email: string;
  sex: string;
  age: number;
  height: number;
  hypertension: string;
  diabetes: string;
  bmi: number;
  pain_level: string;
  pain_category: string;
}

// Define the API endpoint URL
const API_URL = "/api/user/update";

// Function to send data to backend to update or create a user field
export const updateUserData = async (data: UserFormData) => {
  try {
    const response = await POST<{ message: string }, UserFormData>(
      API_URL,
      data
    );
    return response?.message || "User data updated successfully!";
  } catch (error) {
    console.error("Error updating user data:", error);
    throw new Error("Failed to update user data.");
  }
};
