import { readFile } from "node:fs/promises";

const checks = [
  ["no cleartext Android traffic", "android/app/src/main/AndroidManifest.xml", /usesCleartextTraffic\s*=\s*['\"]true['\"]/i, true],
  ["no Android VPN application bypass API", "modules/firewall/src/main/java/com/mobileshell/firewall/LibboxAndroidPlatform.kt", /addAllowedApplication|addDisallowedApplication/, true],
  ["no direct final route in firewall", "modules/firewall/android/src/main/java/expo/modules/firewall/FirewallVpnService.kt", /put\(\"final\",\s*\"direct\"\)/, true],
  ["no unsigned OX2 model catalog dependency", "src/modules/on-device/catalog.ts", /Mobile-agent-russkiy-termuxMCP-OX2/, true],
  ["no permissive schedule default in migrations", "src/core/db/migrations.ts", /auto_approve\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+1/, true],
];

let failed = false;
for (const [label, file, pattern, shouldNotMatch] of checks) {
  let text;
  try { text = await readFile(file, "utf8"); }
  catch { console.error(`SECURITY_GATE=ERROR ${label}: missing ${file}`); failed = true; continue; }
  const matched = pattern.test(text);
  const pass = shouldNotMatch ? !matched : matched;
  console.log(`SECURITY_GATE=${pass ? "PASS" : "FAIL"} ${label}`);
  if (!pass) failed = true;
}

if (failed) process.exit(1);
