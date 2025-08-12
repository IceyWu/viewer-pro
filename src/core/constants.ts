import type { WebGLViewerOptions } from './types';

// 默认配置
export const DEFAULT_CONFIG: Required<WebGLViewerOptions> = {
  initialScale: 1,
  minScale: 0.1,
  maxScale: 10,
  smooth: true,
  limitToBounds: true,
} as const;

// 动画配置
export const ANIMATION_DURATION = 300;
export const ZOOM_FACTOR = 1.2;

// 默认 Canvas 尺寸
export const DEFAULT_CANVAS_SIZE = { 
  width: 800, 
  height: 600 
} as const;

// WebGL 相关常量
export const WEBGL_CONSTANTS = {
  CONTEXT_LOST_EVENT: 'webglcontextlost',
  CONTEXT_RESTORED_EVENT: 'webglcontextrestored',
  MAX_TEXTURE_SIZE: 4096,
  DEVICE_PIXEL_RATIO_THRESHOLD: 3,
} as const;

// 性能优化常量
export const PERFORMANCE_CONFIG = {
  DEBOUNCE_RESIZE_MS: 16,
  CANVAS_SIZE_CACHE_TTL: 1000,
  MAX_RENDER_FPS: 60,
} as const;

// WebGL 着色器源码
export const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  uniform mat3 u_matrix;
  varying vec2 v_texCoord;
  
  void main() {
    vec3 position = u_matrix * vec3(a_position, 1.0);
    gl_Position = vec4(position.xy, 0, 1);
    v_texCoord = a_texCoord;
  }
`;

export const FRAGMENT_SHADER_SOURCE = `
  precision mediump float;
  uniform sampler2D u_image;
  varying vec2 v_texCoord;
  
  void main() {
    gl_FragColor = texture2D(u_image, v_texCoord);
  }
`;

// 几何数据
export const GEOMETRY_DATA = {
  // 位置: 从左下角开始，逆时针方向
  positions: new Float32Array([
    -1, -1,  // 左下
     1, -1,  // 右下
    -1,  1,  // 左上
    -1,  1,  // 左上
     1, -1,  // 右下
     1,  1   // 右上
  ]),
  
  // 纹理坐标: 对应于图片坐标系（左上角为原点）
  texCoords: new Float32Array([
     0, 1,  // 左下 -> 图片左下
     1, 1,  // 右下 -> 图片右下
     0, 0,  // 左上 -> 图片左上
     0, 0,  // 左上 -> 图片左上
     1, 1,  // 右下 -> 图片右下
     1, 0   // 右上 -> 图片右上
  ])
} as const;
