import { pipeline, env, FeatureExtractionPipeline } from '@xenova/transformers';

// Configure environment for browser WebAssembly execution
env.allowLocalModels = false;
env.useBrowserCache = true;

let extractor: FeatureExtractionPipeline | null = null;
let isLoading = false;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (extractor) return extractor;
  if (isLoading) {
    // Wait for in-flight initialization
    while (isLoading) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (extractor) return extractor;
  }

  isLoading = true;
  self.postMessage({ type: 'STATUS', status: 'loading', message: 'Downloading all-MiniLM-L6-v2 model...' });

  try {
    extractor = (await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      progress_callback: (progress: { status: string; progress?: number; file?: string }) => {
        if (progress.status === 'progress' && typeof progress.progress === 'number') {
          self.postMessage({
            type: 'PROGRESS',
            progress: Math.round(progress.progress),
            file: progress.file
          });
        }
      }
    })) as unknown as FeatureExtractionPipeline;

    isLoading = false;
    self.postMessage({ type: 'STATUS', status: 'ready', message: 'Model loaded and ready' });
    return extractor;
  } catch (error) {
    isLoading = false;
    const msg = error instanceof Error ? error.message : String(error);
    self.postMessage({ type: 'STATUS', status: 'error', message: msg });
    throw error;
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;

  try {
    if (type === 'INIT') {
      await getExtractor();
      self.postMessage({ id, type: 'INIT_SUCCESS' });
    } else if (type === 'EMBED_TEXT') {
      const pipe = await getExtractor();
      const output = await pipe(payload.text, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data as Float32Array);
      self.postMessage({ id, type: 'EMBED_TEXT_SUCCESS', embedding });
    } else if (type === 'BATCH_EMBED') {
      const pipe = await getExtractor();
      const results: { id: string; embedding: number[] }[] = [];

      for (const item of payload.items) {
        const output = await pipe(item.text, { pooling: 'mean', normalize: true });
        results.push({
          id: item.id,
          embedding: Array.from(output.data as Float32Array)
        });
      }

      self.postMessage({ id, type: 'BATCH_EMBED_SUCCESS', results });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, type: 'ERROR', error: errorMsg });
  }
};
