import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.describe("Auth Page", () => {
    test("should load the auth page", async ({ page }) => {
      await page.goto("/auth");

      // Should show the TaxBuddy logo
      await expect(page.getByAltText("TaxBuddy")).toBeVisible();
    });

    test("should display login form by default", async ({ page }) => {
      await page.goto("/auth");

      // Check for login form elements
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel("Password")).toBeVisible();
      await expect(page.getByRole("button", { name: /log in/i })).toBeVisible();
    });

    test("should show forgot password link", async ({ page }) => {
      await page.goto("/auth");

      await expect(page.getByText(/forgot password/i)).toBeVisible();
    });

    test("should show guest access option", async ({ page }) => {
      await page.goto("/auth");

      await expect(
        page.getByRole("button", { name: /continue as guest/i })
      ).toBeVisible();
      await expect(
        page.getByText(/guest data will not be saved/i)
      ).toBeVisible();
    });
  });

  test.describe("Login Form", () => {
    test("should allow typing in email field", async ({ page }) => {
      await page.goto("/auth");

      const emailInput = page.getByLabel(/email/i);
      await emailInput.fill("test@example.com");

      await expect(emailInput).toHaveValue("test@example.com");
    });

    test("should allow typing in password field", async ({ page }) => {
      await page.goto("/auth");

      const passwordInput = page.getByLabel("Password");
      await passwordInput.fill("mypassword123");

      await expect(passwordInput).toHaveValue("mypassword123");
    });

    test("should toggle password visibility", async ({ page }) => {
      await page.goto("/auth");

      const passwordInput = page.getByLabel("Password");
      await passwordInput.fill("mypassword");

      // Initially password type
      await expect(passwordInput).toHaveAttribute("type", "password");

      // Click the visibility toggle (the button with tabindex -1)
      const toggleButton = page.locator('button[tabindex="-1"]').first();
      await toggleButton.click();

      // Should now be text type
      await expect(passwordInput).toHaveAttribute("type", "text");

      // Click again to hide
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute("type", "password");
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/auth");

      await page.getByLabel(/email/i).fill("wrong@example.com");
      await page.getByLabel("Password").fill("wrongpassword");
      await page.getByRole("button", { name: /log in/i }).click();

      // Should show an error message (wait for it to appear)
      await expect(
        page.getByText(/invalid|error|failed/i).first()
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Signup Form", () => {
    test("should switch to signup mode", async ({ page }) => {
      await page.goto("/auth");

      await page.getByText(/need an account\? sign up/i).click();

      await expect(
        page.getByRole("button", { name: /sign up/i })
      ).toBeVisible();
      await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    });

    test("should show password requirements hint", async ({ page }) => {
      await page.goto("/auth");

      await page.getByText(/need an account\? sign up/i).click();

      await expect(page.getByText(/min 8 characters/i)).toBeVisible();
    });

    test("should switch back to login mode", async ({ page }) => {
      await page.goto("/auth");

      // Go to signup
      await page.getByText(/need an account\? sign up/i).click();
      await expect(
        page.getByRole("button", { name: /sign up/i })
      ).toBeVisible();

      // Go back to login
      await page.getByText(/have an account\? log in/i).click();
      await expect(
        page.getByRole("button", { name: /log in/i })
      ).toBeVisible();
    });

    test("should validate password match", async ({ page }) => {
      await page.goto("/auth");

      await page.getByText(/need an account\? sign up/i).click();

      await page.getByLabel(/email/i).fill("new@example.com");
      await page.getByLabel("Password").fill("Password123");
      await page.getByLabel(/confirm password/i).fill("Different123");
      await page.getByRole("button", { name: /sign up/i }).click();

      await expect(page.getByText(/passwords do not match/i)).toBeVisible();
    });
  });

  test.describe("Forgot Password", () => {
    test("should switch to forgot password mode", async ({ page }) => {
      await page.goto("/auth");

      await page.getByText(/forgot password/i).click();

      await expect(
        page.getByRole("button", { name: /send reset link/i })
      ).toBeVisible();
      // Password field should not be visible
      await expect(page.getByLabel("Password")).not.toBeVisible();
    });

    test("should show back to login link", async ({ page }) => {
      await page.goto("/auth");

      await page.getByText(/forgot password/i).click();

      await expect(page.getByText(/back to login/i)).toBeVisible();
    });

    test("should hide guest access in forgot password mode", async ({ page }) => {
      await page.goto("/auth");

      await page.getByText(/forgot password/i).click();

      await expect(
        page.getByRole("button", { name: /continue as guest/i })
      ).not.toBeVisible();
    });

    test("should navigate back to login", async ({ page }) => {
      await page.goto("/auth");

      await page.getByText(/forgot password/i).click();
      await page.getByText(/back to login/i).click();

      await expect(
        page.getByRole("button", { name: /log in/i })
      ).toBeVisible();
    });
  });

  test.describe("Guest Access", () => {
    test("should redirect to home on guest access", async ({ page }) => {
      await page.goto("/auth");

      await page.getByRole("button", { name: /continue as guest/i }).click();

      // Should redirect to home page
      await expect(page).toHaveURL("/", { timeout: 10000 });
    });

    test("should set guest session in localStorage", async ({ page }) => {
      await page.goto("/auth");

      await page.getByRole("button", { name: /continue as guest/i }).click();

      // Wait for navigation
      await page.waitForURL("/");

      // Check localStorage
      const guestSession = await page.evaluate(() => {
        return localStorage.getItem("taxbuddy_guest");
      });

      expect(guestSession).toBe("true");
    });

    test("should allow chatting as guest after redirect", async ({ page }) => {
      // First set up guest session via auth page
      await page.goto("/auth");
      await page.getByRole("button", { name: /continue as guest/i }).click();

      // Should redirect to home
      await page.waitForURL("/");

      // Should be able to use the chat
      await expect(
        page.getByPlaceholder("Ask a tax question...")
      ).toBeVisible();
    });

    test("guest should not see saved conversations in sidebar", async ({ page }) => {
      // Set up guest session
      await page.goto("/auth");
      await page.getByRole("button", { name: /continue as guest/i }).click();
      await page.waitForURL("/");

      // Open sidebar
      await page.getByRole("button", { name: /open sidebar/i }).click();

      // Should show guest message, not conversations
      await expect(
        page.getByText(/sign in to save your chat history/i)
      ).toBeVisible();
    });
  });
});
