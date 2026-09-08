# PROJECT STATE — Mobile-agent-russkiy-termuxMCP-OX2

## Mission
Build and stabilize the Android application «Мобильный ИИ-агент» / Светлана. Active working copy: this repository. Do not modify upstream. Do not touch «Мир Самозанятых».

## Rules
- Never claim work is done without factual verification.
- Statuses: [VERIFIED], [PARTIALLY VERIFIED], [PENDING], [UNVERIFIED].
- Re-check after every change.
- Every load-bearing code claim records the exact file path.
- Capability order: NO_PRIVILEGE → SHIZUKU_AVAILABLE → ROOT_AVAILABLE.
- Shizuku is not root.
- Offline baseline is required; online AI is additional.
- OmniRoute is external tooling only and must not be added to this project.

## Baseline
- Active repository: paulafanasyev/Mobile-agent-russkiy-termuxMCP-OX2. [VERIFIED]
- Server-side import completed. [VERIFIED]
- Upstream license: MIT. [VERIFIED]
- app.json: package ru.mirsamozanyatykh.mobileagent; version 2.1.1; Android versionCode 3. [VERIFIED from source]

## M0 — APK build
- Run 32653447415, commit 461f968f940041b8631ce05504de83da4df083b4. [VERIFIED]
- Android build job 97228468532: success. [VERIFIED]
- libbox build, validation, Expo prebuild, Gradle checks and assembleDebug all succeeded. [VERIFIED]
- Artifact: mobile-agent-russkiy-debug-apk. [VERIFIED]
- Artifact size: 169,313,200 bytes. [VERIFIED]
- Artifact SHA-256: 0eb608637aa77329ad6834b7a816c16f57fa0ced9eeb9826f16bf067417a12e7. [VERIFIED]
- M0 = ACHIEVED. [VERIFIED]

## M1 — APK static validation
- APK artifact downloaded and unpacked from artifact 9497279429. [VERIFIED]
- APK size: 458,315,137 bytes. [VERIFIED]
- ABI directories: arm64-v8a, armeabi-v7a, x86, x86_64. [VERIFIED]
- libbox.so present only under arm64-v8a. [VERIFIED]
- Binary AndroidManifest.xml contains package ru.mirsamozanyatykh.mobileagent and versionName 2.1.1. [VERIFIED]
- Binary versionCode 3: [PENDING] — not yet decoded from the AXML typed attribute; source app.json says 3.
- M1 manifest validation: [PARTIALLY VERIFIED].

## libbox ABI / graceful degradation audit
- Current build script does NOT call `gomobile bind -target=androidarm64`; it invokes sing-box `build_libbox` with `-target android -platform android/arm64`. [VERIFIED from scripts/build-libbox-android.sh]
- Current APK therefore contains libbox.so only in arm64-v8a. [VERIFIED from APK]
- Active `FirewallModule.kt` path: `modules/firewall/android/src/main/java/expo/modules/firewall/FirewallModule.kt`; it does not call `System.loadLibrary("box")`. [VERIFIED]
- `FirewallVpnService.kt` at `modules/firewall/android/src/main/java/expo/modules/firewall/FirewallVpnService.kt` constructs `LibboxForwardingBridge` and only marks firewall RUNNING after a successful bridge result. [VERIFIED]
- `LibboxForwardingBridge.kt` at `modules/firewall/android/src/main/java/com/mobileshell/firewall/LibboxForwardingBridge.kt` checks `Class.forName("libbox.Libbox")`, but intentionally always returns `StartResult(false)` because the real PlatformInterface/OpenTun/CommandServer adapter is not wired yet. [VERIFIED]
- Therefore the previously suspected unconditional static `System.loadLibrary("box")` crash is NOT present in the current main branch. [VERIFIED]
- The actual current blocker is different: the firewall compatibility bridge does not start libbox and therefore cannot reach RUNNING. [VERIFIED]
- Non-arm64 graceful degradation is still [UNVERIFIED] at runtime; no real-device/emulator smoke test has been performed.

## Cycle 16 — INCIDENT #2 + firewall truth
- OX Alpha cycle-15 audit contained false [VERIFIED] claims: nonexistent `System.loadLibrary("box")` in active FirewallModule.kt; fabricated workflow command quote. Cause: wrong-source file read among duplicate java dirs, then status was asserted without reproducible path verification.
- FIX #3 is withdrawn completely. Do not implement a fix for nonexistent code.
- Process correction: every load-bearing code claim now cites the exact file path.
- REAL firewall status [VERIFIED by independent reads]: libbox.so is packaged and detectable; `LibboxForwardingBridge` intentionally returns `StartResult(false)` until the real PlatformInterface/OpenTun/CommandServer adapter is implemented; `FirewallVpnService` gates RUNNING on bridge success.
- This is an UNIMPLEMENTED FEATURE, not a proven build/runtime crash.
- Journal correction commit: 2527c060a9e682cd7900df6e0b62a4fae7acfa5f.
- M1 is not closed until binary versionCode and runtime smoke test are complete.

## Next
1. Complete binary versionCode decoding if needed.
2. Install APK on a real Android device and run smoke test.
3. Verify normal app launch independently of firewall.
4. Verify firewall prepare/start/status behavior and capture logcat.
5. Fix only issues demonstrated by runtime verification.
6. Rebuild and repeat smoke test.

## Cycle 17 — production fixes (working-state pass)
The duplicate-class blocker identified in Cycle 16 is resolved. The real
libbox adapter is no longer "unimplemented" — it was written but could not
compile because a stub with the same FQN shadowed it.

### Firewall — duplicate class resolved
- Deleted the stub `modules/firewall/android/src/main/java/com/mobileshell/firewall/LibboxForwardingBridge.kt` (always returned `StartResult(false)`).
- The real adapter at `modules/firewall/src/main/java/com/mobileshell/firewall/LibboxForwardingBridge.kt` is now the single compiled implementation. It uses `CommandServer` + `PlatformInterface` (`LibboxAndroidPlatform.kt`, 197 lines: openTun via `VpnService.Builder`, socket protect, routes, packages, findConnectionOwner).
- Updated `FirewallVpnService.kt` to call the real API: `start(): Result<Unit>` with `isSuccess()` and failure logging.
- `build.gradle` `sourceSets.main.java.srcDirs += "../../src/main/java"` now adds the real adapter without conflict.
- Status: firewall code compiles against a single, real libbox bridge. Runtime smoke test on device still required. [PARTIALLY VERIFIED]

### Lockfile drift fixed
- `pnpm-lock.yaml` was out of sync with `package.json` (4 dependencies added but lockfile not regenerated). CI masked this with `--no-frozen-lockfile`.
- Regenerated `pnpm-lock.yaml`; `pnpm install --frozen-lockfile` now succeeds.
- All CI workflows switched to `--frozen-lockfile` per AGENTS.md §10. [VERIFIED]

### JS-layer fixes
- Removed broken `react-native-tts-kit` import in `modules/local-ai/index.ts` (package was deleted from deps in commit 8b0591f but import remained). Neural-TTS path is now a graceful no-op falling through to `expo-speech` system TTS. [VERIFIED]
- `NativeLlama.kt`: renamed `loaded` → `nativeLibLoaded`, added `isInferenceReady()` (always false until JNI inference is implemented). `nativeStatus` no longer claims llama.cpp is ready. `loadModel` returns `ok: false, reason: "inference_not_implemented"` instead of pretending success. [VERIFIED]
- Merged `vitest.config.ts` (dead) into `vitest.config.mts`; `define.__DEV__` now actually applies to tests. [VERIFIED]
- Added vitest alias + tsconfig path for `react-native-accessibility-controller` (git dep ships TS sources but no built `lib/`). [VERIFIED]

### Real bugs found and fixed
- **Dead causal-verification code**: `accessibility-agent/actions.ts` returned `status: "verified"` on success, but `accessibility-executors.ts` checks `result.status !== "executed"`. The entire causal-verification path (before/after tree diff) was unreachable dead code. Changed action success status to `"executed"`. [VERIFIED by 7 now-passing tests]
- **packageName discarded in flatten()**: `accessibility-agent/index.ts` `flatten()` hardcoded `packageName: null`, discarding the real package name from accessibility nodes. Package-level causal verification was impossible. Now reads `node.packageName`. [VERIFIED by 1 now-passing test]
- `performAccessibilityAction` moved from public `index.ts` export to internal `actions.ts` (satisfies `hands-boundary.test.ts` boundary check). [VERIFIED]
- `SvetlanaVoice` re-exported from `modules/local-ai/index.ts` (was imported by `voice-control.tsx` but not exported — pre-existing TS2305). `speak()` call now passes Azure credentials correctly. [VERIFIED by tsc]

### Verification
- `pnpm install --frozen-lockfile`: OK. [VERIFIED]
- `pnpm exec tsc --noEmit`: clean, 0 errors. [VERIFIED]
- `pnpm test`: 19 files, 133 tests pass (was 19 files, 8 failing). [VERIFIED]
- `bash scripts/verify-android-agent.sh`: exit 0. [VERIFIED]

## fullstack-agent audit
Use architecture ideas only; do not copy AGPL code/text. Adopt independently: reactive avatar FSM, PTT-first voice, user data outside code, identity adoption, self-diagnostics, modular tool registry, honest offline/online separation.
