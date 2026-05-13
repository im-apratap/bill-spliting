import { Router } from "express";
import {
  addExpense,
  getGroupExpenses,
  getGroupBalances,
  deleteExpense,
  getExpense,
  updateExpense,
} from "../controllers/expense.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();
router.use(verifyJWT);
router.route("/").post(addExpense);
router.route("/group/:groupId").get(getGroupExpenses);
router.route("/balances/:groupId").get(getGroupBalances);
router
  .route("/:expenseId")
  .get(getExpense)
  .put(updateExpense)
  .delete(deleteExpense);
export default router;
