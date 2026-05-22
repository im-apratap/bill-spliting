import { Router } from "express";
import { scanBill } from "../controllers/bill.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.use(verifyJWT);
router.route("/scan").post(scanBill);
export default router;
