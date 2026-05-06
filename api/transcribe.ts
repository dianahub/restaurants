/**
 * Vercel Function — POST /api/transcribe
 *
 * Accepts base64-encoded audio, uploads to S3, runs AWS Transcribe,
 * polls for completion (max 90s), returns transcript text.
 *
 * Body: { audio: string (base64), format: 'wav' | 'm4a' | 'mp3' }
 * Response: { transcript: string, languageCode: string }
 *
 * Env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SignatureV4 } from '@smithy/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-js';
import crypto from 'crypto';

const REGION = process.env.AWS_REGION ?? 'us-east-1';
const BUCKET = process.env.S3_BUCKET ?? 'seekerapp-restaurant-metadata';

const s3 = new S3Client({ region: REGION });

const transcribeSigner = new SignatureV4({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  region: REGION,
  service: 'transcribe',
  sha256: Sha256,
});

async function signedTranscribeRequest(
  method: 'GET' | 'POST',
  path: string,
  body?: string,
): Promise<Response> {
  const url = new URL(`https://transcribe.${REGION}.amazonaws.com${path}`);
  const headers: Record<string, string> = {
    host: url.hostname,
    'content-type': 'application/json',
  };

  const signed = await transcribeSigner.sign({
    method,
    protocol: 'https:',
    hostname: url.hostname,
    path: url.pathname,
    headers,
    body: body ?? '',
  });

  return fetch(url.toString(), {
    method,
    headers: signed.headers as Record<string, string>,
    body: body ?? undefined,
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { audio, format = 'wav' } = req.body as { audio?: string; format?: string };

  if (!audio) return res.status(400).json({ error: 'Missing audio' });

  const jobId = `seeker-${crypto.randomUUID()}`;
  const s3Key = `transcriptions/${jobId}.${format}`;

  try {
    // Upload audio to S3
    const audioBuffer = Buffer.from(audio, 'base64');
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: s3Key,
        Body: audioBuffer,
        ContentType: `audio/${format}`,
      }),
    );

    const mediaUri = `s3://${BUCKET}/${s3Key}`;
    const outputKey = `transcriptions/${jobId}-result.json`;

    // Start transcription job with auto language detection
    const startRes = await signedTranscribeRequest(
      'POST',
      '/transcription-jobs',
      JSON.stringify({
        TranscriptionJobName: jobId,
        Media: { MediaFileUri: mediaUri },
        MediaFormat: format,
        IdentifyLanguage: true,
        LanguageOptions: ['en-US', 'es-US'],
        OutputBucketName: BUCKET,
        OutputKey: outputKey,
      }),
    );

    if (!startRes.ok) {
      const err = await startRes.text();
      throw new Error(`Transcribe start failed: ${err}`);
    }

    // Poll for job completion (max 90s, every 3s)
    const maxAttempts = 30;
    let transcript = '';
    let languageCode = 'en-US';

    for (let i = 0; i < maxAttempts; i++) {
      await sleep(3000);

      const statusRes = await signedTranscribeRequest('GET', `/transcription-jobs/${jobId}`);
      const statusData = (await statusRes.json()) as {
        TranscriptionJob?: {
          TranscriptionJobStatus: string;
          LanguageCode?: string;
          Transcript?: { TranscriptFileUri?: string };
          FailureReason?: string;
        };
      };

      const job = statusData.TranscriptionJob;
      if (!job) continue;

      if (job.TranscriptionJobStatus === 'FAILED') {
        throw new Error(job.FailureReason ?? 'Transcription failed');
      }

      if (job.TranscriptionJobStatus === 'COMPLETED') {
        languageCode = job.LanguageCode ?? 'en-US';

        // Fetch transcript JSON from S3 via Transcribe's signed URL or directly
        const transcriptUrl = job.Transcript?.TranscriptFileUri;
        if (transcriptUrl) {
          const transcriptRes = await fetch(transcriptUrl);
          const transcriptData = (await transcriptRes.json()) as {
            results?: { transcripts?: Array<{ transcript?: string }> };
          };
          transcript = transcriptData.results?.transcripts?.[0]?.transcript ?? '';
        }
        break;
      }
    }

    if (!transcript) throw new Error('Transcription timed out');

    // Clean up S3 audio file (non-blocking)
    s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key })).catch(() => {});

    return res.status(200).json({ transcript, languageCode });
  } catch (err) {
    console.error('[transcribe] error:', err);
    // Clean up on error (best effort)
    s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key })).catch(() => {});
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Transcription failed' });
  }
}
