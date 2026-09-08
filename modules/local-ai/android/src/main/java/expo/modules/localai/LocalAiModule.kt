package expo.modules.localai

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Android bridge for the optional llama.cpp native runtime. */
class LocalAiModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("LocalAi")

    AsyncFunction("nativeStatus") {
      mapOf(
        "backend" to "llama.cpp",
        "nativeLibLoaded" to NativeLlama.isNativeLibLoaded(),
        "inferenceReady" to NativeLlama.isInferenceReady(),
        "message" to NativeLlama.statusMessage(),
      )
    }

    AsyncFunction("loadModel") { modelPath: String ->
      NativeLlama.load(modelPath)
    }

    AsyncFunction("unloadModel") {
      NativeLlama.unload()
    }
  }
}
