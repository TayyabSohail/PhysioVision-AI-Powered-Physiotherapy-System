// /app/api/auth.api.ts
import { POST } from "@/utils/api.service";
import { UserContextType } from "@/contexts/AppContext"; // Ensure proper import of the context type

interface LoginResponse {
  success: boolean;
  user: {
    username: string;
  };
}

export const login = async ({
  username,
  password,
  notification,
  setUsername, // Pass setUsername as a parameter
}: {
  username: string;
  password: string;
  notification: any;
  setUsername: UserContextType["setUsername"]; // Correctly type the setUsername function
}) => {
  try {
    // Call the API to sign in
    const response = await POST<
      LoginResponse,
      { username: string; password: string }
    >("/api/signin", {
      username,
      password,
    });

    if (response?.success) {
      const { user } = response;

      // Update the context with the username
      setUsername(user.username);

      // Store the username in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("username", user.username);
      }

      // Redirect to dashboard
      window.location.href = "/dashboard"; // Redirect after login
    } else {
      notification?.error({
        message: "Incorrect username or password!",
      });
    }
  } catch (error) {
    notification?.error({
      message: "Login failed. Please try again.",
    });
  }
};
