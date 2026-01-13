import type { ChatMessage, ParsedChat, StyleAnalysis } from '../types';

/**
 * 문장 끝맺음 패턴 추출
 */
function extractEndings(messages: ChatMessage[]): string[] {
  const endingPatterns = new Map<string, number>();

  // 일반적인 한국어 문장 끝맺음 패턴들
  const endingRegexes = [
    /([ㅋㅎㅠㅜ]{2,})$/,  // ㅋㅋㅋ, ㅎㅎㅎ, ㅠㅠ
    /(요|용|욤|염|욥)$/,  // 존댓말 끝맺음
    /(다|당|담|땅)$/,     // 반말 끝맺음
    /(네|넹|넴)$/,        // 동의 표현
    /(ㅇㅇ|ㄴㄴ|ㄱㄱ)$/,  // 축약어
    /([!?~.]{1,3})$/,     // 문장부호
    /(해|해요|합니다)$/,  // 동사 끝맺음
    /(임|슴|음)$/,        // 명사형 종결
    /(군|군요|구나)$/,    // 감탄
    /(지|죠|징)$/,        // 확인/동의
  ];

  for (const msg of messages) {
    const content = msg.content.trim();
    if (content.length < 2) continue;

    for (const regex of endingRegexes) {
      const match = content.match(regex);
      if (match) {
        const ending = match[1];
        endingPatterns.set(ending, (endingPatterns.get(ending) || 0) + 1);
      }
    }
  }

  // 빈도순 정렬 후 상위 10개 반환
  return Array.from(endingPatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ending]) => ending);
}

/**
 * 자주 쓰는 표현 추출
 */
function extractExpressions(messages: ChatMessage[]): string[] {
  const expressions = new Map<string, number>();

  // 2-4글자 단어/표현 추출
  const wordRegex = /[가-힣]{2,4}/g;

  for (const msg of messages) {
    const words = msg.content.match(wordRegex) || [];
    for (const word of words) {
      expressions.set(word, (expressions.get(word) || 0) + 1);
    }
  }

  // 일반적인 단어 필터링 (조사, 대명사 등 제외)
  const commonWords = new Set([
    '그래', '나도', '그럼', '뭐야', '어디', '언제', '왜', '어떻게',
    '이거', '저거', '그거', '여기', '거기', '저기', '우리', '너희',
  ]);

  return Array.from(expressions.entries())
    .filter(([word]) => !commonWords.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([word]) => word);
}

/**
 * 이모티콘/이모지 추출
 */
function extractEmoticons(messages: ChatMessage[]): string[] {
  const emoticons = new Map<string, number>();

  // 이모지 패턴
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;

  // 텍스트 이모티콘 패턴
  const textEmoticonRegex = /[ㅋㅎㅠㅜ]{2,}|[~^]{2,}|[><]{2,}|\^\^|ㅇㅅㅇ|ㅇㅁㅇ|ㄷㄷ/g;

  for (const msg of messages) {
    const emojis = msg.content.match(emojiRegex) || [];
    const textEmoticons = msg.content.match(textEmoticonRegex) || [];

    for (const emoji of [...emojis, ...textEmoticons]) {
      emoticons.set(emoji, (emoticons.get(emoji) || 0) + 1);
    }
  }

  return Array.from(emoticons.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([emoticon]) => emoticon);
}

/**
 * 호칭 패턴 추출
 */
function extractHonorifics(
  messages: ChatMessage[],
  participants: string[]
): StyleAnalysis['honorifics'] {
  const honorifics = new Map<string, { count: number; examples: string[] }>();

  // 호칭 패턴들
  const honorificPatterns = [
    /([가-힣]+(?:씨|님|야|아|이|오빠|언니|형|누나|선배|후배))/g,
    /(자기|여보|애기|베이비|허니)/g,
    /([가-힣]{2,4}(?:쿤|짱|양))/g,
  ];

  for (const msg of messages) {
    for (const pattern of honorificPatterns) {
      const matches = msg.content.match(pattern) || [];
      for (const match of matches) {
        // 참여자 이름과 관련된 호칭인지 확인
        const isRelevant = participants.some(
          p => match.includes(p) || p.includes(match.replace(/[씨님야아이]$/, ''))
        );

        if (isRelevant || match.length <= 4) {
          const existing = honorifics.get(match);
          if (existing) {
            existing.count++;
            if (existing.examples.length < 3) {
              existing.examples.push(msg.content.slice(0, 50));
            }
          } else {
            honorifics.set(match, {
              count: 1,
              examples: [msg.content.slice(0, 50)],
            });
          }
        }
      }
    }
  }

  return Array.from(honorifics.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([pattern, data]) => ({
      pattern,
      frequency: data.count,
      examples: data.examples,
    }));
}

/**
 * 격식체 분석
 */
function analyzeFormality(messages: ChatMessage[]): 'formal' | 'casual' | 'mixed' {
  let formalCount = 0;
  let casualCount = 0;

  const formalPatterns = /요$|합니다$|습니다$|세요$|십시오$/;
  const casualPatterns = /야$|어$|아$|지$|냐$|니$|래$|자$/;

  for (const msg of messages) {
    const content = msg.content.trim();
    if (formalPatterns.test(content)) formalCount++;
    if (casualPatterns.test(content)) casualCount++;
  }

  const total = formalCount + casualCount;
  if (total === 0) return 'mixed';

  const formalRatio = formalCount / total;

  if (formalRatio > 0.7) return 'formal';
  if (formalRatio < 0.3) return 'casual';
  return 'mixed';
}

/**
 * 평균 메시지 길이 계산
 */
function calculateAverageLength(messages: ChatMessage[]): number {
  if (messages.length === 0) return 0;

  const totalLength = messages.reduce((sum, msg) => sum + msg.content.length, 0);
  return Math.round(totalLength / messages.length);
}

/**
 * 감정 표현 패턴 추출
 */
function extractEmotionalPatterns(
  messages: ChatMessage[]
): StyleAnalysis['emotionalPatterns'] {
  const positive: Map<string, number> = new Map();
  const negative: Map<string, number> = new Map();
  const neutral: Map<string, number> = new Map();

  const positivePatterns = /좋아|사랑|고마워|감사|행복|기뻐|최고|대박|굿|좋겠|설레/g;
  const negativePatterns = /싫어|짜증|화나|슬퍼|힘들|피곤|별로|아쉽|걱정|불안/g;
  const neutralPatterns = /그래|알겠|응|ㅇㅇ|ㄱㄱ|오케이|알았|그렇구나/g;

  for (const msg of messages) {
    const content = msg.content;

    const posMatches = content.match(positivePatterns) || [];
    const negMatches = content.match(negativePatterns) || [];
    const neuMatches = content.match(neutralPatterns) || [];

    for (const m of posMatches) positive.set(m, (positive.get(m) || 0) + 1);
    for (const m of negMatches) negative.set(m, (negative.get(m) || 0) + 1);
    for (const m of neuMatches) neutral.set(m, (neutral.get(m) || 0) + 1);
  }

  const toArray = (map: Map<string, number>) =>
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

  return {
    positive: toArray(positive),
    negative: toArray(negative),
    neutral: toArray(neutral),
  };
}

/**
 * 응답 시간 패턴 분석
 */
function analyzeResponseTime(messages: ChatMessage[]): string {
  if (messages.length < 2) return '분석 불가';

  const responseTimes: number[] = [];

  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];

    // 다른 사람의 메시지에 대한 응답인 경우만
    if (prev.sender !== curr.sender) {
      const diff = curr.timestamp.getTime() - prev.timestamp.getTime();
      if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
        // 24시간 이내
        responseTimes.push(diff);
      }
    }
  }

  if (responseTimes.length === 0) return '분석 불가';

  const avgMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const avgMinutes = Math.round(avgMs / 60000);

  if (avgMinutes < 1) return '즉시 응답';
  if (avgMinutes < 5) return '1-5분 이내';
  if (avgMinutes < 30) return '5-30분 이내';
  if (avgMinutes < 60) return '30분-1시간';
  return '1시간 이상';
}

/**
 * 메인 분석 함수
 */
export function analyzeStyle(parsedChat: ParsedChat): StyleAnalysis {
  const targetMessages = parsedChat.messages.filter(m => m.isTarget);

  if (targetMessages.length === 0) {
    throw new Error('분석할 대상 메시지가 없습니다.');
  }

  return {
    honorifics: extractHonorifics(targetMessages, parsedChat.participants),
    speechPatterns: {
      endings: extractEndings(targetMessages),
      expressions: extractExpressions(targetMessages),
      emoticons: extractEmoticons(targetMessages),
    },
    conversationStyle: {
      formality: analyzeFormality(targetMessages),
      averageLength: calculateAverageLength(targetMessages),
      responseTime: analyzeResponseTime(parsedChat.messages),
    },
    emotionalPatterns: extractEmotionalPatterns(targetMessages),
  };
}

/**
 * 분석 결과 요약 텍스트 생성
 */
export function generateStyleSummary(analysis: StyleAnalysis): string {
  const { speechPatterns, conversationStyle, honorifics } = analysis;

  const formalityText = {
    formal: '격식체(존댓말)',
    casual: '비격식체(반말)',
    mixed: '혼용',
  }[conversationStyle.formality];

  let summary = `말투 분석 결과:\n`;
  summary += `- 문체: ${formalityText}\n`;
  summary += `- 평균 메시지 길이: ${conversationStyle.averageLength}자\n`;
  summary += `- 응답 패턴: ${conversationStyle.responseTime}\n`;

  if (honorifics.length > 0) {
    summary += `- 주요 호칭: ${honorifics.map(h => h.pattern).join(', ')}\n`;
  }

  if (speechPatterns.endings.length > 0) {
    summary += `- 문장 끝맺음: ${speechPatterns.endings.slice(0, 5).join(', ')}\n`;
  }

  if (speechPatterns.emoticons.length > 0) {
    summary += `- 자주 쓰는 이모티콘: ${speechPatterns.emoticons.slice(0, 5).join(' ')}\n`;
  }

  return summary;
}
