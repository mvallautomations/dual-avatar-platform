import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  duplicateProject,
} from '../controllers/project.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.post(
  '/',
  [body('title').trim().notEmpty(), body('description').optional().trim()],
  createProject
);

router.get('/', getProjects);

router.get('/:id', [param('id').isUUID()], getProject);

router.put(
  '/:id',
  [
    param('id').isUUID(),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
  ],
  updateProject
);

router.delete('/:id', [param('id').isUUID()], deleteProject);

router.post('/:id/duplicate', [param('id').isUUID()], duplicateProject);

export default router;
