/**
 * 图片加载器模块
 * 处理图片加载、进度跟踪和错误处理
 */

export type ProgressCallback = (loaded: number, total: number) => void;

/**
 * 加载图片元素
 */
export async function loadImageElement(
  url: string,
  progressCallback?: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<HTMLImageElement> {
  // 检查是否已取消
  if (abortSignal?.aborted) {
    throw new Error('Image loading was cancelled');
  }

  // 首先尝试使用 fetch 获取进度信息
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      signal: abortSignal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await loadImageFromResponse(response, progressCallback, abortSignal);
  } catch (error) {
    if (abortSignal?.aborted) {
      throw new Error('Image loading was cancelled');
    }
    console.warn('Fetch failed, trying direct image load:', error);
    // 如果 fetch 失败，尝试直接加载图片
    return loadImageDirectly(url, progressCallback, abortSignal);
  }
}

/**
 * 从 fetch 响应加载图片
 */
async function loadImageFromResponse(
  response: Response,
  progressCallback?: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<HTMLImageElement> {
  const contentLength = response.headers.get('Content-Length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Cannot read response body');
  }

  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      // 检查是否已取消
      if (abortSignal?.aborted) {
        reader.cancel();
        throw new Error('Image loading was cancelled');
      }

      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      loaded += value.length;
      
      // 更新进度
      if (total > 0 && progressCallback && !abortSignal?.aborted) {
        progressCallback(loaded, total);
      }
    }

    // 最终检查是否已取消
    if (abortSignal?.aborted) {
      throw new Error('Image loading was cancelled');
    }

    // 合并所有 chunks
    const allChunks = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, offset);
      offset += chunk.length;
    }

    // 创建 blob 和 object URL
    const blob = new Blob([allChunks]);
    const objectURL = URL.createObjectURL(blob);

    return loadImageFromURL(objectURL, abortSignal, () => {
      URL.revokeObjectURL(objectURL);
    });
  } catch (error) {
    reader.cancel();
    throw error;
  }
}

/**
 * 直接加载图片
 */
function loadImageDirectly(
  url: string,
  progressCallback?: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<HTMLImageElement> {
  // 检查是否已取消
  if (abortSignal?.aborted) {
    return Promise.reject(new Error('Image loading was cancelled'));
  }

  // 尝试不同的 crossOrigin 设置
  const tryLoad = (crossOriginSetting: string | null): Promise<HTMLImageElement> => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new Error('Image loading was cancelled'));
        return;
      }

      const image = new Image();
      
      if (crossOriginSetting) {
        image.crossOrigin = crossOriginSetting;
      }

      const cleanup = () => {
        image.onload = null;
        image.onerror = null;
      };

      image.onload = () => {
        if (abortSignal?.aborted) {
          cleanup();
          reject(new Error('Image loading was cancelled'));
          return;
        }
        cleanup();
        console.log(`Image loaded directly with crossOrigin=${crossOriginSetting}:`, url);
        
        // 模拟进度完成
        if (progressCallback && !abortSignal?.aborted) {
          progressCallback(100, 100);
        }
        
        resolve(image);
      };
      
      image.onerror = () => {
        cleanup();
        if (abortSignal?.aborted) {
          reject(new Error('Image loading was cancelled'));
          return;
        }
        reject(new Error(`Failed to load image with crossOrigin=${crossOriginSetting}`));
      };
      
      image.src = url;
    });
  };

  // 按顺序尝试不同的 crossOrigin 设置
  return tryLoad('anonymous')
    .catch(() => tryLoad('use-credentials'))
    .catch(() => tryLoad(null))
    .catch(() => {
      throw new Error(`Failed to load image: ${url}`);
    });
}

/**
 * 从 URL 加载图片
 */
function loadImageFromURL(
  url: string,
  abortSignal?: AbortSignal,
  cleanup?: () => void
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // 如果已取消，立即清理并返回
    if (abortSignal?.aborted) {
      cleanup?.();
      reject(new Error('Image loading was cancelled'));
      return;
    }

    const image = new Image();
    
    const cleanupAndReset = () => {
      image.onload = null;
      image.onerror = null;
      cleanup?.();
    };

    image.onload = () => {
      if (abortSignal?.aborted) {
        cleanupAndReset();
        reject(new Error('Image loading was cancelled'));
        return;
      }
      cleanupAndReset();
      console.log('Image loaded successfully:', url);
      resolve(image);
    };
    
    image.onerror = () => {
      cleanupAndReset();
      if (abortSignal?.aborted) {
        reject(new Error('Image loading was cancelled'));
        return;
      }
      reject(new Error('Failed to load image'));
    };
    
    image.src = url;
  });
}
