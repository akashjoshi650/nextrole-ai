import { Router } from "express";
import { getAllJobs } from "../controller/jobsController.js";

const router = Router();

// GET /api/jobs
router.route("/").get(getAllJobs);

export default router;
