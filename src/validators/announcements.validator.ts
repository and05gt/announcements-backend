import { z } from "zod";
import { registry } from "../openapi.ts";

export const AnnouncementParamsSchema = registry.register(
  "AnnouncementParams",
  z.object({
    id: z.coerce.number().int().positive(),
  }),
);

export const CreateAnnouncementSchema = registry.register(
  "CreateAnnouncement",
  z.object({
    title: z.string().min(5).max(50),
    description: z.string().min(10),
    price: z.coerce.number().int().positive(),
    category: z.enum(["sale", "service", "job", "other"]),
    image: z
      .custom<Express.Multer.File>()
      .optional()
      .nullable()
      .openapi({ type: "string", format: "binary" }),
  }),
);

export const UpdateAnnouncementSchema = registry.register(
  "UpdateAnnouncement",
  CreateAnnouncementSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    {
      error: "At least one field must be provided",
    },
  ),
);

export const GetAnnouncementsQuerySchema = registry.register(
  "GetAnnouncementsQuery",
  z.object({
    page: z.coerce.number().int().positive().optional(),
    sort: z.enum(["newest", "oldest"]).optional(),
    search: z
      .string()
      .trim()
      .transform((value) => (value === "" ? undefined : value))
      .optional(),
  }),
);

export type AnnouncementParams = z.infer<typeof AnnouncementParamsSchema>;
export type CreateAnnouncement = z.infer<typeof CreateAnnouncementSchema>;
export type UpdateAnnouncement = z.infer<typeof UpdateAnnouncementSchema>;
export type GetAnnouncementsQuery = z.infer<typeof GetAnnouncementsQuerySchema>;

registry.registerPath({
  method: "get",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Get all announcements with pagination, filtering and sorting",
  request: {
    query: GetAnnouncementsQuerySchema,
  },
  responses: {
    200: { description: "List of announcements with pagination metadata" },
  },
});

registry.registerPath({
  method: "get",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Get announcement by ID",
  request: {
    params: AnnouncementParamsSchema,
  },
  responses: {
    200: { description: "Announcement retrieved successfully" },
    404: { description: "Announcement not found" },
  },
});

registry.registerPath({
  method: "post",
  path: "/announcements",
  tags: ["Announcements"],
  summary: "Create new announcement",
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        "multipart/form-data": {
          schema: CreateAnnouncementSchema,
        },
      },
    },
  },
  responses: {
    201: { description: "Announcement created successfully" },
    401: { description: "Authentication required" },
    422: { description: "Validation error" },
  },
});

registry.registerPath({
  method: "patch",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Update announcement",
  security: [{ bearerAuth: [] }],
  request: {
    params: AnnouncementParamsSchema,
    body: {
      content: {
        "multipart/form-data": { schema: UpdateAnnouncementSchema },
      },
    },
  },
  responses: {
    200: { description: "Announcement updated successfully" },
    401: { description: "Authentication required" },
    403: { description: "Access denied" },
    404: { description: "Announcement not found" },
    422: { description: "Validation error" },
  },
});

registry.registerPath({
  method: "delete",
  path: "/announcements/{id}",
  tags: ["Announcements"],
  summary: "Delete announcement",
  security: [{ bearerAuth: [] }],
  request: {
    params: AnnouncementParamsSchema,
  },
  responses: {
    204: { description: "Announcement deleted successfully" },
    401: { description: "Authentication required" },
    403: { description: "Access denied" },
    404: { description: "Announcement not found" },
  },
});
