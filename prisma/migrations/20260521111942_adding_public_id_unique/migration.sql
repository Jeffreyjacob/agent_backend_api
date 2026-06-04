/*
  Warnings:

  - A unique constraint covering the columns `[propertyId,publicId]` on the table `PropertyImage` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PropertyImage_propertyId_publicId_key" ON "PropertyImage"("propertyId", "publicId");
