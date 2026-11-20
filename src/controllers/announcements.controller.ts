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
  const { title, description, price, category } = req.body;

  const announcement = await prisma.announcement.create({
    data: {
      title,
      description,
      price,
      category,
      userId: Number(req.user!.sub),
    },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      category: true,
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

  res.status(201).json(announcement);
};

export const updateAnnouncement = async (
  req: Request<AnnouncementParams, {}, UpdateAnnouncement>,
  res: Response,
) => {
  const { id } = req.params;

  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  if (announcement.userId !== Number(req.user!.sub)) {
    throw createHttpError(403, "Access denied");
  }

  const { title, description, price, category } = req.body;

  const updatedData: Prisma.AnnouncementUpdateInput = {
    title,
    description,
    price,
    category,
  };

  const updated = await prisma.announcement.update({
    where: { id },
    data: updatedData,
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      category: true,
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

  res.status(200).json(updated);
};

export const deleteAnnouncement = async (
  req: Request<AnnouncementParams>,
  res: Response,
) => {
  const { id } = req.params;

  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    throw createHttpError(404, "Announcement not found");
  }

  if (announcement.userId !== Number(req.user!.sub)) {
    throw createHttpError(403, "Access denied");
  }

  await prisma.announcement.delete({
    where: { id },
  });

  res.status(204).end();
};
