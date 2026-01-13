import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { ParsedChat, StyleAnalysis, TossAppEnv } from '../types';

// 상태 타입
interface AppState {
  // 대화 기록 관련
  parsedChat: ParsedChat | null;
  styleAnalysis: StyleAnalysis | null;

  // 설정
  apiKey: string;
  targetSender: string | null;

  // 로딩 상태
  isLoading: boolean;
  loadingMessage: string;

  // 에러 상태
  error: string | null;

  // 앱인토스 환경
  tossEnv: TossAppEnv | null;

  // 히스토리
  generatedResponses: string[];
  correctedMessages: string[];
}

// 액션 타입
type Action =
  | { type: 'SET_PARSED_CHAT'; payload: ParsedChat }
  | { type: 'SET_STYLE_ANALYSIS'; payload: StyleAnalysis }
  | { type: 'SET_API_KEY'; payload: string }
  | { type: 'SET_TARGET_SENDER'; payload: string }
  | { type: 'SET_LOADING'; payload: { isLoading: boolean; message?: string } }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TOSS_ENV'; payload: TossAppEnv }
  | { type: 'ADD_GENERATED_RESPONSE'; payload: string }
  | { type: 'ADD_CORRECTED_MESSAGE'; payload: string }
  | { type: 'RESET' };

// 초기 상태
const initialState: AppState = {
  parsedChat: null,
  styleAnalysis: null,
  apiKey: '',
  targetSender: null,
  isLoading: false,
  loadingMessage: '',
  error: null,
  tossEnv: null,
  generatedResponses: [],
  correctedMessages: [],
};

// 리듀서
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_PARSED_CHAT':
      return {
        ...state,
        parsedChat: action.payload,
        error: null,
      };

    case 'SET_STYLE_ANALYSIS':
      return {
        ...state,
        styleAnalysis: action.payload,
        error: null,
      };

    case 'SET_API_KEY':
      return {
        ...state,
        apiKey: action.payload,
      };

    case 'SET_TARGET_SENDER':
      return {
        ...state,
        targetSender: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload.isLoading,
        loadingMessage: action.payload.message || '',
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'SET_TOSS_ENV':
      return {
        ...state,
        tossEnv: action.payload,
      };

    case 'ADD_GENERATED_RESPONSE':
      return {
        ...state,
        generatedResponses: [action.payload, ...state.generatedResponses].slice(0, 20),
      };

    case 'ADD_CORRECTED_MESSAGE':
      return {
        ...state,
        correctedMessages: [action.payload, ...state.correctedMessages].slice(0, 20),
      };

    case 'RESET':
      return {
        ...initialState,
        apiKey: state.apiKey, // API 키는 유지
        tossEnv: state.tossEnv, // 환경 정보는 유지
      };

    default:
      return state;
  }
}

// Context 생성
const AppStateContext = createContext<AppState | null>(null);
const AppDispatchContext = createContext<React.Dispatch<Action> | null>(null);

// Provider 컴포넌트
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

// 커스텀 훅
export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
}

export function useAppDispatch(): React.Dispatch<Action> {
  const context = useContext(AppDispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within AppProvider');
  }
  return context;
}

// 편의 훅
export function useApp() {
  const state = useAppState();
  const dispatch = useAppDispatch();

  return {
    ...state,

    // 액션들
    setParsedChat: (chat: ParsedChat) =>
      dispatch({ type: 'SET_PARSED_CHAT', payload: chat }),

    setStyleAnalysis: (analysis: StyleAnalysis) =>
      dispatch({ type: 'SET_STYLE_ANALYSIS', payload: analysis }),

    setApiKey: (key: string) =>
      dispatch({ type: 'SET_API_KEY', payload: key }),

    setTargetSender: (sender: string) =>
      dispatch({ type: 'SET_TARGET_SENDER', payload: sender }),

    setLoading: (isLoading: boolean, message?: string) =>
      dispatch({ type: 'SET_LOADING', payload: { isLoading, message } }),

    setError: (error: string | null) =>
      dispatch({ type: 'SET_ERROR', payload: error }),

    setTossEnv: (env: TossAppEnv) =>
      dispatch({ type: 'SET_TOSS_ENV', payload: env }),

    addGeneratedResponse: (response: string) =>
      dispatch({ type: 'ADD_GENERATED_RESPONSE', payload: response }),

    addCorrectedMessage: (message: string) =>
      dispatch({ type: 'ADD_CORRECTED_MESSAGE', payload: message }),

    reset: () =>
      dispatch({ type: 'RESET' }),
  };
}
