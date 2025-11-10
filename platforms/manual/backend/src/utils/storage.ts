import AWS from 'aws-sdk';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS SDK for MinIO
const s3 = new AWS.S3({
  endpoint: `http://${process.env.MINIO_ENDPOINT}`,
  accessKeyId: process.env.MINIO_ACCESS_KEY,
  secretAccessKey: process.env.MINIO_SECRET_KEY,
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  sslEnabled: process.env.MINIO_USE_SSL === 'true',
});

const bucketName = process.env.MINIO_BUCKET_NAME || 'avatar-platform';

// Initialize bucket
export const initializeBucket = async (): Promise<void> => {
  try {
    const buckets = await s3.listBuckets().promise();
    const bucketExists = buckets.Buckets?.some((b) => b.Name === bucketName);

    if (!bucketExists) {
      await s3.createBucket({ Bucket: bucketName }).promise();
      logger.info(`Created S3 bucket: ${bucketName}`);
    }
  } catch (error) {
    logger.error('Failed to initialize S3 bucket:', error);
    throw error;
  }
};

export interface UploadOptions {
  folder?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export const uploadFile = async (
  buffer: Buffer,
  filename: string,
  options: UploadOptions = {}
): Promise<string> => {
  try {
    const key = options.folder ? `${options.folder}/${filename}` : filename;

    await s3
      .putObject({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
      })
      .promise();

    logger.info(`Uploaded file to S3: ${key}`);
    return key;
  } catch (error) {
    logger.error('Failed to upload file to S3:', error);
    throw error;
  }
};

export const uploadStream = async (
  stream: NodeJS.ReadableStream,
  filename: string,
  options: UploadOptions = {}
): Promise<string> => {
  try {
    const key = options.folder ? `${options.folder}/${filename}` : filename;

    await s3
      .upload({
        Bucket: bucketName,
        Key: key,
        Body: stream,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata,
      })
      .promise();

    logger.info(`Uploaded stream to S3: ${key}`);
    return key;
  } catch (error) {
    logger.error('Failed to upload stream to S3:', error);
    throw error;
  }
};

export const downloadFile = async (key: string): Promise<Buffer> => {
  try {
    const result = await s3
      .getObject({
        Bucket: bucketName,
        Key: key,
      })
      .promise();

    return result.Body as Buffer;
  } catch (error) {
    logger.error(`Failed to download file from S3: ${key}`, error);
    throw error;
  }
};

export const getFileStream = (key: string): NodeJS.ReadableStream => {
  return s3
    .getObject({
      Bucket: bucketName,
      Key: key,
    })
    .createReadStream();
};

export const deleteFile = async (key: string): Promise<void> => {
  try {
    await s3
      .deleteObject({
        Bucket: bucketName,
        Key: key,
      })
      .promise();

    logger.info(`Deleted file from S3: ${key}`);
  } catch (error) {
    logger.error(`Failed to delete file from S3: ${key}`, error);
    throw error;
  }
};

export const getSignedUrl = (key: string, expiresIn: number = 3600): string => {
  return s3.getSignedUrl('getObject', {
    Bucket: bucketName,
    Key: key,
    Expires: expiresIn,
  });
};

export const listFiles = async (prefix?: string): Promise<string[]> => {
  try {
    const result = await s3
      .listObjectsV2({
        Bucket: bucketName,
        Prefix: prefix,
      })
      .promise();

    return result.Contents?.map((obj) => obj.Key || '') || [];
  } catch (error) {
    logger.error('Failed to list files from S3:', error);
    throw error;
  }
};

export const generateUniqueFilename = (originalFilename: string): string => {
  const ext = originalFilename.split('.').pop();
  const uuid = uuidv4();
  return `${uuid}.${ext}`;
};
