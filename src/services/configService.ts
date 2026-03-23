// 配置服务：负责加载和校验 inspection-config.json
import type { InspectionConfig } from '../types/inspection';

let configCache: InspectionConfig | null = null;
let pendingRequest: Promise<InspectionConfig> | null = null;

export async function loadInspectionConfig(): Promise<InspectionConfig> {
  if (configCache) {
    return configCache;
  }

  if (pendingRequest) {
    return pendingRequest;
  }

  // 兼容性：某些环境下 import.meta.env 的类型/值可能不可用或为空
  // 使用可选链并回退到 '/'，同时优先尝试应用根目录的相对路径
  const baseUrlRaw = (import.meta as any)?.env?.BASE_URL;
  const baseUrl = typeof baseUrlRaw === 'string' && baseUrlRaw.length > 0 ? baseUrlRaw : '/';

  const normalizedBase = baseUrl.replace(/\/+$|^\/+$/g, '/');

  // 候选 URL：优先相对根路径（最常用），其次尝试基于 BASE_URL 的路径
  const candidates = Array.from(
    new Set([
      '/config/inspection-config.json',
      `${normalizedBase}config/inspection-config.json`
    ])
  );

  // 保存 promise，防止并发重复请求
  pendingRequest = (async () => {
    let lastError: Error | null = null;

    // 打印调试信息，便于定位运行时环境问题
    // eslint-disable-next-line no-console
    console.debug('[configService] loadInspectionConfig candidates:', candidates);

    for (const url of candidates) {
      try {
        // eslint-disable-next-line no-console
        console.debug(`[configService] try fetch: ${url}`);
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`配置文件加载失败：HTTP ${response.status} (${url})`);
        }
        const config = (await response.json()) as InspectionConfig;
        configCache = config;
        // eslint-disable-next-line no-console
        console.debug('[configService] loaded config from', url);
        return config;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[configService] fetch failed for', url, error);
        lastError = error instanceof Error ? error : new Error('配置文件加载失败');
      }
    }

    throw lastError ?? new Error('配置文件加载失败，请检查 public/config/inspection-config.json');
  })();

  try {
    return await pendingRequest;
  } finally {
    pendingRequest = null;
  }
}
