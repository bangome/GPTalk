import type { StyleAnalysis } from '../types';

/**
 * 말투 스타일을 프롬프트용 텍스트로 변환
 */
function styleToPromptContext(analysis: StyleAnalysis): string {
  const { speechPatterns, conversationStyle, honorifics, emotionalPatterns } = analysis;

  let context = `[말투 스타일 가이드]\n`;

  // 격식체 여부
  const formalityGuide = {
    formal: '존댓말을 사용합니다. 문장을 "~요", "~습니다"로 끝냅니다.',
    casual: '반말을 사용합니다. 편하게 말합니다.',
    mixed: '상황에 따라 존댓말과 반말을 섞어 씁니다.',
  }[conversationStyle.formality];
  context += `1. 문체: ${formalityGuide}\n`;

  // 문장 끝맺음
  if (speechPatterns.endings.length > 0) {
    context += `2. 문장 끝맺음 스타일: "${speechPatterns.endings.slice(0, 5).join('", "')}" 등을 자주 사용합니다.\n`;
  }

  // 호칭
  if (honorifics.length > 0) {
    context += `3. 호칭: "${honorifics.map(h => h.pattern).join('", "')}" 같은 호칭을 사용합니다.\n`;
  }

  // 이모티콘
  if (speechPatterns.emoticons.length > 0) {
    context += `4. 이모티콘: ${speechPatterns.emoticons.slice(0, 5).join(' ')} 등을 자주 사용합니다.\n`;
  }

  // 자주 쓰는 표현
  if (speechPatterns.expressions.length > 0) {
    context += `5. 자주 쓰는 표현: "${speechPatterns.expressions.slice(0, 5).join('", "')}" 등\n`;
  }

  // 메시지 길이
  context += `6. 메시지 길이: 평균 ${conversationStyle.averageLength}자 정도로 작성합니다.\n`;

  // 감정 표현
  if (emotionalPatterns.positive.length > 0) {
    context += `7. 긍정 표현: "${emotionalPatterns.positive.join('", "')}" 등을 사용합니다.\n`;
  }

  return context;
}

/**
 * 답변 생성 요청
 */
export interface GenerateResponseParams {
  receivedMessage: string;
  context?: string[];
  styleAnalysis: StyleAnalysis;
  apiKey?: string;
}

/**
 * 메시지 보정 요청
 */
export interface CorrectMessageParams {
  originalMessage: string;
  styleAnalysis: StyleAnalysis;
  correctionType: 'full' | 'partial';
  apiKey?: string;
}

/**
 * 답변 생성 (외부 API 호출용 프롬프트 생성)
 */
export function buildGeneratePrompt(params: GenerateResponseParams): string {
  const { receivedMessage, context, styleAnalysis } = params;
  const styleContext = styleToPromptContext(styleAnalysis);

  let prompt = `당신은 특정 사람의 말투를 완벽하게 모방하는 AI입니다.
아래의 말투 스타일 가이드를 참고하여, 받은 메시지에 대한 자연스러운 답변을 작성해주세요.

${styleContext}

`;

  if (context && context.length > 0) {
    prompt += `[이전 대화 맥락]\n`;
    context.forEach((msg, i) => {
      prompt += `${i + 1}. ${msg}\n`;
    });
    prompt += `\n`;
  }

  prompt += `[받은 메시지]\n"${receivedMessage}"\n\n`;
  prompt += `[지시사항]\n`;
  prompt += `- 위 말투 스타일을 정확히 따라 답변을 작성하세요.\n`;
  prompt += `- 자연스럽고 일상적인 대화처럼 작성하세요.\n`;
  prompt += `- 답변만 작성하고, 설명이나 부가 텍스트는 제외하세요.\n`;

  return prompt;
}

/**
 * 메시지 보정 프롬프트 생성
 */
export function buildCorrectionPrompt(params: CorrectMessageParams): string {
  const { originalMessage, styleAnalysis, correctionType } = params;
  const styleContext = styleToPromptContext(styleAnalysis);

  let prompt = `당신은 메시지를 특정 말투 스타일로 변환하는 AI입니다.
아래의 말투 스타일 가이드를 참고하여, 원본 메시지를 해당 스타일로 보정해주세요.

${styleContext}

[원본 메시지]
"${originalMessage}"

[보정 유형]
${correctionType === 'full' ? '전체 보정: 문장 구조와 표현을 완전히 변환합니다.' : '부분 보정: 핵심 내용은 유지하면서 말투만 변환합니다.'}

[지시사항]
- 원본 메시지의 의미는 유지하세요.
- 위 말투 스타일을 정확히 따라 변환하세요.
- 보정된 메시지만 작성하고, 설명이나 부가 텍스트는 제외하세요.
`;

  return prompt;
}

/**
 * 로컬 규칙 기반 간단한 답변 생성 (API 없이 사용)
 */
export function generateSimpleResponse(
  receivedMessage: string,
  styleAnalysis: StyleAnalysis
): string {
  const { speechPatterns, conversationStyle } = styleAnalysis;

  // 기본 응답 템플릿
  const templates = {
    greeting: ['안녕', '하이', '반가워', '오랜만이야'],
    acknowledgment: ['응', '그래', '알겠어', 'ㅇㅇ', '오키'],
    question: ['왜?', '뭔데?', '어디서?', '언제?'],
    positive: ['좋아', '굿', '오케이', '그러자'],
    negative: ['아 그래?', '음...', '글쎄', '잘 모르겠어'],
  };

  // 받은 메시지 분석
  const isQuestion = receivedMessage.includes('?') || /[뭐어디언제왜]/.test(receivedMessage);
  const isGreeting = /안녕|하이|반가|오랜만/.test(receivedMessage);

  let baseResponse: string;

  if (isGreeting) {
    baseResponse = templates.greeting[Math.floor(Math.random() * templates.greeting.length)];
  } else if (isQuestion) {
    baseResponse = templates.acknowledgment[Math.floor(Math.random() * templates.acknowledgment.length)];
  } else {
    baseResponse = templates.positive[Math.floor(Math.random() * templates.positive.length)];
  }

  // 격식체 변환
  if (conversationStyle.formality === 'formal') {
    const formalMap: Record<string, string> = {
      '안녕': '안녕하세요',
      '하이': '안녕하세요',
      '응': '네',
      '그래': '그래요',
      '알겠어': '알겠어요',
      'ㅇㅇ': '네네',
      '좋아': '좋아요',
      '굿': '좋네요',
    };
    baseResponse = formalMap[baseResponse] || baseResponse + '요';
  }

  // 이모티콘 추가
  if (speechPatterns.emoticons.length > 0 && Math.random() > 0.5) {
    const emoticon = speechPatterns.emoticons[0];
    baseResponse += ` ${emoticon}`;
  }

  // 문장 끝맺음 추가
  if (speechPatterns.endings.length > 0 && Math.random() > 0.7) {
    const ending = speechPatterns.endings.find(e => /[ㅋㅎ]/.test(e));
    if (ending) {
      baseResponse += ending;
    }
  }

  return baseResponse;
}

/**
 * 로컬 규칙 기반 메시지 보정 (API 없이 사용)
 */
export function correctMessageSimple(
  originalMessage: string,
  styleAnalysis: StyleAnalysis
): string {
  const { speechPatterns, conversationStyle } = styleAnalysis;

  let corrected = originalMessage;

  // 격식체 변환
  if (conversationStyle.formality === 'formal') {
    // 반말 -> 존댓말
    corrected = corrected
      .replace(/야$/, '요')
      .replace(/어$/, '어요')
      .replace(/아$/, '아요')
      .replace(/지$/, '죠')
      .replace(/래$/, '래요')
      .replace(/해$/, '해요')
      .replace(/다$/, '다요');
  } else if (conversationStyle.formality === 'casual') {
    // 존댓말 -> 반말
    corrected = corrected
      .replace(/요$/, '')
      .replace(/습니다$/, '어')
      .replace(/합니다$/, '해')
      .replace(/세요$/, '세');
  }

  // 자주 쓰는 이모티콘 추가
  if (speechPatterns.emoticons.length > 0) {
    const emoticon = speechPatterns.emoticons[0];
    if (!corrected.includes(emoticon) && Math.random() > 0.5) {
      corrected += ` ${emoticon}`;
    }
  }

  return corrected;
}

/**
 * 외부 AI API 호출 (OpenAI 호환 형식)
 */
export async function callAIAPI(
  prompt: string,
  apiKey: string,
  apiUrl: string = 'https://api.openai.com/v1/chat/completions'
): Promise<string> {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`API 호출 실패: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * 답변 생성 (API 또는 로컬)
 */
export async function generateResponse(
  params: GenerateResponseParams
): Promise<string> {
  const { apiKey } = params;

  if (apiKey) {
    const prompt = buildGeneratePrompt(params);
    return callAIAPI(prompt, apiKey);
  }

  // API 키가 없으면 간단한 로컬 규칙 기반 응답
  return generateSimpleResponse(params.receivedMessage, params.styleAnalysis);
}

/**
 * 메시지 보정 (API 또는 로컬)
 */
export async function correctMessage(
  params: CorrectMessageParams
): Promise<string> {
  const { apiKey } = params;

  if (apiKey) {
    const prompt = buildCorrectionPrompt(params);
    return callAIAPI(prompt, apiKey);
  }

  // API 키가 없으면 간단한 로컬 규칙 기반 보정
  return correctMessageSimple(params.originalMessage, params.styleAnalysis);
}
