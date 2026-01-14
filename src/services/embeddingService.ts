/**
 * 임베딩 기반 유사도 매칭 서비스
 *
 * 대화 스타일을 벡터화하여 유사한 상황의 응답을 찾습니다.
 */

import type { ConversationPair } from './fewShotLearning';

// 임베딩 벡터 타입
export type EmbeddingVector = number[];

// 임베딩된 대화쌍
export interface EmbeddedPair {
  pair: ConversationPair;
  embedding: EmbeddingVector;
}

// 임베딩 저장소
export interface EmbeddingStore {
  pairs: EmbeddedPair[];
  createdAt: Date;
  model: string;
}

// 캐시 (메모리)
let embeddingCache: Map<string, EmbeddingVector> = new Map();

/**
 * OpenAI Embeddings API 호출
 */
export async function getEmbedding(
  text: string,
  apiKey: string,
  model: string = 'text-embedding-3-small'
): Promise<EmbeddingVector> {
  // 캐시 확인
  const cacheKey = `${model}:${text}`;
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API 오류: ${response.status}`);
  }

  const data = await response.json();
  const embedding = data.data[0].embedding as EmbeddingVector;

  // 캐시 저장
  embeddingCache.set(cacheKey, embedding);

  return embedding;
}

/**
 * 여러 텍스트의 임베딩을 한번에 가져오기
 */
export async function getEmbeddings(
  texts: string[],
  apiKey: string,
  model: string = 'text-embedding-3-small'
): Promise<EmbeddingVector[]> {
  // 빈 텍스트 필터링
  const validTexts = texts.filter(t => t.trim().length > 0);

  if (validTexts.length === 0) {
    return [];
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: validTexts,
      model,
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding API 오류: ${response.status}`);
  }

  const data = await response.json();
  return data.data.map((d: { embedding: EmbeddingVector }) => d.embedding);
}

/**
 * 코사인 유사도 계산
 */
export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length !== b.length) {
    throw new Error('벡터 차원이 일치하지 않습니다');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 대화쌍 임베딩 생성
 */
export async function embedConversationPairs(
  pairs: ConversationPair[],
  apiKey: string
): Promise<EmbeddedPair[]> {
  // 받은 메시지들만 임베딩
  const receivedMessages = pairs.map(p => p.received);
  const embeddings = await getEmbeddings(receivedMessages, apiKey);

  return pairs.map((pair, i) => ({
    pair,
    embedding: embeddings[i],
  }));
}

/**
 * 가장 유사한 대화쌍 찾기
 */
export async function findSimilarPairs(
  query: string,
  embeddedPairs: EmbeddedPair[],
  apiKey: string,
  topK: number = 5
): Promise<{ pair: ConversationPair; similarity: number }[]> {
  const queryEmbedding = await getEmbedding(query, apiKey);

  const similarities = embeddedPairs.map(ep => ({
    pair: ep.pair,
    similarity: cosineSimilarity(queryEmbedding, ep.embedding),
  }));

  // 유사도 순으로 정렬
  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, topK);
}

/**
 * 임베딩 스토어 생성
 */
export async function createEmbeddingStore(
  pairs: ConversationPair[],
  apiKey: string
): Promise<EmbeddingStore> {
  const embeddedPairs = await embedConversationPairs(pairs, apiKey);

  return {
    pairs: embeddedPairs,
    createdAt: new Date(),
    model: 'text-embedding-3-small',
  };
}

/**
 * 로컬 저장소에 임베딩 스토어 저장
 */
export function saveEmbeddingStore(store: EmbeddingStore): void {
  try {
    localStorage.setItem('gptalk_embedding_store', JSON.stringify(store));
  } catch (e) {
    console.error('임베딩 스토어 저장 실패:', e);
  }
}

/**
 * 로컬 저장소에서 임베딩 스토어 로드
 */
export function loadEmbeddingStore(): EmbeddingStore | null {
  try {
    const data = localStorage.getItem('gptalk_embedding_store');
    if (!data) return null;

    const store = JSON.parse(data);
    store.createdAt = new Date(store.createdAt);
    return store;
  } catch (e) {
    console.error('임베딩 스토어 로드 실패:', e);
    return null;
  }
}

/**
 * 캐시 클리어
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * 간단한 TF-IDF 기반 유사도 (API 없이 사용)
 * OpenAI API 키가 없을 때 폴백으로 사용
 */
export function simpleSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * 간단한 유사 대화쌍 찾기 (API 없이)
 */
export function findSimilarPairsSimple(
  query: string,
  pairs: ConversationPair[],
  topK: number = 5
): { pair: ConversationPair; similarity: number }[] {
  const similarities = pairs.map(pair => ({
    pair,
    similarity: simpleSimilarity(query, pair.received),
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, topK);
}

/**
 * 키워드 기반 유사 대화쌍 찾기
 */
export function findPairsByKeywords(
  query: string,
  pairs: ConversationPair[]
): ConversationPair[] {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length >= 2);

  if (queryWords.length === 0) {
    return pairs.slice(0, 5);
  }

  return pairs.filter(pair => {
    const receivedLower = pair.received.toLowerCase();
    return queryWords.some(word => receivedLower.includes(word));
  }).slice(0, 10);
}
