import { Router } from "express";
import {
  login,
  logout,
  getMe,
  refresh,
  register,
} from "../controllers/auth.controller.ts";
import authenticate from "../middleware/authenticate.ts";
import { validateBody } from "../middleware/validate.ts";
import { RegisterSchema, LoginSchema } from "../validators/auth.validator.ts";

const router = Router();

router.post("/register", validateBody(RegisterSchema), register);
router.post("/login", validateBody(LoginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);

export default router;
