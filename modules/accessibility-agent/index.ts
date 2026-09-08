import {
  getAccessibilityTree as beddaGetAccessibilityTree,
  findNode,
  waitForNode,
  onAccessibilityEvent,
  onWindowChange,
  isServiceEnabled,
  requestServiceEnable,
} from "react-native-accessibility-controller";

export const HANDS_MAX_TREE_NODES = 200;
export const HANDS_MAX_TEXT_LENGTH = 4096;

export type AccessibilityNode = {
  id: string;
  text: string | null;
  contentDescription: string | null;
  className: string | null;
  packageName: string | null;
  clickable: boolean;
  scrollable: boolean;
  editable: boolean;
  focused: boolean;
  checked: boolean;
  enabled: boolean;
  bounds: { left: number; top: number; right: number; bottom: number };
};

function flatten(nodes: any[], out: AccessibilityNode[] = []): AccessibilityNode[] {
  for (const node of nodes) {
    out.push({
      id: node.nodeId,
      text: typeof node.text === "string" ? node.text.slice(0, HANDS_MAX_TEXT_LENGTH) : null,
      contentDescription:
        typeof node.contentDescription === "string"
          ? node.contentDescription.slice(0, HANDS_MAX_TEXT_LENGTH)
          : null,
      className: node.className ?? null,
      packageName: typeof node.packageName === "string" ? node.packageName : null,
      clickable: node.isClickable === true,
      scrollable: node.isScrollable === true,
      editable: node.isEditable === true,
      focused: node.isFocused === true,
      checked: node.isChecked === true,
      enabled: node.isEnabled !== false,
      bounds: node.bounds ?? { left: 0, top: 0, right: 0, bottom: 0 },
    });
    if (Array.isArray(node.children)) flatten(node.children, out);
    if (out.length >= HANDS_MAX_TREE_NODES) break;
  }
  return out.slice(0, HANDS_MAX_TREE_NODES);
}

export async function isAccessibilityEnabled(): Promise<boolean> {
  return isServiceEnabled();
}

export async function getAccessibilityTree(maxNodes = HANDS_MAX_TREE_NODES): Promise<AccessibilityNode[]> {
  const tree = await beddaGetAccessibilityTree();
  return flatten(tree).slice(0, Math.max(1, Math.min(maxNodes, HANDS_MAX_TREE_NODES)));
}

export async function findAccessibilityNode(query: {
  text?: string;
  contentDescription?: string;
  className?: string;
  isChecked?: boolean;
  isEnabled?: boolean;
}): Promise<AccessibilityNode | null> {
  const node = await findNode(query);
  return node ? flatten([node])[0] ?? null : null;
}

export async function waitForAccessibilityNode(
  query: {
    text?: string;
    contentDescription?: string;
    className?: string;
    isChecked?: boolean;
    isEnabled?: boolean;
  },
  timeoutMs = 10000,
): Promise<AccessibilityNode> {
  const node = await waitForNode(query, { timeoutMs, pollIntervalMs: 250 });
  return flatten([node])[0];
}

export function subscribeToAccessibilityEvents(callback: (event: unknown) => void) {
  return onAccessibilityEvent(callback as never);
}

export function subscribeToWindowChanges(callback: (window: unknown) => void) {
  return onWindowChange(callback as never);
}

export async function openAccessibilitySettings(): Promise<boolean> {
  await requestServiceEnable();
  return true;
}
