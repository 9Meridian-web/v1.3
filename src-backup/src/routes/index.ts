import { Router } from "express";

import authRoutes from "./authRoutes";
import clientRoutes from "./clientRoutes";
import serviceRoutes from "./servicesRoutes";
import bookingRoutes from "./bookingRoutes";
import googleRoutes from "./googleRoutes";
import businessSettingsRoutes from "./businessSettingsRoutes";
import aiRoutes from "./aiRoutes";

const router = Router();

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

router.use("/auth", authRoutes);

router.use("/clients", clientRoutes);

router.use("/services", serviceRoutes);

router.use("/bookings", bookingRoutes);

router.use("/google", googleRoutes);

router.use("/business-settings", businessSettingsRoutes);

router.use("/ai", aiRoutes);

export default router;