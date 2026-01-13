/**
 * 앱인토스 SDK 연동 서비스
 *
 * 토스 앱 내에서 실행될 때 네이티브 기능을 활용합니다.
 * 참고: https://developers-apps-in-toss.toss.im/
 */

import type { TossAppEnv } from '../types';

// 앱인토스 브릿지 타입 정의
interface TossBridge {
  postMessage: (message: string) => void;
}

interface TossWebView {
  isInTossApp: boolean;
  platform: 'ios' | 'android';
  appVersion: string;
}

declare global {
  interface Window {
    TossBridge?: TossBridge;
    TossWebView?: TossWebView;
    webkit?: {
      messageHandlers?: {
        TossBridge?: {
          postMessage: (message: string) => void;
        };
      };
    };
  }
}

/**
 * 토스 앱 환경 감지
 */
export function detectTossEnvironment(): TossAppEnv {
  const isInTossApp = !!(
    window.TossBridge ||
    window.TossWebView ||
    window.webkit?.messageHandlers?.TossBridge
  );

  let platform: 'ios' | 'android' | 'web' = 'web';

  if (isInTossApp) {
    if (window.webkit?.messageHandlers?.TossBridge) {
      platform = 'ios';
    } else if (window.TossBridge) {
      platform = 'android';
    }
  }

  const version = window.TossWebView?.appVersion || '1.0.0';

  return {
    platform,
    version,
    isInTossApp,
  };
}

/**
 * 토스 브릿지 메시지 전송
 */
function sendBridgeMessage(action: string, payload: Record<string, unknown> = {}): void {
  const message = JSON.stringify({ action, payload });

  if (window.webkit?.messageHandlers?.TossBridge) {
    // iOS
    window.webkit.messageHandlers.TossBridge.postMessage(message);
  } else if (window.TossBridge) {
    // Android
    window.TossBridge.postMessage(message);
  } else {
    console.log('[TossBridge Mock]', action, payload);
  }
}

/**
 * 햅틱 피드백
 */
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' = 'light'): void {
  sendBridgeMessage('haptic', { type });
}

/**
 * 클립보드에 텍스트 복사
 */
export function copyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    // 웹 API 사용 (앱인토스에서도 동작)
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          hapticFeedback('light');
          resolve(true);
        })
        .catch(() => resolve(false));
    } else {
      // 폴백
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        hapticFeedback('light');
        resolve(true);
      } catch {
        resolve(false);
      }
      document.body.removeChild(textarea);
    }
  });
}

/**
 * 공유하기
 */
export function share(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
  return new Promise((resolve) => {
    const env = detectTossEnvironment();

    if (env.isInTossApp) {
      sendBridgeMessage('share', data);
      resolve(true);
    } else if (navigator.share) {
      navigator.share(data)
        .then(() => resolve(true))
        .catch(() => resolve(false));
    } else {
      // 폴백: URL 복사
      if (data.url) {
        copyToClipboard(data.url).then(resolve);
      } else if (data.text) {
        copyToClipboard(data.text).then(resolve);
      } else {
        resolve(false);
      }
    }
  });
}

/**
 * 토스트 메시지 표시
 */
export function showToast(message: string): void {
  const env = detectTossEnvironment();

  if (env.isInTossApp) {
    sendBridgeMessage('toast', { message });
  } else {
    // 웹 폴백: 간단한 토스트 UI
    const toast = document.createElement('div');
    toast.className = 'gptalk-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 9999;
      animation: fadeInOut 2s ease-in-out;
    `;

    // 애니메이션 스타일 추가
    if (!document.getElementById('toast-style')) {
      const style = document.createElement('style');
      style.id = 'toast-style';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          20% { opacity: 1; transform: translateX(-50%) translateY(0); }
          80% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }
}

/**
 * 네트워크 상태 확인
 */
export function getNetworkStatus(): 'online' | 'offline' {
  return navigator.onLine ? 'online' : 'offline';
}

/**
 * 파일 선택 (클립보드 텍스트 읽기 포함)
 */
export async function readClipboardText(): Promise<string | null> {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      return await navigator.clipboard.readText();
    }
  } catch {
    // 권한 거부 등
  }
  return null;
}

/**
 * 로컬 스토리지 래퍼 (앱인토스 스토리지 API 호환)
 */
export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(`gptalk_${key}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },

  set: <T>(key: string, value: T): boolean => {
    try {
      localStorage.setItem(`gptalk_${key}`, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(`gptalk_${key}`);
      return true;
    } catch {
      return false;
    }
  },

  clear: (): boolean => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('gptalk_'));
      keys.forEach(k => localStorage.removeItem(k));
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * 앱인토스 초기화
 */
export function initAppsInToss(): TossAppEnv {
  const env = detectTossEnvironment();

  console.log('[GPTalk] 앱인토스 환경:', env);

  // 네트워크 상태 리스너
  window.addEventListener('online', () => {
    showToast('네트워크에 연결되었습니다');
  });

  window.addEventListener('offline', () => {
    showToast('네트워크 연결이 끊어졌습니다');
  });

  return env;
}
