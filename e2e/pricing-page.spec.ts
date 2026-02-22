import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

test("generate pricing page and evaluate styling originality", async ({
  page,
}) => {
  // Navigate to the app
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Type the prompt to generate a pricing page
  const textarea = page.getByPlaceholder(
    "Describe the React component you want to create..."
  );
  await expect(textarea).toBeVisible({ timeout: 10_000 });
  await textarea.fill(
    "Create a visually stunning pricing page with 3 tiers: Starter, Pro, and Enterprise. Make it creative and avoid the typical AI/Tailwind look."
  );

  // Submit
  await page.locator("form").locator("button[type=submit]").click();

  // Wait for the AI to finish generating — the preview iframe should appear
  // and contain meaningful content. We wait for the stream to finish by
  // watching for the textarea to become enabled again (not disabled).
  await expect(textarea).toBeEnabled({ timeout: 120_000 });

  // Give the preview a moment to render after the last file update
  await page.waitForTimeout(3_000);

  // Locate the preview iframe
  const iframe = page.frameLocator('iframe[title="Preview"]');

  // Wait for some content inside the preview
  await expect(iframe.locator("body")).not.toBeEmpty({ timeout: 15_000 });

  // Screenshot the full page (includes chat + preview)
  const screenshotsDir = path.join(__dirname, "..", "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const fullPagePath = path.join(screenshotsDir, "pricing-page-full.png");
  await page.screenshot({ path: fullPagePath, fullPage: false });
  console.log(`Full page screenshot saved to: ${fullPagePath}`);

  // Screenshot just the preview panel
  const previewIframe = page.locator('iframe[title="Preview"]');
  if (await previewIframe.isVisible()) {
    const previewPath = path.join(screenshotsDir, "pricing-page-preview.png");
    await previewIframe.screenshot({ path: previewPath });
    console.log(`Preview screenshot saved to: ${previewPath}`);
  }

  // --- Evaluate styling originality ---
  // Extract computed styles and content from the preview iframe to check
  // whether the generation prompt steers away from generic AI patterns.

  // Get the actual Frame object from the iframe element
  const iframeEl = await page.locator('iframe[title="Preview"]').elementHandle();
  const frame = await iframeEl!.contentFrame();

  const evaluation = await frame!.evaluate(() => {
    const body = document.body;
    const allElements = Array.from(body.querySelectorAll("*"));

    // Check 1: Are there blue-500/600/700 dominant buttons?
    const buttons = Array.from(body.querySelectorAll("button, a[class]"));
    const blueButtonCount = buttons.filter((btn) => {
      const classes = btn.className || "";
      return /bg-blue-(500|600|700)/.test(classes);
    }).length;

    // Check 2: Is the background the generic gray?
    const bodyClasses = body.className || "";
    const outerDiv = body.querySelector(":scope > div");
    const outerClasses = outerDiv?.className || "";
    const genericGrayBg =
      /bg-(gray|slate)-(50|100|200)/.test(bodyClasses) ||
      /bg-(gray|slate)-(50|100|200)/.test(outerClasses);

    // Check 3: Look for creative color usage
    const classStr = allElements.map((el) => el.className || "").join(" ");
    const creativeColors = [
      "teal",
      "amber",
      "violet",
      "emerald",
      "rose",
      "indigo",
      "coral",
      "fuchsia",
      "cyan",
      "orange",
      "lime",
      "purple",
      "pink",
      "stone",
      "zinc",
    ];
    const usedCreativeColors = creativeColors.filter((c) =>
      classStr.includes(c)
    );

    // Check 4: Typography variety
    const hasLargeText =
      /text-(5xl|6xl|7xl|8xl|9xl)/.test(classStr) ||
      /text-(4xl|3xl)/.test(classStr);
    const hasTrackingVariety =
      /tracking-(tight|wide|wider|widest)/.test(classStr);
    const hasFontWeightVariety =
      /font-(light|thin|black|extrabold)/.test(classStr);

    // Check 5: Gradient or texture usage
    const hasGradients = /bg-gradient|from-|to-/.test(classStr);
    const hasLayeredShadows =
      /shadow-(lg|xl|2xl|inner)/.test(classStr) || /ring-/.test(classStr);
    const hasBackdropEffects = /backdrop-blur/.test(classStr);

    // Check 6: hover:scale-105 (anti-pattern)
    const hasScaleHover = /hover:scale-105/.test(classStr);

    return {
      blueButtonCount,
      genericGrayBg,
      usedCreativeColors,
      hasLargeText,
      hasTrackingVariety,
      hasFontWeightVariety,
      hasGradients,
      hasLayeredShadows,
      hasBackdropEffects,
      hasScaleHover,
      totalElements: allElements.length,
    };
  });

  console.log("\n========== STYLING ORIGINALITY EVALUATION ==========");
  console.log(JSON.stringify(evaluation, null, 2));

  // Score the originality
  let score = 0;
  const maxScore = 10;
  const details: string[] = [];

  // Penalize generic blue buttons
  if (evaluation.blueButtonCount === 0) {
    score += 2;
    details.push("PASS: No generic blue-500/600/700 buttons");
  } else {
    details.push(
      `FAIL: Found ${evaluation.blueButtonCount} generic blue buttons`
    );
  }

  // Penalize generic gray background
  if (!evaluation.genericGrayBg) {
    score += 1;
    details.push("PASS: No generic gray/slate background");
  } else {
    details.push("FAIL: Uses generic gray/slate background");
  }

  // Reward creative colors
  if (evaluation.usedCreativeColors.length >= 2) {
    score += 2;
    details.push(
      `PASS: Uses creative colors: ${evaluation.usedCreativeColors.join(", ")}`
    );
  } else {
    details.push(
      `PARTIAL: Only ${evaluation.usedCreativeColors.length} creative color(s) found`
    );
    score += evaluation.usedCreativeColors.length > 0 ? 1 : 0;
  }

  // Reward typography variety
  if (evaluation.hasLargeText) {
    score += 1;
    details.push("PASS: Uses varied type scale");
  } else {
    details.push("FAIL: No large/display text found");
  }
  if (evaluation.hasFontWeightVariety) {
    score += 1;
    details.push("PASS: Uses varied font weights");
  } else {
    details.push("PARTIAL: Limited font weight variety");
  }

  // Reward visual depth
  if (evaluation.hasGradients) {
    score += 1;
    details.push("PASS: Uses gradients");
  } else {
    details.push("FAIL: No gradients found");
  }
  if (evaluation.hasLayeredShadows || evaluation.hasBackdropEffects) {
    score += 1;
    details.push("PASS: Uses layered shadows or backdrop effects");
  } else {
    details.push("FAIL: No depth/texture effects");
  }

  // Penalize hover:scale-105
  if (!evaluation.hasScaleHover) {
    score += 1;
    details.push("PASS: Avoids hover:scale-105 anti-pattern");
  } else {
    details.push("FAIL: Uses hover:scale-105 (AI cliché)");
  }

  console.log("\n---------- SCORECARD ----------");
  details.forEach((d) => console.log(`  ${d}`));
  console.log(`\n  ORIGINALITY SCORE: ${score}/${maxScore}`);

  if (score >= 7) {
    console.log(
      "  VERDICT: The updated prompt produces original, distinctive styling"
    );
  } else if (score >= 4) {
    console.log(
      "  VERDICT: Mixed results — some originality but room for improvement"
    );
  } else {
    console.log(
      "  VERDICT: Styling still feels generic — prompt needs more work"
    );
  }
  console.log("================================================\n");

  // We don't hard-fail the test, but assert the page at least rendered
  expect(evaluation.totalElements).toBeGreaterThan(5);
});
