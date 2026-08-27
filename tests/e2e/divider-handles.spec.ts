import { expect, test, type Locator, type Page } from "@playwright/test";

interface HandleGeometry {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

const route = "/book/1-requirements-frs-nfrs-constraints-and-assumptions";

async function geometry(locator: Locator): Promise<HandleGeometry> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Divider handle is not visible");
  return { x: box.x, y: box.y, width: box.width, height: box.height };
}

async function expectAnchored(
  handle: Locator,
  baseline: HandleGeometry,
) {
  const { handleBox, dividerX } = await handle.evaluate((element) => {
    const divider = element.closest(".panel-resize-anchor");
    if (!divider) throw new Error("Divider anchor is missing");
    const handleRect = element.getBoundingClientRect();
    return {
      dividerX: divider.getBoundingClientRect().x,
      handleBox: { x: handleRect.x, y: handleRect.y, width: handleRect.width, height: handleRect.height },
    };
  });
  expect(handleBox).toEqual({
    x: dividerX - baseline.width / 2,
    y: baseline.y,
    width: baseline.width,
    height: baseline.height,
  });
}

async function expectSharedLevel(menu: Locator, chat: Locator) {
  const [menuBox, chatBox] = await Promise.all([geometry(menu), geometry(chat)]);
  expect({ y: menuBox.y, width: menuBox.width, height: menuBox.height }).toEqual({
    y: chatBox.y,
    width: chatBox.width,
    height: chatBox.height,
  });
}

async function expectAnchoredDuringMotion(
  page: Page,
  handle: Locator,
  baseline: HandleGeometry,
) {
  for (let frame = 0; frame < 15; frame += 1) {
    await page.waitForTimeout(16);
    await expectAnchored(handle, baseline);
  }
}

async function collapseWithPointer(page: Page, handle: Locator, baseline: HandleGeometry) {
  const box = await geometry(handle);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expectAnchored(handle, baseline);
  await page.mouse.up();
  await expect(handle).toHaveAttribute("aria-expanded", "false");
  await expectAnchoredDuringMotion(page, handle, baseline);
}

async function focusAppearance(handle: Locator) {
  return handle.evaluate((element) => {
    const style = getComputedStyle(element, "::before");
    return { borderColor: style.borderColor, boxShadow: style.boxShadow };
  });
}

async function motionStyle(handle: Locator) {
  return handle.evaluate((element) => {
    const style = getComputedStyle(element);
    return { transform: style.transform, transition: style.transition };
  });
}

async function expectDragStability(
  page: Page,
  handle: Locator,
  distance: number,
  baseline: HandleGeometry,
) {
  const start = await geometry(handle);
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await expectAnchored(handle, baseline);
  await page.mouse.move(start.x + start.width / 2 + distance, start.y + start.height / 2, { steps: 5 });
  await expect(handle).toHaveAttribute("data-resizing", "true");
  const dragging = await geometry(handle);
  await expectAnchored(handle, baseline);
  await page.mouse.up();
  await expect(handle).not.toHaveAttribute("data-resizing", "true");
  expect(await geometry(handle)).toEqual(dragging);
  await expectAnchored(handle, baseline);
}

test("menu and chat divider handles keep exact geometry through every interaction state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);

  const menuHandle = page.locator(".panel-resize-handle-left");
  const chatHandle = page.locator(".panel-resize-handle-right");
  const menuBaseline = await geometry(menuHandle);
  const chatBaseline = await geometry(chatHandle);

  expect(menuBaseline).toEqual({ x: menuBaseline.x, y: 426, width: 44, height: 48 });
  expect(chatBaseline).toEqual({ x: chatBaseline.x, y: 426, width: 44, height: 48 });
  expect(await motionStyle(menuHandle)).toEqual({ transform: "none", transition: "none" });
  expect(await motionStyle(chatHandle)).toEqual({ transform: "none", transition: "none" });
  await expectSharedLevel(menuHandle, chatHandle);
  await expectAnchored(menuHandle, menuBaseline);
  await expectAnchored(chatHandle, chatBaseline);

  await menuHandle.focus();
  await expectAnchored(menuHandle, menuBaseline);
  await page.waitForTimeout(180);
  const menuFocus = await focusAppearance(menuHandle);
  expect(menuFocus.boxShadow).toContain("inset");
  await chatHandle.focus();
  await expectAnchored(chatHandle, chatBaseline);
  await page.waitForTimeout(180);
  const chatFocus = await focusAppearance(chatHandle);
  expect(chatFocus).toEqual(menuFocus);

  await collapseWithPointer(page, menuHandle, menuBaseline);
  await menuHandle.click();
  await expect(menuHandle).toHaveAttribute("aria-expanded", "true");
  await expectAnchoredDuringMotion(page, menuHandle, menuBaseline);

  await collapseWithPointer(page, chatHandle, chatBaseline);
  await chatHandle.click();
  await expect(chatHandle).toHaveAttribute("aria-expanded", "true");
  await expectAnchoredDuringMotion(page, chatHandle, chatBaseline);

  await expectDragStability(page, menuHandle, 32, menuBaseline);
  await expectSharedLevel(menuHandle, chatHandle);
  await expectDragStability(page, chatHandle, -32, chatBaseline);
  await expectSharedLevel(menuHandle, chatHandle);
});
