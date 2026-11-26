import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  logout,
  getMe,
  refresh,
  register,
} from "../controllers/auth.controller.ts";
import authenticate from "../middleware/authenticate.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenBodySchema,
} from "../validators/auth.validator.ts";

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
router.use(limiter);

router.post("/register", validateBody(RegisterSchema), register);
router.post("/login", validateBody(LoginSchema), login);
router.post("/refresh", validateBody(RefreshTokenBodySchema), refresh);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);

export default router;
