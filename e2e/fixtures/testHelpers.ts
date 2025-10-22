/**
 * E2E Test Helpers
 * Reusable helper functions for E2E tests
 */

import { Page, Locator } from '@playwright/test';

/**
 * Helper to add a tool-augmented LLM node to the canvas
 */
export async function addToolAugmentedNode(page: Page): Promise<void> {
  // Open node palette
  await page.click('[data-testid="node-palette-button"], button:has-text("Add Node"), button:has-text("Nodes")');

  // Wait for palette to appear
  await page.waitForSelector('[data-testid="node-palette"], [class*="palette"]', { timeout: 5000 });

  // Click tool-augmented node option
  const toolNodeBtn = page.locator(
    '[data-testid="add-llm-tools-node"], button:has-text("Tool-Augmented"), [class*="tool"]:has-text("LLM")'
  ).first();

  if (await toolNodeBtn.count() > 0) {
    await toolNodeBtn.click();
  } else {
    // Fallback: look for it in the palette
    await page.click('button:has-text("Anthropic"), [class*="card"]:has-text("Tool")');
  }
}

/**
 * Helper to add an agent node to the canvas
 */
export async function addAgentNode(page: Page): Promise<void> {
  // Open node palette
  await page.click('[data-testid="node-palette-button"], button:has-text("Add Node")');

  await page.waitForSelector('[data-testid="node-palette"], [class*="palette"]', { timeout: 5000 });

  // Look for agent node
  const agentBtn = page.locator(
    '[data-testid="add-agent-node"], button:has-text("Agent"), [class*="agent"]'
  ).first();

  if (await agentBtn.count() > 0) {
    await agentBtn.click();
  } else {
    // Fallback
    await page.click('button:has-text("Agent")');
  }
}

/**
 * Helper to enable specific tools in a node
 */
export async function enableTools(page: Page, toolIds: string[]): Promise<void> {
  // Click to open tool selector
  const toolButton = page.locator(
    '[data-testid="select-tools-button"], button:has-text("Tools"), button:has-text("Select")'
  ).first();

  if (await toolButton.count() > 0) {
    await toolButton.click();
  } else {
    // Look for "Add Tool" button
    await page.click('button:has-text("Add Tool")');
  }

  // Wait for modal
  await page.waitForSelector('[data-testid="tool-selector-modal"], [role="dialog"]', { timeout: 5000 });

  // Enable each tool
  for (const toolId of toolIds) {
    const toolToggle = page.locator(
      `[data-testid="tool-card-${toolId}"] [data-testid="tool-toggle"], [class*="tool"][data-tool-id="${toolId}"] input[type="checkbox"]`
    ).first();

    if (await toolToggle.count() > 0) {
      const isChecked = await toolToggle.isChecked();
      if (!isChecked) {
        await toolToggle.click();
      }
    } else {
      // Fallback: click on tool card directly
      await page.click(`[class*="tool-card"]:has-text("${toolId}")`);
    }
  }

  // Close modal
  const closeBtn = page.locator(
    '[data-testid="tool-selector-close"], button:has-text("Close"), [aria-label="Close"]'
  ).first();

  if (await closeBtn.count() > 0) {
    await closeBtn.click();
  } else {
    // Fallback: press Escape
    await page.keyboard.press('Escape');
  }
}

/**
 * Helper to set prompt in a node
 */
export async function setPrompt(page: Page, prompt: string, isSystem: boolean = false): Promise<void> {
  const selector = isSystem
    ? '[data-testid="system-prompt-input"], [placeholder*="System"]'
    : '[data-testid="user-prompt-input"], [placeholder*="User"], [placeholder*="Analyze"]';

  const input = page.locator(selector).first();

  if (await input.count() > 0) {
    await input.fill(prompt);
  } else {
    // Fallback: find textarea
    const textarea = page.locator('textarea').nth(isSystem ? 0 : 1);
    await textarea.fill(prompt);
  }
}

/**
 * Helper to set max steps for agent
 */
export async function setMaxSteps(page: Page, steps: number): Promise<void> {
  const input = page.locator(
    '[data-testid="max-steps-input"], input[placeholder*="Max"], input[placeholder*="Steps"]'
  ).first();

  if (await input.count() > 0) {
    await input.fill(String(steps));
  }
}

/**
 * Helper to execute a node
 */
export async function executeNode(page: Page, isAgent: boolean = false): Promise<void> {
  const btnSelector = isAgent
    ? '[data-testid="execute-agent-button"], button:has-text("Execute Agent"), button:has-text("Start")'
    : '[data-testid="execute-node-button"], button:has-text("Execute"), button:has-text("Run")';

  const btn = page.locator(btnSelector).first();

  if (await btn.count() > 0) {
    await btn.click();
  } else {
    // Fallback: look for any execute button
    await page.click('button:has-text("Execute")');
  }
}

/**
 * Helper to wait for execution to complete
 */
export async function waitForExecutionComplete(
  page: Page,
  timeout: number = 30000
): Promise<void> {
  await page.waitForSelector(
    '[data-testid="execution-complete"], [class*="success"], [class*="completed"]',
    { timeout }
  );
}

/**
 * Helper to create a workflow with multiple nodes
 */
export async function createWorkflow(
  page: Page,
  nodeConfigs: Array<{
    type: 'input' | 'output' | 'llm-tools' | 'agent';
    data?: Record<string, any>;
  }>
): Promise<void> {
  for (const config of nodeConfigs) {
    switch (config.type) {
      case 'input':
        await page.click('button:has-text("Input")');
        break;
      case 'output':
        await page.click('button:has-text("Output")');
        break;
      case 'llm-tools':
        await addToolAugmentedNode(page);
        if (config.data?.enabledTools) {
          await enableTools(page, config.data.enabledTools);
        }
        break;
      case 'agent':
        await addAgentNode(page);
        break;
    }

    // Give UI time to update
    await page.waitForTimeout(300);
  }
}

/**
 * Helper to connect two nodes
 */
export async function connectNodes(
  page: Page,
  fromNodeIndex: number,
  toNodeIndex: number
): Promise<void> {
  // Get node handles
  const nodes = page.locator('[class*="node"]');
  const nodeCount = await nodes.count();

  if (fromNodeIndex < nodeCount && toNodeIndex < nodeCount) {
    // This is a simplified connection - actual implementation depends on React Flow API
    const sourceHandle = page.locator(`[data-testid="handle-source-${fromNodeIndex}"]`).first();
    const targetHandle = page.locator(`[data-testid="handle-target-${toNodeIndex}"]`).first();

    if (await sourceHandle.count() > 0 && await targetHandle.count() > 0) {
      // Drag from source to target
      await sourceHandle.dragTo(targetHandle);
    }
  }
}

/**
 * Helper to get node by ID
 */
export async function getNodeByTestId(page: Page, testId: string): Promise<Locator> {
  return page.locator(`[data-testid="${testId}"], [data-nodeid="${testId}"]`).first();
}

/**
 * Helper to check if node is visible
 */
export async function isNodeVisible(page: Page, testId: string): Promise<boolean> {
  const node = await getNodeByTestId(page, testId);
  return node.isVisible();
}

/**
 * Helper to wait for tool execution log entry
 */
export async function waitForToolExecution(
  page: Page,
  toolId: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForSelector(
    `[data-testid="tool-execution-log"], [class*="log"]:has-text("${toolId}"), text=${toolId}`,
    { timeout }
  );
}

/**
 * Helper to get execution output
 */
export async function getExecutionOutput(page: Page): Promise<string> {
  const output = page.locator(
    '[data-testid="node-output"], [class*="output"], [class*="result"]'
  ).first();

  if (await output.count() > 0) {
    return output.textContent() || '';
  }

  return '';
}

/**
 * Helper to verify error message
 */
export async function verifyErrorMessage(
  page: Page,
  errorPattern: string | RegExp
): Promise<boolean> {
  const errorElement = page.locator(
    '[data-testid="error-message"], [class*="error"], [role="alert"]'
  ).first();

  if (await errorElement.count() > 0) {
    const text = await errorElement.textContent();
    if (typeof errorPattern === 'string') {
      return text?.includes(errorPattern) || false;
    } else {
      return errorPattern.test(text || '') || false;
    }
  }

  return false;
}

/**
 * Helper to screenshot for debugging
 */
export async function takeDebugScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = Date.now();
  const filename = `debug-${name}-${timestamp}.png`;
  await page.screenshot({ path: `./e2e/screenshots/${filename}` });
}

/**
 * Helper to wait for loading to complete
 */
export async function waitForPageLoad(
  page: Page,
  timeout: number = 10000
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {
    // Network may remain busy, that's ok
  });
}

/**
 * Helper to clear canvas
 */
export async function clearCanvas(page: Page): Promise<void> {
  // Select all nodes
  await page.keyboard.press('Control+A');
  // Delete them
  await page.keyboard.press('Delete');
}

/**
 * Helper to check if tool is enabled in node
 */
export async function isToolEnabled(page: Page, toolId: string): Promise<boolean> {
  const toolCard = page.locator(
    `[data-testid="tool-card-${toolId}"], [class*="tool"][data-tool-id="${toolId}"]`
  ).first();

  if (await toolCard.count() > 0) {
    const checkbox = toolCard.locator('input[type="checkbox"]').first();
    return checkbox.isChecked();
  }

  return false;
}

/**
 * Helper to get tool count in node
 */
export async function getEnabledToolCount(page: Page): Promise<number> {
  const badges = page.locator('[data-testid="tool-status-badge"], [class*="badge"]:has-text(" tools")');

  if (await badges.count() > 0) {
    const text = await badges.first().textContent();
    const match = text?.match(/(\d+) tool/);
    return match ? parseInt(match[1]) : 0;
  }

  return 0;
}
