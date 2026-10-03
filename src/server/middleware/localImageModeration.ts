import type { NextFunction, Request, Response } from 'express';
import {
  ImageModerationError,
  moderateImageLocally,
  type ImageModerationMode,
  type LocalImageModerationResult,
} from '../services/localImageModeration';

type ImageModerationHandler = (
  image: unknown,
  mode: ImageModerationMode
) => Promise<LocalImageModerationResult>;

const moderationRoutes: Record<string, ImageModerationMode> = {
  '/api/ai/private-detector': 'chat',
  '/api/check-nsfw': 'profile',
  '/api/moderation/photo': 'profile',
};

export function createLocalImageModerationMiddleware(
  moderateImage: ImageModerationHandler = moderateImageLocally
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'POST') return next();

    const route = moderationRoutes[req.originalUrl.split('?')[0]];
    if (!route) return next();

    try {
      const result = await moderateImage(req.body?.imageBase64, route);
      return res.json(result);
    } catch (error) {
      if (error instanceof ImageModerationError) {
        if (error.status === 503) console.error('Local image moderation unavailable:', error);
        return res.status(error.status).json({
          error: error.message,
          capability: 'server-local-image-moderation',
          architecture: 'bavel-internal',
          externalProvider: false,
        });
      }
      return next(error);
    }
  };
}
