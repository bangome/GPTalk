import { useState } from 'react';
import { FileUpload } from '../components/FileUpload';
import { StyleAnalysisView } from '../components/StyleAnalysisView';
import { useApp } from '../stores/useAppStore';
import { parseChat, getMessengerTypeName } from '../services/chatParser';
import { analyzeStyle } from '../services/styleAnalyzer';

export function HomePage() {
  const {
    parsedChat,
    styleAnalysis,
    isLoading,
    error,
    setParsedChat,
    setStyleAnalysis,
    setLoading,
    setError,
    setTargetSender,
  } = useApp();

  const [selectedSender, setSelectedSender] = useState<string>('');

  const handleFileSelect = async (content: string, _fileName: string) => {
    setLoading(true, '대화 기록 분석 중...');
    setError(null);

    try {
      // 메신저 타입 감지
      const messengerType = getMessengerTypeName(content);
      console.log(`감지된 메신저: ${messengerType}`);

      // 대화 기록 파싱
      const parsed = parseChat(content);

      if (parsed.messages.length === 0) {
        throw new Error('파싱할 수 있는 메시지가 없습니다. 파일 형식을 확인해주세요.');
      }

      setParsedChat(parsed);

      // 가장 많이 발언한 사람을 기본 선택
      if (parsed.targetSender) {
        setSelectedSender(parsed.targetSender);
        setTargetSender(parsed.targetSender);

        // 말투 분석
        setLoading(true, '말투 분석 중...');
        const analysis = analyzeStyle(parsed);
        setStyleAnalysis(analysis);
      }

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일 처리 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleSenderChange = (sender: string) => {
    setSelectedSender(sender);
    setTargetSender(sender);

    if (parsedChat) {
      setLoading(true, '말투 분석 중...');

      try {
        // 선택된 발송자로 다시 파싱
        const updatedChat = {
          ...parsedChat,
          targetSender: sender,
          messages: parsedChat.messages.map(m => ({
            ...m,
            isTarget: m.sender === sender,
          })),
        };

        setParsedChat(updatedChat);

        // 말투 분석
        const analysis = analyzeStyle(updatedChat);
        setStyleAnalysis(analysis);
      } catch (err) {
        setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
      }

      setLoading(false);
    }
  };

  const handleReset = () => {
    setParsedChat(null as any);
    setStyleAnalysis(null as any);
    setSelectedSender('');
  };

  return (
    <div className="page">
      <h1 className="page-title">GPTalk</h1>
      <p className="page-subtitle">
        대화 기록을 분석하여 말투를 학습하고,
        <br />
        답변 생성과 메시지 보정을 도와드립니다.
      </p>

      {/* 파일 업로드 */}
      <section className="section">
        <FileUpload
          onFileSelect={handleFileSelect}
          disabled={isLoading}
        />
      </section>

      {/* 에러 표시 */}
      {error && (
        <div className="error-message" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* 발송자 선택 */}
      {parsedChat && parsedChat.participants.length > 1 && (
        <section className="section">
          <h2 className="section-title">학습 대상 선택</h2>
          <div className="card">
            <p style={{ marginBottom: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
              누구의 말투를 학습할까요?
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {parsedChat.participants.map(sender => (
                <button
                  key={sender}
                  className={`btn ${selectedSender === sender ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => handleSenderChange(sender)}
                  style={{ padding: '8px 16px', fontSize: 14 }}
                >
                  {sender}
                  {parsedChat.targetSender === sender && ' (추천)'}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 분석 결과 */}
      {styleAnalysis && parsedChat && (
        <section className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 className="section-title" style={{ margin: 0 }}>분석 결과</h2>
            <button
              className="btn btn-secondary"
              onClick={handleReset}
              style={{ padding: '8px 16px', fontSize: 14 }}
            >
              다시 분석
            </button>
          </div>

          <StyleAnalysisView
            analysis={styleAnalysis}
            parsedChat={parsedChat}
          />
        </section>
      )}

      {/* 사용 안내 */}
      {!parsedChat && !isLoading && (
        <section className="section">
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              💡 사용 방법
            </h3>
            <ol style={{ paddingLeft: 20, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              <li>카카오톡, 라인 등에서 대화 내보내기를 합니다.</li>
              <li>txt 파일을 업로드합니다.</li>
              <li>학습할 대상을 선택합니다.</li>
              <li>분석이 완료되면 답변 생성, 메시지 보정 기능을 사용할 수 있습니다.</li>
            </ol>
          </div>
        </section>
      )}
    </div>
  );
}
