import type { StyleAnalysis, ParsedChat } from '../types';

interface StyleAnalysisViewProps {
  analysis: StyleAnalysis;
  parsedChat: ParsedChat;
}

export function StyleAnalysisView({ analysis, parsedChat }: StyleAnalysisViewProps) {
  const { speechPatterns, conversationStyle, honorifics, emotionalPatterns } = analysis;

  const formalityText = {
    formal: '격식체 (존댓말)',
    casual: '비격식체 (반말)',
    mixed: '혼용',
  }[conversationStyle.formality];

  return (
    <div className="fade-in">
      {/* 기본 정보 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          📊 기본 정보
        </h3>

        <div className="analysis-item">
          <span className="analysis-label">분석 대상</span>
          <span className="analysis-value">{parsedChat.targetSender}</span>
        </div>

        <div className="analysis-item">
          <span className="analysis-label">총 메시지 수</span>
          <span className="analysis-value">
            {parsedChat.messages.filter(m => m.isTarget).length}개
          </span>
        </div>

        <div className="analysis-item">
          <span className="analysis-label">분석 기간</span>
          <span className="analysis-value">
            {parsedChat.dateRange.start.toLocaleDateString()} ~{' '}
            {parsedChat.dateRange.end.toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* 대화 스타일 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          💬 대화 스타일
        </h3>

        <div className="analysis-item">
          <span className="analysis-label">문체</span>
          <span className="analysis-value">{formalityText}</span>
        </div>

        <div className="analysis-item">
          <span className="analysis-label">평균 메시지 길이</span>
          <span className="analysis-value">{conversationStyle.averageLength}자</span>
        </div>

        <div className="analysis-item">
          <span className="analysis-label">응답 패턴</span>
          <span className="analysis-value">{conversationStyle.responseTime}</span>
        </div>
      </div>

      {/* 호칭 패턴 */}
      {honorifics.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            👋 호칭 패턴
          </h3>

          <div className="pattern-tags">
            {honorifics.map((h, i) => (
              <span key={i} className="tag tag-primary">
                {h.pattern} ({h.frequency}회)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 문장 끝맺음 */}
      {speechPatterns.endings.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            ✍️ 문장 끝맺음
          </h3>

          <div className="pattern-tags">
            {speechPatterns.endings.map((ending, i) => (
              <span key={i} className="tag">
                {ending}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 자주 쓰는 표현 */}
      {speechPatterns.expressions.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            💡 자주 쓰는 표현
          </h3>

          <div className="pattern-tags">
            {speechPatterns.expressions.slice(0, 10).map((expr, i) => (
              <span key={i} className="tag">
                {expr}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 이모티콘 */}
      {speechPatterns.emoticons.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
            😊 자주 쓰는 이모티콘
          </h3>

          <div className="pattern-tags">
            {speechPatterns.emoticons.map((emoticon, i) => (
              <span key={i} className="tag" style={{ fontSize: 18 }}>
                {emoticon}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 감정 표현 */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          🎭 감정 표현 패턴
        </h3>

        {emotionalPatterns.positive.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
              긍정적 표현
            </p>
            <div className="pattern-tags">
              {emotionalPatterns.positive.map((expr, i) => (
                <span key={i} className="tag" style={{ background: 'rgba(3, 199, 90, 0.1)', color: 'var(--color-success)' }}>
                  {expr}
                </span>
              ))}
            </div>
          </div>
        )}

        {emotionalPatterns.negative.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
              부정적 표현
            </p>
            <div className="pattern-tags">
              {emotionalPatterns.negative.map((expr, i) => (
                <span key={i} className="tag" style={{ background: 'rgba(240, 68, 82, 0.1)', color: 'var(--color-error)' }}>
                  {expr}
                </span>
              ))}
            </div>
          </div>
        )}

        {emotionalPatterns.neutral.length > 0 && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
              중립적 표현
            </p>
            <div className="pattern-tags">
              {emotionalPatterns.neutral.map((expr, i) => (
                <span key={i} className="tag">
                  {expr}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
