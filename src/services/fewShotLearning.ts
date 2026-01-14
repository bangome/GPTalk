/**
 * Few-shot 학습 서비스
 *
 * 실제 대화 예시를 프롬프트에 포함하여 말투를 학습합니다.
 */

import type { ParsedChat, StyleAnalysis } from '../types';

// 대화 쌍 타입
export interface ConversationPair {
  received: string;  // 상대방이 보낸 메시지
  response: string;  // 대상자의 응답
  context?: string[]; // 이전 맥락 (선택)
}

// Few-shot 예시 타입
export interface FewShotExample {
  input: string;
  output: string;
}

/**
 * 대화 기록에서 대화 쌍 추출
 * 상대방 메시지 -> 대상자 응답 패턴을 찾아냅니다.
 */
export function extractConversationPairs(
  parsedChat: ParsedChat,
  maxPairs: number = 20
): ConversationPair[] {
  const pairs: ConversationPair[] = [];
  const { messages, targetSender } = parsedChat;

  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];

    // 상대방 메시지 -> 대상자 응답 패턴
    if (prev.sender !== targetSender && curr.sender === targetSender) {
      // 응답 시간이 너무 길지 않은 경우만 (1시간 이내)
      const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime();
      if (timeDiff < 60 * 60 * 1000 && timeDiff > 0) {
        // 너무 짧은 메시지 제외
        if (prev.content.length >= 2 && curr.content.length >= 2) {
          pairs.push({
            received: prev.content,
            response: curr.content,
          });
        }
      }
    }
  }

  // 다양한 예시를 위해 랜덤하게 선택
  return shuffleAndPick(pairs, maxPairs);
}

/**
 * 연속 응답 패턴 추출
 * 대상자가 연속으로 보낸 메시지 패턴을 찾아냅니다.
 */
export function extractContinuousResponses(
  parsedChat: ParsedChat,
  maxExamples: number = 10
): string[][] {
  const continuousGroups: string[][] = [];
  const { messages, targetSender } = parsedChat;

  let currentGroup: string[] = [];

  for (const msg of messages) {
    if (msg.sender === targetSender) {
      currentGroup.push(msg.content);
    } else {
      if (currentGroup.length >= 2) {
        continuousGroups.push([...currentGroup]);
      }
      currentGroup = [];
    }
  }

  // 마지막 그룹 처리
  if (currentGroup.length >= 2) {
    continuousGroups.push(currentGroup);
  }

  return shuffleAndPick(continuousGroups, maxExamples);
}

/**
 * 특정 상황별 응답 패턴 추출
 */
export function extractSituationalResponses(
  parsedChat: ParsedChat
): Record<string, ConversationPair[]> {
  const pairs = extractConversationPairs(parsedChat, 100);

  const situations: Record<string, ConversationPair[]> = {
    greeting: [],     // 인사
    question: [],     // 질문
    positive: [],     // 긍정적 상황
    negative: [],     // 부정적 상황
    casual: [],       // 일상 대화
  };

  for (const pair of pairs) {
    const received = pair.received.toLowerCase();

    if (/안녕|하이|반가|잘\s?자|좋은\s?아침|좋은\s?밤/.test(received)) {
      situations.greeting.push(pair);
    } else if (/\?|뭐|어디|언제|왜|어떻게|몇/.test(received)) {
      situations.question.push(pair);
    } else if (/좋아|최고|대박|축하|고마|감사|사랑/.test(received)) {
      situations.positive.push(pair);
    } else if (/싫|짜증|화나|슬|힘들|피곤|아프/.test(received)) {
      situations.negative.push(pair);
    } else {
      situations.casual.push(pair);
    }
  }

  // 각 상황별 최대 5개씩
  for (const key of Object.keys(situations)) {
    situations[key] = situations[key].slice(0, 5);
  }

  return situations;
}

/**
 * Few-shot 프롬프트 생성
 */
export function buildFewShotPrompt(
  receivedMessage: string,
  pairs: ConversationPair[],
  styleAnalysis: StyleAnalysis,
  maxExamples: number = 5
): string {
  const examples = pairs.slice(0, maxExamples);

  let prompt = `당신은 특정 사람의 말투를 완벽하게 모방하는 AI입니다.
아래는 이 사람이 실제로 주고받은 대화 예시입니다. 이 말투와 스타일을 정확히 따라해주세요.

`;

  // 스타일 요약 추가
  prompt += `[말투 특징]\n`;
  prompt += `- 문체: ${styleAnalysis.conversationStyle.formality === 'formal' ? '존댓말' : styleAnalysis.conversationStyle.formality === 'casual' ? '반말' : '혼용'}\n`;

  if (styleAnalysis.speechPatterns.endings.length > 0) {
    prompt += `- 끝맺음: ${styleAnalysis.speechPatterns.endings.slice(0, 5).join(', ')}\n`;
  }

  if (styleAnalysis.speechPatterns.emoticons.length > 0) {
    prompt += `- 이모티콘: ${styleAnalysis.speechPatterns.emoticons.slice(0, 5).join(' ')}\n`;
  }

  prompt += `\n[실제 대화 예시]\n`;

  for (let i = 0; i < examples.length; i++) {
    prompt += `예시 ${i + 1}:\n`;
    prompt += `상대방: "${examples[i].received}"\n`;
    prompt += `응답: "${examples[i].response}"\n\n`;
  }

  prompt += `[현재 상황]\n`;
  prompt += `상대방: "${receivedMessage}"\n\n`;
  prompt += `위 예시들의 말투와 스타일을 참고하여 자연스러운 응답을 작성해주세요.\n`;
  prompt += `응답만 작성하고, 설명이나 부가 텍스트는 제외하세요.`;

  return prompt;
}

/**
 * 메시지 보정용 Few-shot 프롬프트 생성
 */
export function buildCorrectionFewShotPrompt(
  originalMessage: string,
  targetExamples: string[],
  styleAnalysis: StyleAnalysis
): string {
  let prompt = `당신은 메시지를 특정 사람의 말투로 변환하는 AI입니다.
아래는 이 사람이 실제로 작성한 메시지 예시입니다.

`;

  prompt += `[실제 작성 예시]\n`;
  for (let i = 0; i < Math.min(targetExamples.length, 10); i++) {
    prompt += `- "${targetExamples[i]}"\n`;
  }

  prompt += `\n[스타일 특징]\n`;
  prompt += `- 문체: ${styleAnalysis.conversationStyle.formality === 'formal' ? '존댓말' : styleAnalysis.conversationStyle.formality === 'casual' ? '반말' : '혼용'}\n`;
  prompt += `- 평균 길이: ${styleAnalysis.conversationStyle.averageLength}자\n`;

  if (styleAnalysis.speechPatterns.endings.length > 0) {
    prompt += `- 끝맺음: ${styleAnalysis.speechPatterns.endings.slice(0, 5).join(', ')}\n`;
  }

  prompt += `\n[변환할 메시지]\n`;
  prompt += `"${originalMessage}"\n\n`;
  prompt += `위 예시들의 말투를 참고하여 메시지를 변환해주세요.\n`;
  prompt += `변환된 메시지만 작성하고, 설명은 제외하세요.`;

  return prompt;
}

/**
 * 대상자의 메시지만 추출
 */
export function extractTargetMessages(
  parsedChat: ParsedChat,
  maxMessages: number = 50
): string[] {
  return parsedChat.messages
    .filter(m => m.isTarget && m.content.length >= 3)
    .map(m => m.content)
    .slice(0, maxMessages);
}

/**
 * 배열 섞기 및 선택
 */
function shuffleAndPick<T>(array: T[], count: number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/**
 * 대화 품질 점수 계산 (학습에 적합한 대화쌍인지)
 */
export function calculatePairQuality(pair: ConversationPair): number {
  let score = 0;

  // 적절한 길이
  if (pair.received.length >= 5 && pair.received.length <= 100) score += 1;
  if (pair.response.length >= 5 && pair.response.length <= 100) score += 1;

  // 의미있는 내용 (단순 ㅇㅇ, ㅋㅋ 제외)
  if (!/^[ㅋㅎㅇㄴ]+$/.test(pair.response)) score += 1;

  // 질문-응답 패턴
  if (pair.received.includes('?')) score += 0.5;

  return score;
}

/**
 * 고품질 대화쌍 선택
 */
export function selectHighQualityPairs(
  pairs: ConversationPair[],
  count: number
): ConversationPair[] {
  return pairs
    .map(pair => ({ pair, score: calculatePairQuality(pair) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ pair }) => pair);
}
