package expo.modules.localai

/**
 * Small JNI boundary. The native library is optional so the APK can still
 * start on devices where no compatible llama.cpp ABI is bundled.
 *
 * NOTE: the bundled `mobile_agent_llama` C++ runtime currently only exposes
 * `JNI_OnLoad` — real model loading and inference are NOT implemented yet.
 * Per AGENTS.md rule #13 we do not report inference as ready. When a real
 * llama.cpp inference path is wired here, flip [inferenceReady] to true and
 * implement the native `loadModel`/`predict` JNI entry points.
 */
internal object NativeLlama {
  /** True only when the `.so` could be linked — does NOT mean a model is loaded. */
  private var nativeLibLoaded = false
  private var modelPath: String? = null

  init {
    try {
      System.loadLibrary("mobile_agent_llama")
      nativeLibLoaded = true
    } catch (_: UnsatisfiedLinkError) {
      nativeLibLoaded = false
    }
  }

  /** Whether the native shared library was linked into the process. */
  fun isNativeLibLoaded(): Boolean = nativeLibLoaded

  /**
   * Whether real model inference is available. Always false until the native
   * `loadModel`/`predict` JNI functions are implemented in
   * `mobile_agent_llama.cpp`.
   */
  fun isInferenceReady(): Boolean = false

  fun statusMessage(): String = when {
    !nativeLibLoaded ->
      "Нативный llama.cpp runtime пока не установлен для ABI устройства."
    nativeLibLoaded && !isInferenceReady() ->
      "Нативная библиотека llama.cpp загружена, но инференс моделей не реализован."
    else ->
      "Нативный llama.cpp runtime подключён и готов к инференсу."
  }

  fun load(path: String): Map<String, Any?> {
    require(path.isNotBlank()) { "Путь к модели не может быть пустым." }
    if (!nativeLibLoaded) {
      return mapOf("ok" to false, "reason" to "native_runtime_unavailable")
    }
    if (!isInferenceReady()) {
      // Honest refusal: do not pretend a model is loaded when no inference
      // path exists. Record the requested path for diagnostics only.
      modelPath = path
      return mapOf(
        "ok" to false,
        "reason" to "inference_not_implemented",
        "path" to path,
      )
    }
    modelPath = path
    return mapOf("ok" to true, "path" to path)
  }

  fun unload() {
    modelPath = null
  }
}
