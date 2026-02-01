import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthForm } from "@/components/auth/AuthForm";
import { mockRouterPush } from "../setup";
import {
  setMockUser,
  mockUser,
  setMockAuthError,
  resetMockState,
} from "../mocks/supabase";

describe("AuthForm", () => {
  beforeEach(() => {
    resetMockState();
    mockRouterPush.mockClear();
  });

  describe("Login Mode", () => {
    it("should render login form by default", () => {
      render(<AuthForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    });

    it("should show forgot password link in login mode", () => {
      render(<AuthForm />);
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    it("should redirect on successful login", async () => {
      const user = userEvent.setup();
      render(<AuthForm />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith("/");
      });
    });

    it("should show error on invalid credentials", async () => {
      const user = userEvent.setup();
      render(<AuthForm />);

      await user.type(screen.getByLabelText(/email/i), "wrong@example.com");
      await user.type(screen.getByLabelText("Password"), "wrongpassword");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
      });
    });

    it("should show loading state during login", async () => {
      const user = userEvent.setup();
      render(<AuthForm />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");

      const submitButton = screen.getByRole("button", { name: /log in/i });
      // Don't await - check loading state immediately after click
      void user.click(submitButton);

      // Button should be disabled during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe("Signup Mode", () => {
    it("should show password requirements hint in signup mode", async () => {
      const user = userEvent.setup();
      render(<AuthForm />);

      await user.click(screen.getByText(/need an account\? sign up/i));

      expect(screen.getByText(/min 8 characters/i)).toBeInTheDocument();
    });

    it("should show error when passwords do not match", async () => {
      const user = userEvent.setup();
      render(<AuthForm />);

      await user.click(screen.getByText(/need an account\? sign up/i));
      await user.type(screen.getByLabelText(/email/i), "new@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");
      await user.type(screen.getByLabelText(/confirm password/i), "Different123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it("should show error for weak password", async () => {
      const user = userEvent.setup();
      render(<AuthForm />);

      await user.click(screen.getByText(/need an account\? sign up/i));
      await user.type(screen.getByLabelText(/email/i), "new@example.com");
      await user.type(screen.getByLabelText("Password"), "weak");
      await user.type(screen.getByLabelText(/confirm password/i), "weak");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/password does not meet requirements/i)
        ).toBeInTheDocument();
      });
    });

    it("should show success message on signup", async () => {
      const user = userEvent.setup();
      render(<AuthForm />);

      await user.click(screen.getByText(/need an account\? sign up/i));
      await user.type(screen.getByLabelText(/email/i), "new@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");
      await user.type(screen.getByLabelText(/confirm password/i), "Password123");
      await user.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/check your email for a confirmation link/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Forgot Password Mode", () => {
    it("should send password reset email", async () => {
      const user = userEvent.setup();
      render(<AuthForm />);

      await user.click(screen.getByText(/forgot password/i));
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.click(screen.getByRole("button", { name: /send reset link/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/check your email for a password reset link/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("Guest Access", () => {
    it("should show guest access button", () => {
      render(<AuthForm />);
      expect(
        screen.getByRole("button", { name: /continue as guest/i })
      ).toBeInTheDocument();
    });

    it("should show guest data warning", () => {
      render(<AuthForm />);
      expect(
        screen.getByText(/guest data will not be saved between sessions/i)
      ).toBeInTheDocument();
    });

    it("should redirect to home on guest access", async () => {
      const user = userEvent.setup();
      render(<AuthForm />);

      await user.click(screen.getByRole("button", { name: /continue as guest/i }));

      expect(mockRouterPush).toHaveBeenCalledWith("/");
    });

    it("should hide guest access in forgot password mode", async () => {
      const user = userEvent.setup();
      render(<AuthForm />);

      await user.click(screen.getByText(/forgot password/i));

      expect(
        screen.queryByRole("button", { name: /continue as guest/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    it("should require email field", () => {
      render(<AuthForm />);
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute("required");
    });

    it("should require password field", () => {
      render(<AuthForm />);
      const passwordInput = screen.getByLabelText("Password");
      expect(passwordInput).toHaveAttribute("required");
    });

    it("should have minLength on password", () => {
      render(<AuthForm />);
      const passwordInput = screen.getByLabelText("Password");
      expect(passwordInput).toHaveAttribute("minLength", "8");
    });
  });

  describe("Error Handling", () => {
    it("should display auth errors from Supabase", async () => {
      setMockAuthError(new Error("Email not confirmed"));
      const user = userEvent.setup();
      render(<AuthForm />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "Password123");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() => {
        expect(screen.getByText(/email not confirmed/i)).toBeInTheDocument();
      });
    });

    it("should clear error when switching modes", async () => {
      setMockAuthError(new Error("Some error"));
      const user = userEvent.setup();
      render(<AuthForm />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "wrong");
      await user.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() => {
        expect(screen.getByText(/some error/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/need an account\? sign up/i));

      expect(screen.queryByText(/some error/i)).not.toBeInTheDocument();
    });
  });
});
