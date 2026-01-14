import { useState } from 'react';
import { EmptyState } from '../components/Layout';
import { useApp } from '../stores/useAppStore';
import {
  correctMessageAdvanced,
  getLearningModeDescription,
  type LearningMode,
} from '../services/aiService';
import { copyToClipboard, showToast, hapticFeedback } from '../services/appsInToss';

type CorrectionType = 'full' | 'partial';

export function CorrectPage() {
  const {
    styleAnalysis,
    apiKey,
    isLoading,
    learningMode,
    learningDataStatus,
    correctedMessages,
    setLoading,
    setError,
    setLearningMode,
    addCorrectedMessage,
  } = useApp();

  const [inputMessage, setInputMessage] = useState('');
  const [correctionType, setCorrectionType] = useState<CorrectionType>('partial');
  const [currentCorrection, setCurrentCorrection] = useState<string | null>(null);

  const handleCorrect = async () => {
    if (!inputMessage.trim()) {
      showToast('메시지를 입력해주세요');
      return;
    }

    if (!styleAnalysis) {
      showToast('먼저 대화 기록을 분석해주세요');
      return;
    }

    setLoading(true, '메시지 보정 중...');
    hapticFeedback('light');

    try {
      const corrected = await correctMessageAdvanced({
        originalMessage: inputMessage,
        styleAnalysis,
        correctionType,
        apiKey: apiKey || undefined,
        learningMode,
      });

      setCurrentCorrection(corrected);
      addCorrectedMessage(corrected);
      hapticFeedback('medium');
    } catch (err) {
      setError(err instanceof Error ? err.message : '메시지 보정 중 오류가 발생했습니다.');
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

  const handleRecorrect = async () => {
    if (inputMessage.trim()) {
      await handleCorrect();
    }
  };

  const handleModeChange = (mode: LearningMode) => {
    setLearningMode(mode);
    hapticFeedback('light');
  };

  if (!styleAnalysis) {
    return (
      <div className="page">
        <h1 className="page-title">메시지 보정</h1>
        <EmptyState
          icon="✏️"
          title="분석된 말투가 없습니다"
          description="먼저 홈에서 대화 기록을 업로드하고 분석해주세요."
        />
      </div>
    );
  }

  const modes: LearningMode[] = ['pattern', 'fewshot', 'embedding'];
  const modeNames: Record<LearningMode, string> = {
    pattern: '패턴',
    fewshot: 'Few-shot',
    embedding: '임베딩',
  };

  const canUseEmbedding = learningDataStatus?.hasEmbeddings || false;
  const canUseFewshot = learningDataStatus?.hasPairs || false;

  return (
    <div className="page">
      <h1 className="page-title">메시지 보정</h1>
      <p className="page-subtitle">
        작성한 메시지를 학습된 말투 스타일로 변환합니다.
      </p>

      {/* 학습 모드 선택 */}
      <section className="section">
        <label className="label">학습 방식</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {modes.map((mode) => {
            const isDisabled =
              (mode === 'fewshot' && !canUseFewshot) ||
              (mode === 'embedding' && !canUseEmbedding);

            return (
              <button
                key={mode}
                className={`btn ${learningMode === mode ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleModeChange(mode)}
                disabled={isDisabled}
                style={{
                  flex: 1,
                  opacity: isDisabled ? 0.5 : 1,
                }}
              >
                {modeNames[mode]}
              </button>
            );
          })}
        </div>
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
          {getLearningModeDescription(learningMode)}
        </p>
      </section>

      {/* 보정 유형 선택 */}
      <section className="section">
        <label className="label">보정 유형</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${correctionType === 'partial' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setCorrectionType('partial')}
            style={{ flex: 1 }}
          >
            부분 보정
          </button>
          <button
            className={`btn ${correctionType === 'full' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setCorrectionType('full')}
            style={{ flex: 1 }}
          >
            전체 보정
          </button>
        </div>
        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
          {correctionType === 'partial'
            ? '핵심 내용은 유지하면서 말투만 변환합니다.'
            : '문장 구조와 표현을 완전히 변환합니다.'}
        </p>
      </section>

      {/* 입력 영역 */}
      <section className="section">
        <label className="label">원본 메시지</label>
        <textarea
          className="input textarea"
          placeholder="보정할 메시지를 입력하세요..."
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={isLoading}
        />

        <button
          className="btn btn-primary btn-block"
          onClick={handleCorrect}
          disabled={isLoading || !inputMessage.trim()}
          style={{ marginTop: 16 }}
        >
          {isLoading ? '보정 중...' : '메시지 보정하기'}
        </button>
      </section>

      {/* 보정 결과 */}
      {currentCorrection && (
        <section className="section fade-in">
          <h2 className="section-title">보정된 메시지</h2>
          <div className="result-card">
            <div className="result-card-header">
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                원본
              </span>
            </div>
            <div
              className="result-card-content"
              style={{ fontSize: 14, marginBottom: 12, opacity: 0.7 }}
            >
              {inputMessage}
            </div>

            <div className="result-card-header">
              <span style={{ fontSize: 12, color: 'var(--color-primary)' }}>
                보정됨
              </span>
            </div>
            <div className="result-card-content">
              {currentCorrection}
            </div>

            <div className="result-card-actions">
              <button
                className="btn btn-primary"
                onClick={() => handleCopy(currentCorrection)}
                style={{ flex: 1 }}
              >
                📋 복사
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleRecorrect}
                disabled={isLoading}
                style={{ flex: 1 }}
              >
                🔄 다시 보정
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 히스토리 */}
      {correctedMessages.length > 0 && (
        <section className="section">
          <h2 className="section-title">이전 보정 결과</h2>
          {correctedMessages.slice(0, 5).map((message, i) => (
            <div
              key={i}
              className="result-card"
              style={{ marginBottom: 12 }}
            >
              <div className="result-card-content" style={{ fontSize: 14 }}>
                {message}
              </div>
              <div className="result-card-actions">
                <button
                  className="btn btn-outline"
                  onClick={() => handleCopy(message)}
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
              💡 <strong>더 정확한 보정</strong>을 원하시면 설정에서 OpenAI API 키를 등록해주세요.
              API 키 없이도 기본적인 보정이 가능합니다.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
