import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("renders the hero and the sign-in call to action", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Flight Price Notifier" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Sign in \/ 登入/ }).first()).toBeVisible();
  });

  test("the sign-in CTA leads to the auth page", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Sign in \/ 登入/ })
      .first()
      .click();

    await expect(page).toHaveURL(/\/(auth|sign-in)/);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password|密碼/i)).toBeVisible();
  });

  test("loads without uncaught JavaScript errors", async ({ page }) => {
    // Only application errors count. Third-party beacons (Vercel Analytics) and
    // missing static extras fail to load in a local preview and say nothing
    // about whether the bundle works.
    const isAppError = (text: string) => !/Failed to load resource/i.test(text);
    const errors: string[] = [];

    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && isAppError(message.text())) errors.push(message.text());
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Flight Price Notifier" })).toBeVisible();

    expect(errors).toEqual([]);
  });
});
