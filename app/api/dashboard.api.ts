import { GET } from "@/utils/api.service";

export interface User {
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

export const fetchUserData = async (username: string): Promise<User | null> => {
  try {
    const response = await GET<{ user: User }, undefined>(
      `/api/user/${username}`,
      undefined
    );

    if (response?.user) {
      return response.user; // ✅ Return user data
    }

    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};
