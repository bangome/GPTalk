import { useState } from 'react';
import { EmptyState } from '../components/Layout';
import { useApp } from '../stores/useAppStore';
import { generateResponse } from '../services/aiService';
import { copyToClipboard, showToast, hapticFeedback } from '../services/appsInToss';

export function GeneratePage() {
  const {
    styleAnalysis,
    apiKey,
    isLoading,
    generatedResponses,
    setLoading,
    setError,
    addGeneratedResponse,
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [currentResponse, setCurrentResponse] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!inputMessage.trim()) {
      showToast('메시지를 입력해주세요');
      return;
    }

    if (!styleAnalysis) {
      showToast('먼저 대화 기록을 분석해주세요');
      return;
    }

    setLoading(true, '답변 생성 중...');
    hapticFeedback('light');

    try {
      const response = await generateResponse({
        receivedMessage: inputMessage,
        styleAnalysis,
        apiKey: apiKey || undefined,
      });

      setCurrentResponse(response);
      addGeneratedResponse(response);
      hapticFeedback('medium');
    } catch (err) {
      setError(err instanceof Error ? err.message : '답변 생성 중 오류가 발생했습니다.');
    }

    setLoading(false);
  };

  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      showToast('클립보드에 복사되었습니다');
    } else {
      showToast('복사에 실패했습니다');
    }
  };

  const handleRegenerate = async () => {
    if (inputMessage.trim()) {
      await handleGenerate();
    }
  };

  if (!styleAnalysis) {
    return (
      <div className="page">
        <h1 className="page-title">답변 생성</h1>
        <EmptyState
          icon="💬"
          title="분석된 말투가 없습니다"
          description="먼저 홈에서 대화 기록을 업로드하고 분석해주세요."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">답변 생성</h1>
      <p className="page-subtitle">
        받은 메시지를 입력하면 학습된 말투로 답변을 생성합니다.
      </p>

      {/* 입력 영역 */}
      <section className="section">
        <label className="label">받은 메시지</label>
        <textarea
          className="input textarea"
          placeholder="상대방에게 받은 메시지를 입력하세요..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={isLoading}
        />

        <button
          className="btn btn-primary btn-block"
          onClick={handleGenerate}
          disabled={isLoading || !inputMessage.trim()}
          style={{ marginTop: 16 }}
        >
          {isLoading ? '생성 중...' : '답변 생성하기'}
        </button>
      </section>

      {/* 현재 생성된 답변 */}
      {currentResponse && (
        <section className="section fade-in">
          <h2 className="section-title">생성된 답변</h2>
          <div className="result-card">
            <div className="result-card-content">
              {currentResponse}
            </div>
            <div className="result-card-actions">
              <button
                className="btn btn-primary"
                onClick={() => handleCopy(currentResponse)}
                style={{ flex: 1 }}
              >
                📋 복사
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleRegenerate}
                disabled={isLoading}
                style={{ flex: 1 }}
              >
                🔄 다시 생성
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 히스토리 */}
      {generatedResponses.length > 0 && (
        <section className="section">
          <h2 className="section-title">이전 답변들</h2>
          {generatedResponses.slice(0, 5).map((response, i) => (
            <div
              key={i}
              className="result-card"
              style={{ marginBottom: 12 }}
            >
              <div className="result-card-content" style={{ fontSize: 14 }}>
                {response}
              </div>
              <div className="result-card-actions">
                <button
                  className="btn btn-outline"
                  onClick={() => handleCopy(response)}
                  style={{ padding: '8px 16px', fontSize: 14 }}
                >
                  복사
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* API 키 안내 */}
      {!apiKey && (
        <section className="section">
          <div className="card" style={{ background: 'rgba(49, 130, 246, 0.05)' }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              💡 <strong>더 자연스러운 답변</strong>을 원하시면 설정에서 OpenAI API 키를 등록해주세요.
              API 키 없이도 기본적인 답변 생성이 가능합니다.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
