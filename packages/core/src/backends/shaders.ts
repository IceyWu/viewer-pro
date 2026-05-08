/**
 * WebGL shaders for the single-texture image backend.
 *
 * Vertex shader receives quad corners in NATURAL image pixels centered at the
 * origin (-w/2 .. +w/2, -h/2 .. +h/2) and applies a 3x3 affine matrix that
 * encodes:
 *   - fit-to-canvas scale     (image natural size -> screen "fit" size)
 *   - user scale (zoom)
 *   - user rotation
 *   - user translation (CSS pixels)
 *   - canvas->clip-space      (with Y flipped so CSS Y-down matches WebGL Y-up)
 *
 * Fragment shader: straight texture sample. Filtering / pixelation behavior
 * is set on the texture itself (LINEAR vs NEAREST) when uploaded.
 */

export const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  uniform mat3 u_matrix;
  varying vec2 v_texcoord;
  void main() {
    vec3 p = u_matrix * vec3(a_position, 1.0);
    gl_Position = vec4(p.xy, 0.0, 1.0);
    v_texcoord = a_texcoord;
  }
`;

export const FRAGMENT_SHADER = `
  precision mediump float;
  uniform sampler2D u_texture;
  varying vec2 v_texcoord;
  void main() {
    gl_FragColor = texture2D(u_texture, v_texcoord);
  }
`;

/**
 * Compile a single shader. Returns the shader on success or throws with the
 * driver-provided info log on failure.
 */
export function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("WebGL: createShader returned null");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`WebGL shader compile failed: ${info ?? "(no log)"}`);
  }
  return shader;
}

/**
 * Compile + link the standard image-display program. Returns the program on
 * success or throws.
 */
export function createImageProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    throw new Error("WebGL: createProgram returned null");
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  // Shaders can be detached + deleted after link; the program holds them.
  gl.detachShader(program, vs);
  gl.detachShader(program, fs);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`WebGL program link failed: ${info ?? "(no log)"}`);
  }
  return program;
}
