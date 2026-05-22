import { Router } from "express";
import {
  createSettlement,
  submitFiatSettlement,
  getGroupSettlements,
} from "../controllers/settlement.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.use(verifyJWT);
router.route("/create").post(createSettlement);
router.route("/fiat-submit").post(submitFiatSettlement);
router.route("/group/:groupId").get(getGroupSettlements);
export default router;
