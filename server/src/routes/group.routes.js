import { Router } from "express";
import {
  createGroup,
  getUserGroups,
  getGroupById,
  addMember,
  removeMember,
} from "../controllers/group.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();
router.use(verifyJWT);
router.route("/").post(createGroup).get(getUserGroups);
router.route("/:groupId").get(getGroupById);
router.route("/:groupId/members").post(addMember);
router.route("/:groupId/members/:userId").delete(removeMember);
export default router;
