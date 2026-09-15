import "server-only";

import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variable manquante : ${name}`);
  }

  return value;
}

let client: S3Client | undefined;

function getClient() {
  client ??= new S3Client({
    endpoint: requiredEnv("S3_ENDPOINT"),
    region: requiredEnv("S3_REGION"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: requiredEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("S3_SECRET_ACCESS_KEY"),
    },
  });

  return client;
}

export async function uploadPdf(key: string, body: Buffer) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: requiredEnv("S3_BUCKET"),
      Key: key,
      Body: body,
      ContentType: "application/pdf",
      ContentLength: body.length,
    }),
  );
}

export async function deleteStoredFile(key: string) {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: requiredEnv("S3_BUCKET"),
      Key: key,
    }),
  );
}