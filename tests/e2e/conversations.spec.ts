import { test, expect } from "@playwright/test";

test.describe("Conversations", () => {
  test.describe("Sidebar", () => {
    test("should show sidebar strip with menu and new chat buttons", async ({
      page,
    }) => {
      await page.goto("/");

      // Check for sidebar strip buttons
      await expect(
        page.getByRole("button", { name: /open sidebar|close sidebar/i })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /new chat/i }).first()
      ).toBeVisible();
    });

    test("should toggle sidebar visibility", async ({ page }) => {
      await page.goto("/");

      // Click to open sidebar
      await page.getByRole("button", { name: /open sidebar/i }).click();

      // Should show Chat History header
      await expect(page.getByText("Chat History")).toBeVisible();

      // Click to close sidebar
      await page.getByRole("button", { name: /close sidebar/i }).click();

      // Chat History should no longer be visible
      await expect(page.getByText("Chat History")).not.toBeVisible();
    });

    test("should show guest message for unauthenticated users", async ({
      page,
    }) => {
      await page.goto("/");

      // Open sidebar
      await page.getByRole("button", { name: /open sidebar/i }).click();

      // For guests, should show sign in prompt
      await expect(
        page.getByText(/sign in to save your chat history/i)
      ).toBeVisible();
      await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
    });

    test("should link to auth page from guest message", async ({ page }) => {
      await page.goto("/");

      // Open sidebar
      await page.getByRole("button", { name: /open sidebar/i }).click();

      // Click sign in link
      await page.getByRole("link", { name: /sign in/i }).click();

      // Should navigate to auth page
      await expect(page).toHaveURL("/auth");
    });
  });

  test.describe("Chat Interface", () => {
    test("should display welcome message", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByText("Hi, I'm TaxBuddy!")).toBeVisible();
    });

    test("should have chat input", async ({ page }) => {
      await page.goto("/");

      await expect(
        page.getByPlaceholder("Ask a tax question...")
      ).toBeVisible();
    });

    test("should allow typing in chat input", async ({ page }) => {
      await page.goto("/");

      const input = page.getByPlaceholder("Ask a tax question...");
      await input.fill("What is the RRSP contribution limit?");

      await expect(input).toHaveValue("What is the RRSP contribution limit?");
    });

    test("should have send button", async ({ page }) => {
      await page.goto("/");

      await expect(
        page.getByRole("button", { name: /send/i })
      ).toBeVisible();
    });

    test("should have show steps checkbox", async ({ page }) => {
      await page.goto("/");

      await expect(page.getByLabel(/show steps/i)).toBeVisible();
    });
  });

  test.describe("New Conversation", () => {
    test("should start with new chat button in sidebar", async ({ page }) => {
      await page.goto("/");

      // Open sidebar
      await page.getByRole("button", { name: /open sidebar/i }).click();

      // Should have new chat button
      await expect(
        page.getByRole("button", { name: /new chat/i })
      ).toBeVisible();
    });

    test("clicking new chat should show welcome message", async ({ page }) => {
      await page.goto("/");

      // Click new chat from the strip
      await page.getByRole("button", { name: /new chat/i }).first().click();

      // Should still show welcome message
      await expect(page.getByText("Hi, I'm TaxBuddy!")).toBeVisible();
    });
  });

  test.describe("Conversation Persistence (Authenticated)", () => {
    // Note: These tests would require authentication setup
    // In a real scenario, you'd use Playwright fixtures or test users
    test.skip("should show conversations list for authenticated user", async ({
      page,
    }) => {
      // This would require authenticated session
    });

    test.skip("should create new conversation on first message", async ({
      page,
    }) => {
      // This would require authenticated session
    });

    test.skip("should allow deleting conversations", async ({ page }) => {
      // This would require authenticated session
    });

    test.skip("should allow renaming conversations", async ({ page }) => {
      // This would require authenticated session
    });
  });

  test.describe("Responsive Behavior", () => {
    test("sidebar should be collapsed by default on mobile", async ({
      page,
    }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");

      // Chat History should not be visible (sidebar collapsed)
      await expect(page.getByText("Chat History")).not.toBeVisible();
    });

    test("sidebar should be expandable on mobile", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/");

      // Click to open sidebar
      await page.getByRole("button", { name: /open sidebar/i }).click();

      // Should now show Chat History
      await expect(page.getByText("Chat History")).toBeVisible();
    });
  });

  test.describe("Disclaimer", () => {
    test("should show disclaimer in welcome message", async ({ page }) => {
      await page.goto("/");

      await expect(
        page.getByText(/verify all information with official CRA sources/i)
      ).toBeVisible();
    });

    test("should show AI research assistant notice", async ({ page }) => {
      await page.goto("/");

      await expect(
        page.getByText(/AI research assistant/i)
      ).toBeVisible();
    });
  });
});
