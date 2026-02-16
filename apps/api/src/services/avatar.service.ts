import { v2 as cloudinary } from "cloudinary";
import { AppError } from "../middlewares/errorHandler";
import { env } from "../utils/env";

const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const AVATAR_FOLDER = "gamebox/avatars";
const FINAL_AVATAR_SIZE = 256;

let cloudinaryConfigured = false;

export type AvatarUploadFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
};

export type AvatarCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AvatarUploadResult = {
  publicId: string;
  originalUrl: string;
};

function parseCloudinaryUrl(value: string): { cloudName: string; apiKey: string; apiSecret: string } | null {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "cloudinary:") {
      return null;
    }

    const cloudName = parsed.hostname.trim();
    const apiKey = decodeURIComponent(parsed.username).trim();
    const apiSecret = decodeURIComponent(parsed.password).trim();

    if (!cloudName || !apiKey || !apiSecret) {
      return null;
    }

    return { cloudName, apiKey, apiSecret };
  } catch {
    return null;
  }
}

function resolveCloudinaryCredentials():
  | { cloudName: string; apiKey: string; apiSecret: string }
  | null {
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    return {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      apiSecret: env.CLOUDINARY_API_SECRET
    };
  }

  if (!env.CLOUDINARY_URL) {
    return null;
  }

  return parseCloudinaryUrl(env.CLOUDINARY_URL);
}

function ensureCloudinaryConfigured(): void {
  if (cloudinaryConfigured) {
    return;
  }

  const credentials = resolveCloudinaryCredentials();
  if (!credentials) {
    throw new AppError(
      503,
      "Upload de avatar indisponível. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({
    cloud_name: credentials.cloudName,
    api_key: credentials.apiKey,
    api_secret: credentials.apiSecret,
    secure: true
  });

  cloudinaryConfigured = true;
}

function assertValidAvatarFile(file: AvatarUploadFile): void {
  if (!file.buffer || file.buffer.length === 0) {
    throw new AppError(400, "Arquivo de avatar inválido.");
  }

  if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
    throw new AppError(400, "Formato inválido. Envie JPG, PNG ou WEBP.");
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new AppError(400, "Imagem muito grande. Limite de 2MB.");
  }
}

function buildAvatarUploadPublicId(userId: string): string {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  return `${AVATAR_FOLDER}/${safeUserId}-${Date.now()}`;
}

export function isValidAvatarPublicIdForUser(publicId: string, userId: string): boolean {
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  return publicId.startsWith(`${AVATAR_FOLDER}/${safeUserId}-`);
}

export function normalizeAvatarCrop(crop: AvatarCrop): AvatarCrop {
  const toInt = (value: number) => Math.max(0, Math.floor(value));

  return {
    x: toInt(crop.x),
    y: toInt(crop.y),
    width: Math.max(1, toInt(crop.width)),
    height: Math.max(1, toInt(crop.height))
  };
}

export async function uploadAvatarOriginalToCloudinary(
  userId: string,
  file: AvatarUploadFile
): Promise<AvatarUploadResult> {
  assertValidAvatarFile(file);
  ensureCloudinaryConfigured();

  const uploadResult = await new Promise<{ public_id?: string; secure_url?: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          public_id: buildAvatarUploadPublicId(userId),
          overwrite: false,
          resource_type: "image"
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result ?? {});
        }
      );

      stream.end(file.buffer);
    }
  ).catch(() => {
    throw new AppError(502, "Falha ao enviar avatar para o Cloudinary.");
  });

  if (!uploadResult.public_id || !uploadResult.secure_url) {
    throw new AppError(502, "Falha ao obter identificador do avatar.");
  }

  return {
    publicId: uploadResult.public_id,
    originalUrl: uploadResult.secure_url
  };
}

export function buildAvatarUrl(publicId: string, crop: AvatarCrop): string {
  ensureCloudinaryConfigured();

  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      {
        crop: "crop",
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height
      },
      {
        crop: "fill",
        width: FINAL_AVATAR_SIZE,
        height: FINAL_AVATAR_SIZE,
        gravity: "north_west",
        quality: "auto",
        fetch_format: "auto"
      }
    ]
  });
}

export async function destroyAvatarAsset(publicId: string): Promise<void> {
  if (!publicId) {
    return;
  }

  ensureCloudinaryConfigured();

  try {
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: "image"
    });
  } catch {
    // Non-blocking cleanup.
  }
}
