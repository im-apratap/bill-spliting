import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  getPendingRequests,
} from "../controllers/friend.controller.js";
const router = express.Router();
router.use(verifyJWT); 
router.route("/").get(getFriends);
router.route("/requests").get(getPendingRequests);
router.route("/send-request").post(sendFriendRequest);
router.route("/accept-request").post(acceptFriendRequest);
router.route("/decline-request").post(declineFriendRequest);
export default router;
