// 대화 메시지 타입
export interface ChatMessage {
  timestamp: Date;
  sender: string;
  content: string;
  isTarget?: boolean; // 학습 대상 발송자인지 여부
}

// 파싱된 대화 기록
export interface ParsedChat {
  messages: ChatMessage[];
  participants: string[];
  targetSender: string | null;
  dateRange: {
    start: Date;
    end: Date;
  };
}

// 말투 분석 결과
export interface StyleAnalysis {
  // 호칭 패턴
  honorifics: {
    pattern: string;
    frequency: number;
    examples: string[];
  }[];

  // 말투 특징
  speechPatterns: {
    endings: string[]; // 문장 끝맺음 (예: ~요, ~ㅋㅋ, ~!)
    expressions: string[]; // 자주 쓰는 표현
    emoticons: string[]; // 이모티콘/이모지
  };

  // 대화 스타일
  conversationStyle: {
    formality: 'formal' | 'casual' | 'mixed'; // 격식체 여부
    averageLength: number; // 평균 메시지 길이
    responseTime: string; // 평균 응답 시간 패턴
  };

  // 감정 표현 패턴
  emotionalPatterns: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
}

// 답변 생성 요청
export interface GenerateRequest {
  receivedMessage: string; // 받은 메시지
  context?: string[]; // 이전 대화 맥락
  styleAnalysis: StyleAnalysis; // 분석된 말투
}

// 메시지 보정 요청
export interface CorrectionRequest {
  originalMessage: string; // 원본 메시지
  styleAnalysis: StyleAnalysis; // 분석된 말투
  correctionType: 'full' | 'partial'; // 전체 보정 / 부분 보정
}

// 앱 상태
export interface AppState {
  // 대화 기록 관련
  parsedChat: ParsedChat | null;
  styleAnalysis: StyleAnalysis | null;

  // 로딩 상태
  isLoading: boolean;
  loadingMessage: string;

  // 에러 상태
  error: string | null;
}

// 앱인토스 환경 정보
export interface TossAppEnv {
  platform: 'ios' | 'android' | 'web';
  version: string;
  isInTossApp: boolean;
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
