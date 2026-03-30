import { Router, type IRouter } from "express";
import healthRouter from "./health";
import courseRouter from "./course";
import scorecardsRouter from "./scorecards";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/course", courseRouter);
router.use("/scorecards", scorecardsRouter);

export default router;
