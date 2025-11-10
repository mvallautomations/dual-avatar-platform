import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import projectRoutes from './project.routes';
import characterRoutes from './character.routes';
import videoRoutes from './video.routes';
import assetRoutes from './asset.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/characters', characterRoutes);
router.use('/videos', videoRoutes);
router.use('/assets', assetRoutes);

export default router;
