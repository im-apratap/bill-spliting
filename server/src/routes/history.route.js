import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getUserHistory } from "../controllers/history.controller.js";
const router = express.Router();
router.use(verifyJWT);
router.route("/").get(getUserHistory);
export default router;
