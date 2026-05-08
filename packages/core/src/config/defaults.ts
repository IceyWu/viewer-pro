import type { ToolbarAction } from "../types";
import type { TransformConfig } from "../engine/TransformEngine";

export const DEFAULT_ZOOM_STEP = 0.2;
export const DEFAULT_ZOOM_MIN = 0.5;
export const DEFAULT_ZOOM_MAX = 3;
export const DEFAULT_ZOOM_WHEEL_BASE_STEP = 0.15;
export const DEFAULT_ZOOM_WHEEL_MAX_STEP = 0.3;
export const DEFAULT_ZOOM_WHEEL_SPEED_MULTIPLIER = 0.01;

export const DEFAULT_ZOOM_CONFIG: TransformConfig = {
  min: DEFAULT_ZOOM_MIN,
  max: DEFAULT_ZOOM_MAX,
  step: DEFAULT_ZOOM_STEP,
  wheelBaseStep: DEFAULT_ZOOM_WHEEL_BASE_STEP,
  wheelMaxStep: DEFAULT_ZOOM_WHEEL_MAX_STEP,
  wheelSpeedMultiplier: DEFAULT_ZOOM_WHEEL_SPEED_MULTIPLIER,
};

export const DEFAULT_MOBILE_TOOLBAR: ToolbarAction[] = [
  "rotateLeft",
  "rotateRight",
  "thumbnails",
  "info",
];

export const DEFAULT_PRELOAD_CACHE_LIMIT = 100;
