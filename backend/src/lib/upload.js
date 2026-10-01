import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { HttpError } from '../http.js';

const defaultDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

export function uploadsDir() {
  return process.env.UPLOADS_DIR || defaultDir;
}

export function ensureUploadsDir() {
  fs.mkdirSync(uploadsDir(), { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDir();
    cb(null, uploadsDir());
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const allowed = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
]);

const uploader = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowed.has(file.mimetype)) {
      cb(new HttpError(400, 'Upload a PNG, JPEG, WEBP, GIF, SVG, or PDF.', 'FILE_TYPE'));
      return;
    }
    cb(null, true);
  },
});

export function uploadFile(req, res, next) {
  uploader.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      next(new HttpError(400, 'Files must be 10 MB or smaller.', 'FILE_TOO_LARGE'));
      return;
    }
    next(err);
  });
}

export function removeUploaded(file) {
  if (!file?.path) return;
  fs.promises.unlink(file.path).catch(() => {});
}
