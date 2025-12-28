/**
 * VISION SYSTEM ERROR TYPES
 * Custom error classes for better error handling and debugging
 */

export class VisionError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = "VisionError";
  }
}

export class UITARSUnavailableError extends VisionError {
  constructor() {
    super(
      "UI-TARS service is not available. Please start the UI-TARS Python service on port 8000.",
      "UITARS_UNAVAILABLE"
    );
  }
}

export class GeminiAPIKeyMissingError extends VisionError {
  constructor() {
    super(
      "GEMINI_API_KEY environment variable is not set. Vision analysis requires a Gemini API key.",
      "GEMINI_KEY_MISSING"
    );
  }
}

export class ScreenshotCaptureError extends VisionError {
  constructor(originalError: Error) {
    super(
      `Failed to capture screenshot: ${originalError.message}`,
      "SCREENSHOT_CAPTURE_FAILED",
      { originalError: originalError.message }
    );
  }
}

export class VisionAnalysisError extends VisionError {
  constructor(message: string, public model: string, originalError?: Error) {
    super(
      `Vision analysis failed with ${model}: ${message}`,
      "VISION_ANALYSIS_FAILED",
      { model, originalError: originalError?.message }
    );
  }
}

export class IntentDetectionError extends VisionError {
  constructor(instruction: string) {
    super(
      `Could not detect intent from instruction: ${instruction}`,
      "INTENT_DETECTION_FAILED",
      { instruction }
    );
  }
}

export class ActionExecutionError extends VisionError {
  constructor(action: string, originalError: Error) {
    super(
      `Failed to execute action "${action}": ${originalError.message}`,
      "ACTION_EXECUTION_FAILED",
      { action, originalError: originalError.message }
    );
  }
}
