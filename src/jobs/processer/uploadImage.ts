import { Job } from "bullmq";
import { logger } from "../../config/logger";
import { cloudinary } from "../../config/cloudinary";
import crypto from "crypto";
import { PropertyImageRepository } from "../../module/property/propertyImage.repository";
import { ensureIdempotency } from "../../shared/utils/jobIdempotency";

export interface IUploadImageJobData {
  propertyId: string;
  files: {
    mimeType: string;
    base64: string;
  }[];
}

export const uploadImageProcessor = async (
  job: Job<IUploadImageJobData>,
  propertyImageRepo: PropertyImageRepository,
) => {
  try {
    const { propertyId, files } = job.data;
    const canProceed = await ensureIdempotency(job?.id!);
    if (!canProceed) return;
    const result = await Promise.allSettled(
      files.map(async (file) => {
        const publicId = crypto
          .createHash("sha256")
          .update(`${propertyId}:${file.base64}`)
          .digest("hex");

        return await cloudinary.uploader.upload(
          `data:${file.mimeType};base64,${file.base64}`,
          {
            folder: "real_estate",
            resource_type: "image",
            public_id: publicId,
          },
        );
      }),
    );

    const url = result
      .filter((r) => r.status === "fulfilled")
      .map((r) => ({
        url: r.value.secure_url,
        public_id: r.value.public_id,
      }));

    console.log(url, "completed upload");

    const failedUpload = result.filter((r) => r.status === "rejected");
    console.log(failedUpload, "failed upload");

    if (failedUpload.length > 0) {
      logger.warn(
        { count: failedUpload.length },
        "some images failed to upload",
      );
    }

    const existingBefore = await propertyImageRepo.findByPropertyId(propertyId);
    const isFirstUpload = existingBefore.length === 0;

    await propertyImageRepo.createMany({
      data: url.map((r) => ({
        url: r.url,
        propertyId,
        publicId: r.public_id,
      })),
      skipDuplicates: true,
    });

    if (isFirstUpload) {
      const newImages = await propertyImageRepo.findByPropertyId(propertyId);
      if (newImages.length > 0) {
        await propertyImageRepo.setPrimaryImage(newImages[0].id, propertyId);
      }
    }
  } catch (error: any) {
    logger.warn({ err: error }, "unable to upload image");
    throw error;
  }
};
