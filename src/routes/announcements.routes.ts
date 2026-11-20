import { Router } from "express";
import authenticate from "../middleware/authenticate.ts";
import {
  validateQuery,
  validateParams,
  validateBody,
} from "../middleware/validate.ts";
import {
  AnnouncementParamsSchema,
  CreateAnnouncementSchema,
  GetAnnouncementsQuerySchema,
  UpdateAnnouncementSchema,
} from "../validators/announcements.validator.ts";
import {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcements.controller.ts";

const router = Router();

router.get(
  "/",
  validateQuery(GetAnnouncementsQuerySchema),
  getAllAnnouncements,
);
router.get(
  "/:id",
  validateParams(AnnouncementParamsSchema),
  getAnnouncementById,
);
router.post(
  "/",
  authenticate,
  validateBody(CreateAnnouncementSchema),
  createAnnouncement,
);
router.patch(
  "/:id",
  authenticate,
  validateParams(AnnouncementParamsSchema),
  validateBody(UpdateAnnouncementSchema),
  updateAnnouncement,
);
router.delete(
  "/:id",
  authenticate,
  validateParams(AnnouncementParamsSchema),
  deleteAnnouncement,
);

export default router;
