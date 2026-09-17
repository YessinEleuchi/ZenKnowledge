import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variable manquante : ${name}`);
  }

  return value;
}

function getBucket() {
  return requiredEnv("S3_BUCKET");
}

let client: S3Client | undefined;

function getClient(): S3Client {
  if (client) {
    return client;
  }

  client = new S3Client({
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

export async function uploadPdf(
  key: string,
  body: Buffer,
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: "application/pdf",
      ContentLength: body.length,
    }),
  );
}

export async function readStoredPdf(
  key: string,
): Promise<Uint8Array> {
  const result = await getClient().send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );

  if (!result.Body) {
    throw new Error(
      `Le fichier stocké est vide : ${key}`,
    );
  }

  return result.Body.transformToByteArray();
}

export async function deleteStoredFile(
  key: string,
): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
}