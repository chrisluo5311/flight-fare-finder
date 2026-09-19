import { expect, test } from "@playwright/test";

test.describe("SPA routing", () => {
  test("a deep link to a protected route bounces an anonymous visitor to /auth", async ({
    page,
  }) => {
    // Also covers the vercel.json rewrite: /app has no file on disk, so the
    // static host must serve index.html for React Router to resolve it.
    await page.goto("/app");

    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("an unknown deep link renders the 404 page, not a host error", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go home" })).toBeVisible();
  });
});
