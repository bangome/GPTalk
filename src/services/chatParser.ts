import type { ChatMessage, ParsedChat } from '../types';

// 메신저 타입
type MessengerType = 'kakao' | 'line' | 'telegram' | 'generic';

// 카카오톡 메시지 패턴
// [이름] [오후 3:21] 메시지 내용
// 2024년 1월 15일 월요일
const KAKAO_PATTERNS = {
  message: /^\[(.+?)\]\s*\[(오전|오후)\s*(\d{1,2}):(\d{2})\]\s*(.+)$/,
  date: /^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/,
  systemMessage: /^(.+?)님이\s*(나갔습니다|들어왔습니다|초대했습니다)/,
};

// 라인 메시지 패턴
// 2024.01.15 15:21\t이름\t메시지
const LINE_PATTERNS = {
  message: /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})\t(.+?)\t(.+)$/,
  date: /^(\d{4})\.(\d{2})\.(\d{2})/,
};

// 텔레그램 메시지 패턴 (JSON export)
const TELEGRAM_PATTERNS = {
  message: /^\[(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\]\s*(.+?):\s*(.+)$/,
};

// 일반 패턴 (시간 + 이름 + 메시지)
const GENERIC_PATTERNS = {
  message: /^(\d{1,2}):(\d{2})\s+(.+?)[:]\s*(.+)$/,
  messageWithDate: /^(\d{4}[-/]\d{2}[-/]\d{2})\s+(\d{1,2}):(\d{2})\s+(.+?)[:]\s*(.+)$/,
};

/**
 * 메신저 타입 감지
 */
function detectMessengerType(content: string): MessengerType {
  const lines = content.split('\n').slice(0, 20);

  for (const line of lines) {
    if (KAKAO_PATTERNS.message.test(line) || KAKAO_PATTERNS.date.test(line)) {
      return 'kakao';
    }
    if (LINE_PATTERNS.message.test(line)) {
      return 'line';
    }
    if (TELEGRAM_PATTERNS.message.test(line)) {
      return 'telegram';
    }
  }

  return 'generic';
}

/**
 * 카카오톡 대화 파싱
 */
function parseKakaoChat(content: string): ChatMessage[] {
  const lines = content.split('\n');
  const messages: ChatMessage[] = [];
  let currentDate = new Date();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 날짜 라인 확인
    const dateMatch = trimmed.match(KAKAO_PATTERNS.date);
    if (dateMatch) {
      const [, year, month, day] = dateMatch;
      currentDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );
      continue;
    }

    // 시스템 메시지 스킵
    if (KAKAO_PATTERNS.systemMessage.test(trimmed)) {
      continue;
    }

    // 메시지 파싱
    const messageMatch = trimmed.match(KAKAO_PATTERNS.message);
    if (messageMatch) {
      const [, sender, meridiem, hour, minute, content] = messageMatch;
      let hours = parseInt(hour);

      // 오후 처리
      if (meridiem === '오후' && hours !== 12) {
        hours += 12;
      } else if (meridiem === '오전' && hours === 12) {
        hours = 0;
      }

      const timestamp = new Date(currentDate);
      timestamp.setHours(hours, parseInt(minute), 0, 0);

      messages.push({
        timestamp,
        sender: sender.trim(),
        content: content.trim(),
      });
    }
  }

  return messages;
}

/**
 * 라인 대화 파싱
 */
function parseLineChat(content: string): ChatMessage[] {
  const lines = content.split('\n');
  const messages: ChatMessage[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const messageMatch = trimmed.match(LINE_PATTERNS.message);
    if (messageMatch) {
      const [, year, month, day, hour, minute, sender, content] = messageMatch;

      const timestamp = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      messages.push({
        timestamp,
        sender: sender.trim(),
        content: content.trim(),
      });
    }
  }

  return messages;
}

/**
 * 텔레그램 대화 파싱
 */
function parseTelegramChat(content: string): ChatMessage[] {
  const lines = content.split('\n');
  const messages: ChatMessage[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const messageMatch = trimmed.match(TELEGRAM_PATTERNS.message);
    if (messageMatch) {
      const [, day, month, year, hour, minute, , sender, content] = messageMatch;

      const timestamp = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      messages.push({
        timestamp,
        sender: sender.trim(),
        content: content.trim(),
      });
    }
  }

  return messages;
}

/**
 * 일반 대화 파싱
 */
function parseGenericChat(content: string): ChatMessage[] {
  const lines = content.split('\n');
  const messages: ChatMessage[] = [];
  let currentDate = new Date();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 날짜 포함 메시지
    const fullMatch = trimmed.match(GENERIC_PATTERNS.messageWithDate);
    if (fullMatch) {
      const [, date, hour, minute, sender, content] = fullMatch;
      const [year, month, day] = date.split(/[-/]/).map(Number);

      const timestamp = new Date(year, month - 1, day, parseInt(hour), parseInt(minute));

      messages.push({
        timestamp,
        sender: sender.trim(),
        content: content.trim(),
      });
      continue;
    }

    // 시간만 있는 메시지
    const simpleMatch = trimmed.match(GENERIC_PATTERNS.message);
    if (simpleMatch) {
      const [, hour, minute, sender, content] = simpleMatch;

      const timestamp = new Date(currentDate);
      timestamp.setHours(parseInt(hour), parseInt(minute), 0, 0);

      messages.push({
        timestamp,
        sender: sender.trim(),
        content: content.trim(),
      });
    }
  }

  return messages;
}

/**
 * 참여자 목록 추출
 */
function extractParticipants(messages: ChatMessage[]): string[] {
  const participants = new Set<string>();
  for (const msg of messages) {
    participants.add(msg.sender);
  }
  return Array.from(participants);
}

/**
 * 가장 많이 발언한 사람 찾기 (학습 대상 후보)
 */
function findMostActiveSender(messages: ChatMessage[]): string | null {
  const counts = new Map<string, number>();

  for (const msg of messages) {
    counts.set(msg.sender, (counts.get(msg.sender) || 0) + 1);
  }

  let maxCount = 0;
  let mostActive: string | null = null;

  for (const [sender, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mostActive = sender;
    }
  }

  return mostActive;
}

/**
 * 메인 파싱 함수
 */
export function parseChat(content: string, targetSender?: string): ParsedChat {
  const messengerType = detectMessengerType(content);

  let messages: ChatMessage[];

  switch (messengerType) {
    case 'kakao':
      messages = parseKakaoChat(content);
      break;
    case 'line':
      messages = parseLineChat(content);
      break;
    case 'telegram':
      messages = parseTelegramChat(content);
      break;
    default:
      messages = parseGenericChat(content);
  }

  const participants = extractParticipants(messages);
  const detectedTarget = targetSender || findMostActiveSender(messages);

  // 타겟 발송자 표시
  if (detectedTarget) {
    messages = messages.map(msg => ({
      ...msg,
      isTarget: msg.sender === detectedTarget,
    }));
  }

  // 날짜 범위 계산
  const timestamps = messages.map(m => m.timestamp.getTime()).filter(t => !isNaN(t));
  const dateRange = {
    start: new Date(Math.min(...timestamps)),
    end: new Date(Math.max(...timestamps)),
  };

  return {
    messages,
    participants,
    targetSender: detectedTarget,
    dateRange,
  };
}

/**
 * 메신저 타입 이름 반환
 */
export function getMessengerTypeName(content: string): string {
  const type = detectMessengerType(content);
  const names: Record<MessengerType, string> = {
    kakao: '카카오톡',
    line: '라인',
    telegram: '텔레그램',
    generic: '일반',
  };
  return names[type];
}
