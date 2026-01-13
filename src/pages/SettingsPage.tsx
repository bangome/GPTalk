import { useState, useEffect } from 'react';
import { useApp } from '../stores/useAppStore';
import { storage, showToast, hapticFeedback, detectTossEnvironment } from '../services/appsInToss';

export function SettingsPage() {
  const { apiKey, setApiKey, reset, tossEnv, setTossEnv } = useApp();
  const [inputApiKey, setInputApiKey] = useState(apiKey);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    // 저장된 API 키 불러오기
    const savedKey = storage.get<string>('apiKey');
    if (savedKey) {
      setApiKey(savedKey);
      setInputApiKey(savedKey);
    }

    // 앱인토스 환경 감지
    const env = detectTossEnvironment();
    setTossEnv(env);
  }, [setApiKey, setTossEnv]);

  const handleSaveApiKey = () => {
    const trimmedKey = inputApiKey.trim();
    setApiKey(trimmedKey);
    storage.set('apiKey', trimmedKey);
    hapticFeedback('light');
    showToast('API 키가 저장되었습니다');
  };

  const handleClearApiKey = () => {
    setApiKey('');
    setInputApiKey('');
    storage.remove('apiKey');
    hapticFeedback('light');
    showToast('API 키가 삭제되었습니다');
  };

  const handleResetAll = () => {
    if (confirm('모든 데이터를 초기화하시겠습니까?')) {
      reset();
      storage.clear();
      hapticFeedback('medium');
      showToast('모든 데이터가 초기화되었습니다');
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">설정</h1>

      {/* API 키 설정 */}
      <section className="section">
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            🔑 OpenAI API 키
          </h2>

          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            더 자연스러운 답변 생성과 정확한 메시지 보정을 위해
            OpenAI API 키를 등록해주세요.
          </p>

          <div style={{ position: 'relative' }}>
            <input
              type={showApiKey ? 'text' : 'password'}
              className="input"
              placeholder="sk-..."
              value={inputApiKey}
              onChange={(e) => setInputApiKey(e.target.value)}
              style={{ paddingRight: 48 }}
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 20,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {showApiKey ? '🙈' : '👁️'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              className="btn btn-primary"
              onClick={handleSaveApiKey}
              disabled={!inputApiKey.trim()}
              style={{ flex: 1 }}
            >
              저장
            </button>
            {apiKey && (
              <button
                className="btn btn-outline"
                onClick={handleClearApiKey}
                style={{ color: 'var(--color-error)' }}
              >
                삭제
              </button>
            )}
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12 }}>
            API 키는 기기에 안전하게 저장되며 외부로 전송되지 않습니다.
          </p>
        </div>
      </section>

      {/* 앱 정보 */}
      <section className="section">
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            📱 앱 정보
          </h2>

          <div className="analysis-item">
            <span className="analysis-label">버전</span>
            <span className="analysis-value">1.0.0</span>
          </div>

          <div className="analysis-item">
            <span className="analysis-label">플랫폼</span>
            <span className="analysis-value">
              {tossEnv?.platform === 'ios' ? 'iOS' :
               tossEnv?.platform === 'android' ? 'Android' : 'Web'}
            </span>
          </div>

          <div className="analysis-item">
            <span className="analysis-label">토스 앱 내 실행</span>
            <span className="analysis-value">
              {tossEnv?.isInTossApp ? '예' : '아니오'}
            </span>
          </div>
        </div>
      </section>

      {/* 데이터 관리 */}
      <section className="section">
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            🗑️ 데이터 관리
          </h2>

          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            분석된 대화 기록과 생성 히스토리를 모두 삭제합니다.
          </p>

          <button
            className="btn btn-outline btn-block"
            onClick={handleResetAll}
            style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
          >
            모든 데이터 초기화
          </button>
        </div>
      </section>

      {/* 사용 안내 */}
      <section className="section">
        <div className="card">
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            📖 사용 안내
          </h2>

          <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <p style={{ marginBottom: 12 }}>
              <strong>대화 기록 내보내기 방법</strong>
            </p>

            <p style={{ marginBottom: 8 }}>
              <strong>카카오톡:</strong><br />
              채팅방 {'>'} 메뉴 {'>'} 대화 내보내기 {'>'} 텍스트로 내보내기
            </p>

            <p style={{ marginBottom: 8 }}>
              <strong>라인:</strong><br />
              채팅방 {'>'} 설정 {'>'} 대화 내보내기
            </p>

            <p>
              <strong>텔레그램:</strong><br />
              채팅방 {'>'} 메뉴 {'>'} Export chat history
            </p>
          </div>
        </div>
      </section>

      {/* 개인정보 처리방침 */}
      <section className="section">
        <div className="card" style={{ background: 'var(--bg-tertiary)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            GPTalk은 업로드된 대화 기록을 서버에 저장하지 않습니다.
            모든 분석은 사용자의 기기에서 처리되며,
            API 호출 시에만 암호화된 연결을 통해 데이터가 전송됩니다.
          </p>
        </div>
      </section>
    </div>
  );
}
