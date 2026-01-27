import AgentAPI from "apminsight";
AgentAPI.config();

import express from "express";
import subjectsRouter from "./routes/subjects";
import cors from "cors";
import securityMiddleware from "./middleware/security";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { Agent } from "node:http";

const app = express();
const PORT = 8000;

const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) {
	throw new Error("FRONTEND_URL must be set for credentialed CORS.");
}

app.use(
	cors({
		origin: frontendUrl,
		methods: ["GET", "POST", "PUT", "DELETE"],
		credentials: true,
	}),
);

app.all("/api/auth/*splat", toNodeHandler(auth));

// JSON middleware
app.use(express.json());

app.use(securityMiddleware);

app.use("/api/subjects", subjectsRouter);

// Root GET route
app.get("/", (req, res) => {
	res.json({ message: "Welcome to the Classroom Backend API" });
});

// Start server
app.listen(PORT, () => {
	const url = `http://localhost:${PORT}`;
	console.log(`Server is running at ${url}`);
});
