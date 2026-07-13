import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { EdgeTTS } from 'edge-tts-universal';
import { DEFAULT_COMMENTARY_VOICE } from './src/audio/commentaryTtsConfig';

interface TtsRequestBody {
  text?: string;
  voice?: string;
}

function readJsonBody(req: IncomingMessage): Promise<TtsRequestBody> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? (JSON.parse(raw) as TtsRequestBody) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export function commentaryTtsApiPlugin(): Plugin {
  return {
    name: 'commentary-tts-api',
    configureServer(server) {
      server.middlewares.use('/api/tts', async (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        const response = res as ServerResponse;
        try {
          const body = await readJsonBody(req);
          const text = body.text?.trim();
          if (!text) {
            response.statusCode = 400;
            response.end('Missing text');
            return;
          }

          const voice = body.voice?.trim() || DEFAULT_COMMENTARY_VOICE;
          const tts = new EdgeTTS(text, voice);
          const result = await tts.synthesize();
          const buffer = Buffer.from(await result.audio.arrayBuffer());

          response.statusCode = 200;
          response.setHeader('Content-Type', 'audio/mpeg');
          response.setHeader('Cache-Control', 'public, max-age=86400');
          response.end(buffer);
        } catch (error) {
          console.error('[commentary-tts]', error);
          response.statusCode = 500;
          response.end('TTS synthesis failed');
        }
      });
    },
  };
}
