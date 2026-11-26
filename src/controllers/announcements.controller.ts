import fs from "node:fs/promises";
import type { Request, Response } from "express";
import createHttpError from "http-errors";
import prisma from "../../prisma/client.ts";
import type { Prisma } from "../../generated/prisma/client.ts";
import type {
  AnnouncementParams,
  CreateAnnouncement,
  UpdateAnnouncement,
  GetAnnouncementsQuery,
} from "../validators/announcements.validator.ts";
import { uploadToCloudinary } from "../middleware/upload.ts";
import logger from "../logger.ts";

const PER_PAGE = 10;

export const getAllAnnouncements = async (
  _req: Request,
  res: Response<any, { query: GetAnnouncementsQuery }>,
) => {
  const { page = 1, sort = "newest", search } = res.locals.query;
  const skip = (page - 1) * PER_PAGE;

  const where: Prisma.AnnouncementWhereInput = search
    ? {
        title: {
          contains: search,
          mode: "insensitive",
        },
      }
    : {};

  const orderBy: Prisma.AnnouncementOrderByWithRelationInput = {
    createdAt: sort === "oldest" ? "asc" : "desc",
  };

  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      skip,
      take: PER_PAGE,
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
      },
    }),
    prisma.announcement.count({ where }),
  ]);

  res.status(200).json({
    data: announcements,
    pagination: {
      total,
      page,
      totalPages: Math.ceil(total / PER_PAGE),
      perPage: PER_PAGE,
    },
  });
};

export const getAnnouncementById = async (
  req: Request<AnnouncementParams>,
  res: Response,
) => {
  const { id } = req.params;

  const announcement = await prisma.announcement.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      category: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  res.status(200).json(announcement);
};

export const createAnnouncement = async (
  req: Request<{}, {}, CreateAnnouncement>,
  res: Response,
) => {
  try {
    const { title, description, price, category } = req.body;
    const userId = Number(req.user!.sub);

    let imageUrl: string | undefined;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.path);

      logger.info(
        { userId, imageUrl },
        "Announcement photo uploaded successfully",
      );
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        description,
        price,
        category,
        imageUrl,
        userId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
      },
    });

    logger.info(
      { userId, announcementId: announcement.id },
      "Announcement created successfully",
    );

    res.status(201).json(announcement);
  } catch (err) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    throw err;
  }
};

export const updateAnnouncement = async (
  req: Request<AnnouncementParams, {}, UpdateAnnouncement>,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const userId = Number(req.user!.sub);

    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      throw createHttpError(404, "Announcement not found");
    }

    if (announcement.userId !== userId) {
      throw createHttpError(403, "Access denied");
    }

    const { title, description, price, category } = req.body;

    const updatedData: Prisma.AnnouncementUpdateInput = {
      title,
      description,
      price,
      category,
    };

    let imageUrl: string | undefined;
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.path);

      logger.info({ userId, imageUrl }, "Announcement photo uploaded");
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...updatedData,
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
          },
        },
      },
    });

    logger.info(
      { userId, announcementId: announcement.id },
      "Announcement updated",
    );

    res.status(200).json(updated);
  } catch (err) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    throw err;
  }
};

export const deleteAnnouncement = async (
  req: Request<AnnouncementParams>,
  res: Response,
) => {
  const { id } = req.params;
  const userId = Number(req.user!.sub);

  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  if (announcement.userId !== userId) {
    throw createHttpError(403, "Access denied");
  }

  await prisma.announcement.delete({
    where: { id },
  });

  logger.info(
    { userId, announcementId: announcement.id },
    "Announcement deleted successfully",
  );

  res.status(204).end();
};
