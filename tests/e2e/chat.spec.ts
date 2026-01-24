import { test, expect } from "@playwright/test";

test.describe("TaxBuddy Chat", () => {
  test("should load the home page with welcome message", async ({ page }) => {
    await page.goto("/");

    // Check that the welcome message is visible
    await expect(page.getByText("Hi, I'm TaxBuddy!")).toBeVisible();
  });

  test("should have chat input with placeholder", async ({ page }) => {
    await page.goto("/");

    const input = page.getByPlaceholderText("Ask a tax question...");
    await expect(input).toBeVisible();
  });

  test("should have show steps checkbox", async ({ page }) => {
    await page.goto("/");

    const checkbox = page.getByLabel("Show steps");
    await expect(checkbox).toBeVisible();
    await expect(checkbox).toBeChecked();
  });

  test("should toggle show steps checkbox", async ({ page }) => {
    await page.goto("/");

    const checkbox = page.getByLabel("Show steps");
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();

    await checkbox.check();
    await expect(checkbox).toBeChecked();
  });

  test("should allow typing in chat input", async ({ page }) => {
    await page.goto("/");

    const input = page.getByPlaceholderText("Ask a tax question...");
    await input.fill("What is the RRSP contribution limit?");

    await expect(input).toHaveValue("What is the RRSP contribution limit?");
  });

  test("should have send button", async ({ page }) => {
    await page.goto("/");

    const sendButton = page.getByRole("button", { name: "Send" });
    await expect(sendButton).toBeVisible();
  });

  test("should display TaxBuddy logo", async ({ page }) => {
    await page.goto("/");

    // Check for the logo in the welcome message
    const logo = page.getByAltText("TaxBuddy");
    await expect(logo.first()).toBeVisible();
  });

  test("should show disclaimer in welcome message", async ({ page }) => {
    await page.goto("/");

    // Check for disclaimer text
    await expect(
      page.getByText(/verify all information against official CRA sources/)
    ).toBeVisible();
  });
});
