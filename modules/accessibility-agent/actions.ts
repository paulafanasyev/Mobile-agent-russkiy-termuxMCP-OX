/**
 * Internal accessibility action executor.
 *
 * Kept out of `index.ts` on purpose: the native UI action surface must remain
 * behind the tool bridge (`src/tools`) rather than be a public export of the
 * accessibility-agent module boundary. See `hands-boundary.test.ts`.
 */
import {
  tapNode,
  longPressNode,
  setNodeText,
  scrollNode,
  tap,
  longPress,
  swipe,
  globalAction,
  openApp,
} from "react-native-accessibility-controller";
import { HANDS_MAX_TEXT_LENGTH } from "./index";

export async function performAccessibilityAction(
  action: any,
): Promise<{ status: string; action: string }> {
  try {
    const type = String(action?.type ?? "unknown");
    let ok = false;
    switch (type) {
      case "back": ok = await globalAction("back"); break;
      case "home": ok = await globalAction("home"); break;
      case "recents": ok = await globalAction("recents"); break;
      case "notifications": ok = await globalAction("notifications"); break;
      case "quick_settings": ok = await globalAction("quickSettings"); break;
      case "power_dialog": ok = await globalAction("powerDialog"); break;
      case "tap": ok = action.nodeId ? await tapNode(action.nodeId) : await tap(action.x, action.y); break;
      case "long_press": ok = action.nodeId ? await longPressNode(action.nodeId) : await longPress(action.x, action.y); break;
      case "swipe": ok = await swipe(action.x, action.y, action.x2, action.y2, action.durationMs ?? 300); break;
      case "type": ok = await setNodeText(action.nodeId, String(action.text ?? "").slice(0, HANDS_MAX_TEXT_LENGTH)); break;
      case "scroll": ok = await scrollNode(action.nodeId, action.direction ?? "down"); break;
      case "open_app": ok = await openApp(action.packageName); break;
      default: return { status: "unsupported", action: type };
    }
    return { status: ok === true ? "executed" : "failed", action: type };
  } catch {
    return { status: "failed", action: String(action?.type ?? "unknown") };
  }
}
