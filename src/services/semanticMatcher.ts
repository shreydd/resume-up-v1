import { db } from '../db';
import { Achievement, Experience, MatchedAchievementItem, MatchedExperienceGroup } from '../types';

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error' | 'fallback';

export interface ModelProgressInfo {
  status: ModelStatus;
  progress: number;
  message: string;
}

class SemanticMatcherService {
  private worker: Worker | null = null;
  private status: ModelStatus = 'idle';
  private progress: number = 0;
  private statusMessage: string = 'Offline / In-Memory Matcher active';
  private statusListeners: ((info: ModelProgressInfo) => void)[] = [];
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

  constructor() {
    this.initWorker();
  }

  public subscribeStatus(listener: (info: ModelProgressInfo) => void) {
    this.statusListeners.push(listener);
    listener({ status: this.status, progress: this.progress, message: this.statusMessage });
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  private notifyStatus() {
    for (const listener of this.statusListeners) {
      listener({ status: this.status, progress: this.progress, message: this.statusMessage });
    }
  }

  private initWorker() {
    try {
      if (typeof window === 'undefined') return;

      this.worker = new Worker(new URL('../workers/embedding.worker.ts', import.meta.url), {
        type: 'module'
      });

      this.worker.onmessage = (e: MessageEvent) => {
        const { id, type, status, message, progress, error, embedding, results } = e.data;

        if (type === 'STATUS') {
          this.status = status;
          this.statusMessage = message || '';
          this.notifyStatus();
        } else if (type === 'PROGRESS') {
          this.progress = progress || 0;
          this.statusMessage = `Downloading AI model: ${this.progress}%`;
          this.notifyStatus();
        } else if (id && this.pendingRequests.has(id)) {
          const { resolve, reject } = this.pendingRequests.get(id)!;
          this.pendingRequests.delete(id);

          if (type === 'ERROR') {
            reject(new Error(error || 'Worker request failed'));
          } else if (type === 'EMBED_TEXT_SUCCESS') {
            resolve(embedding);
          } else if (type === 'BATCH_EMBED_SUCCESS') {
            resolve(results);
          } else {
            resolve(e.data);
          }
        }
      };

      this.worker.onerror = (err) => {
        console.warn('Embedding worker error, falling back to smart token matcher:', err);
        this.status = 'fallback';
        this.statusMessage = 'WASM Worker offline, using in-memory semantic matcher';
        this.notifyStatus();
      };
    } catch (err) {
      console.warn('Worker initialization not supported, using fallback:', err);
      this.status = 'fallback';
      this.statusMessage = 'In-memory semantic matcher active';
      this.notifyStatus();
    }
  }

  public triggerModelDownload() {
    if (this.worker && this.status !== 'ready' && this.status !== 'loading') {
      const id = `init-${Date.now()}`;
      this.worker.postMessage({ id, type: 'INIT' });
    }
  }

  private sendWorkerRequest<T>(type: string, payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker || this.status === 'error' || this.status === 'fallback') {
        return reject(new Error('Worker not available'));
      }

      const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      this.pendingRequests.set(id, { resolve, reject });

      // 30s timeout
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Embedding request timed out'));
        }
      }, 30000);

      this.worker.postMessage({ id, type, payload });
      const origResolve = resolve;
      this.pendingRequests.set(id, {
        resolve: (val) => {
          clearTimeout(timer);
          origResolve(val);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }

  public chunkJobDescription(jd: string): string[] {
    if (!jd || !jd.trim()) return [];

    // Split by newlines, bullet characters, semicolons, and sentence delimiters
    const rawLines = jd
      .split(/\r?\n|•|\*|-|;|(?<=[.!?])\s+(?=[A-Z])/)
      .map(line => line.trim())
      .filter(line => line.length > 15); // filter out tiny headers like "Requirements:" or "Benefits"

    // Remove noise lines (e.g. salary, equal opportunity statement)
    const filtered = rawLines.filter(line => {
      const lower = line.toLowerCase();
      if (lower.startsWith('http') || lower.startsWith('www.')) return false;
      if (lower.includes('equal opportunity') || lower.includes('eoe') || lower.includes('affirmative action')) return false;
      if (lower.includes('$') && lower.includes('year') && line.length < 50) return false;
      return true;
    });

    return filtered.length > 0 ? filtered : [jd.trim()];
  }

  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Smart token extraction and TF-IDF / BM25 style keyword scoring
  private tokenize(text: string): string[] {
    const stopWords = new Set([
      'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
      'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could',
      'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
      'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
      'it', 'its', 'itself', 'let\'s', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
      'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
      'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
      'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'were',
      'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself'
    ]);

    // Keep alphanumeric and special tech tokens (e.g. c++, c#, .net, ci/cd)
    return text
      .toLowerCase()
      .replace(/[^a-z0-9+#/.-]/g, ' ')
      .split(/\s+/)
      .map(w => w.replace(/^[.-]+|[.-]+$/g, ''))
      .filter(w => w.length > 1 && !stopWords.has(w));
  }

  public extractKeywords(text: string): string[] {
    const tokens = this.tokenize(text);
    const counts = new Map<string, number>();
    for (const t of tokens) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(e => e[0]);
  }

  public fallbackScore(requirement: string, achievement: string): { score: number; matchedKeywords: string[] } {
    const reqTokens = new Set(this.tokenize(requirement));
    const achTokens = this.tokenize(achievement);

    if (reqTokens.size === 0 || achTokens.length === 0) {
      return { score: 0.1, matchedKeywords: [] };
    }

    const matched: string[] = [];
    let weightedMatches = 0;

    for (const token of achTokens) {
      if (reqTokens.has(token)) {
        if (!matched.includes(token)) {
          matched.push(token);
        }
        // Give higher weight to rarer/longer tech tokens
        weightedMatches += token.length > 5 ? 1.5 : 1.0;
      }
    }

    // Jaccard / Overlap coefficient with semantic boost
    const overlapRatio = weightedMatches / Math.sqrt(reqTokens.size * achTokens.length);
    // Scale between 0.35 and 0.98 for realistic matching UI
    const score = Math.min(0.98, Math.max(0.25, 0.35 + overlapRatio * 0.65));

    return { score, matchedKeywords: matched };
  }

  // Ensure all achievements in DB have embeddings
  public async ensureAchievementsEmbedded(achievements: Achievement[]): Promise<Achievement[]> {
    if (this.status !== 'ready') {
      return achievements; // Return as-is if model not ready yet
    }

    const needEmbedding = achievements.filter(a => !a.embedding || a.embedding.length === 0);
    if (needEmbedding.length === 0) return achievements;

    try {
      const items = needEmbedding.map(a => ({ id: a.id, text: a.originalText }));
      const results = await this.sendWorkerRequest<{ id: string; embedding: number[] }[]>('BATCH_EMBED', { items });

      const updatedMap = new Map<string, number[]>();
      for (const res of results) {
        updatedMap.set(res.id, res.embedding);
        await db.achievements.update(res.id, { embedding: res.embedding });
      }

      return achievements.map(a => ({
        ...a,
        embedding: updatedMap.get(a.id) || a.embedding
      }));
    } catch (err) {
      console.warn('Batch embedding failed, continuing with fallback:', err);
      return achievements;
    }
  }

  // Match all achievements to a given Job Description
  public async matchAchievements(
    jd: string,
    experiences: Experience[],
    allAchievements: Achievement[],
    topPerRole: number = 3
  ): Promise<MatchedExperienceGroup[]> {
    const requirements = this.chunkJobDescription(jd);
    let embeddedAchievements = allAchievements;

    // Try embedding with WASM model if available
    let reqEmbeddings: number[][] | null = null;
    if (this.status === 'ready') {
      try {
        embeddedAchievements = await this.ensureAchievementsEmbedded(allAchievements);
        const reqItems = requirements.map((req, i) => ({ id: `req-${i}`, text: req }));
        const reqResults = await this.sendWorkerRequest<{ id: string; embedding: number[] }[]>('BATCH_EMBED', { items: reqItems });
        reqEmbeddings = reqResults.map(r => r.embedding);
      } catch (err) {
        console.warn('Neural embedding match failed, falling back to token matcher:', err);
        reqEmbeddings = null;
      }
    }

    const groups: MatchedExperienceGroup[] = [];

    for (const exp of experiences) {
      const expAchs = embeddedAchievements.filter(a => a.experienceId === exp.id);
      if (expAchs.length === 0) continue;

      const scoredAchs: MatchedAchievementItem[] = expAchs.map(ach => {
        let bestScore = 0;
        let bestReq = requirements[0] || '';
        let matchedKeywords: string[] = [];

        if (reqEmbeddings && ach.embedding && ach.embedding.length > 0) {
          // Neural embedding cosine similarity
          for (let i = 0; i < reqEmbeddings.length; i++) {
            const sim = this.cosineSimilarity(ach.embedding, reqEmbeddings[i]);
            // Normalize cosine similarity (typically 0.3 - 0.8) to a nice 40% - 98% range
            const normalizedSim = Math.min(0.99, Math.max(0.3, (sim + 0.2) * 0.9));
            if (normalizedSim > bestScore) {
              bestScore = normalizedSim;
              bestReq = requirements[i];
            }
          }
          // Also extract overlapping keywords for explainability
          const tokenRes = this.fallbackScore(bestReq, ach.originalText);
          matchedKeywords = tokenRes.matchedKeywords;
        } else {
          // Intelligent token & keyword matching
          for (const req of requirements) {
            const tokenRes = this.fallbackScore(req, ach.originalText);
            if (tokenRes.score > bestScore) {
              bestScore = tokenRes.score;
              bestReq = req;
              matchedKeywords = tokenRes.matchedKeywords;
            }
          }
        }

        return {
          achievement: ach,
          score: Math.round(bestScore * 100) / 100,
          matchedKeywords,
          bestMatchingRequirement: bestReq,
          included: false // populated below
        };
      });

      // Sort by score descending
      scoredAchs.sort((a, b) => b.score - a.score);

      // Auto-include top N
      scoredAchs.forEach((item, index) => {
        item.included = index < topPerRole;
      });

      groups.push({
        experience: exp,
        matchedAchievements: scoredAchs
      });
    }

    return groups;
  }
}

export const semanticMatcher = new SemanticMatcherService();
