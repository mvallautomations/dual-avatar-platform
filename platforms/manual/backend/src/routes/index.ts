import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import projectRoutes from './project.routes';
import characterRoutes from './character.routes';
import videoRoutes from './video.routes';
import assetRoutes from './asset.routes';
import transcriptionRoutes from './transcription.routes';
import eyeTrackingRoutes from './eyeTracking.routes';
import timelineRoutes from './timeline.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/characters', characterRoutes);
router.use('/videos', videoRoutes);
router.use('/assets', assetRoutes);
router.use('/transcriptions', transcriptionRoutes);
router.use('/eye-tracking', eyeTrackingRoutes);
router.use('/timeline', timelineRoutes);

export default router;
