/**
 * Vercel Function — /api/restaurant
 *
 * Actions (POST body.action):
 *   upload-metadata  → upload NFT metadata JSON to S3, return URI
 *   create           → save restaurant record to DynamoDB
 *   update           → update existing restaurant in DynamoDB
 *   translate        → Claude auto-translate name/description
 *
 * GET ?action=nearby&lat=&lng=&radius=  → DynamoDB bounding-box query
 *
 * Env vars (set in Vercel dashboard):
 *   ANTHROPIC_API_KEY
 *   AWS_REGION              e.g. us-east-1
 *   AWS_ACCESS_KEY_ID
 *   AWS_SECRET_ACCESS_KEY
 *   S3_BUCKET               seekerapp-restaurant-metadata
 *   DYNAMODB_TABLE          seekerapp-restaurants
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

// ---------------------------------------------------------------------------
// AWS clients
// ---------------------------------------------------------------------------

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'us-east-1' });
const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'us-east-1' }),
);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const S3_BUCKET = process.env.S3_BUCKET ?? 'seekerapp-restaurant-metadata';
const DYNAMO_TABLE = process.env.DYNAMODB_TABLE ?? 'seekerapp-restaurants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function uploadMetadata(name: string, metadata: object): Promise<string> {
  const key = `restaurants/${Date.now()}-${name.replace(/\s+/g, '-').toLowerCase()}.json`;
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: JSON.stringify(metadata),
      ContentType: 'application/json',
      ACL: 'public-read' as never,
    }),
  );
  return `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
}

async function translateText(text: string, targetLang: 'en' | 'es'): Promise<string> {
  const langName = targetLang === 'es' ? 'Spanish' : 'English';
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `Translate the following restaurant text to ${langName}. Return only the translation, no explanation, no quotes.\n\n${text}`,
      },
    ],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text.trim() : text;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET /api/restaurant?action=nearby ──────────────────────────────────
  if (req.method === 'GET') {
    const { action, lat, lng, radius } = req.query as Record<string, string>;
    if (action !== 'nearby' || !lat || !lng || !radius) {
      return res.status(400).json({ error: 'Missing params' });
    }

    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    const radiusN = parseFloat(radius);
    // Rough bounding box (1° lat ≈ 111km)
    const deg = radiusN / 111;

    const result = await dynamo.send(
      new ScanCommand({
        TableName: DYNAMO_TABLE,
        FilterExpression:
          '#lat BETWEEN :latMin AND :latMax AND #lng BETWEEN :lngMin AND :lngMax',
        ExpressionAttributeNames: { '#lat': 'lat', '#lng': 'lng' },
        ExpressionAttributeValues: {
          ':latMin': latN - deg,
          ':latMax': latN + deg,
          ':lngMin': lngN - deg,
          ':lngMax': lngN + deg,
        },
      }),
    );

    return res.status(200).json({ restaurants: result.Items ?? [] });
  }

  // ── POST /api/restaurant ───────────────────────────────────────────────
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body as {
    action: string;
    name?: string;
    metadata?: object;
    restaurant?: object;
    nftAddress?: string;
    updates?: object;
    text?: string;
    targetLang?: 'en' | 'es';
    name_en?: string;
    name_es?: string;
    description_en?: string;
    description_es?: string;
  };

  switch (body.action) {
    case 'upload-metadata': {
      if (!body.name || !body.metadata) return res.status(400).json({ error: 'Missing fields' });
      const uri = await uploadMetadata(body.name, body.metadata);
      return res.status(200).json({ uri });
    }

    case 'create': {
      if (!body.restaurant) return res.status(400).json({ error: 'Missing restaurant' });
      await dynamo.send(
        new PutCommand({ TableName: DYNAMO_TABLE, Item: body.restaurant as Record<string, unknown> }),
      );
      return res.status(200).json({ ok: true });
    }

    case 'update': {
      if (!body.nftAddress || !body.updates) return res.status(400).json({ error: 'Missing fields' });
      const updates = body.updates as Record<string, unknown>;
      const keys = Object.keys(updates).filter((k) => k !== 'nftAddress');
      const expr = 'SET ' + keys.map((k) => `#${k} = :${k}`).join(', ');
      const names = Object.fromEntries(keys.map((k) => [`#${k}`, k]));
      const values = Object.fromEntries(keys.map((k) => [`:${k}`, updates[k]]));

      await dynamo.send(
        new UpdateCommand({
          TableName: DYNAMO_TABLE,
          Key: { nftAddress: body.nftAddress },
          UpdateExpression: expr,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        }),
      );
      return res.status(200).json({ ok: true });
    }

    case 'translate': {
      if (!body.targetLang) return res.status(400).json({ error: 'Missing targetLang' });
      const results: Record<string, string> = {};

      if (body.name_en && body.targetLang === 'es') {
        results.name_es = await translateText(body.name_en, 'es');
      } else if (body.name_es && body.targetLang === 'en') {
        results.name_en = await translateText(body.name_es, 'en');
      }

      if (body.description_en && body.targetLang === 'es') {
        results.description_es = await translateText(body.description_en, 'es');
      } else if (body.description_es && body.targetLang === 'en') {
        results.description_en = await translateText(body.description_es, 'en');
      }

      return res.status(200).json(results);
    }

    default:
      return res.status(400).json({ error: `Unknown action: ${body.action}` });
  }
}
