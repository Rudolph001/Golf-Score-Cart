import { Router, type IRouter } from "express";
import healthRouter from "./health";
import courseRouter from "./course";
import scorecardsRouter from "./scorecards";
import wifiRouter from "./wifi";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/course", courseRouter);
router.use("/scorecards", scorecardsRouter);
router.use("/wifi", wifiRouter);

export default router;
