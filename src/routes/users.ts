import { and, ilike, or, sql, eq, getTableColumns, desc } from "drizzle-orm";
import express from "express";
import { user } from "../db/schema";
import { db } from "../db";

const router = express.Router();

//Get all users with optional search, filtering and pagination
router.get("/", async (req, res) => {
	try {
		const { search, role, page, limit } = req.query;
		const pageValue = Array.isArray(page) ? page[0] : page;
		const limitValue = Array.isArray(limit) ? limit[0] : limit;
		const parsedPage = Number.parseInt(String(pageValue ?? "1"), 10);
		const parsedLimit = Number.parseInt(String(limitValue ?? "10"), 10);

		if (
			!Number.isFinite(parsedPage) ||
			parsedPage < 1 ||
			!Number.isFinite(parsedLimit) ||
			parsedLimit < 1
		) {
			return res.status(400).json({ error: "Invalid pagination parameters." });
		}

		const MAX_LIMIT = 100;
		const currentPage = parsedPage;
		const limitPerPage = Math.min(parsedLimit, MAX_LIMIT);

		const offset = (currentPage - 1) * limitPerPage; //how many records to skip to get to the next page

		const filterConditions = [];

		// If search query exists, filter by user name or user email
		if (search) {
			filterConditions.push(
				or(
					ilike(user.name, `%${search}%`),
					ilike(user.email, `%${search}%`),
				),
			);
		}

		//If role filter exists, match role exactly
		if (role) {
			const roleValue = String(role);
			if (roleValue === "student" || roleValue === "teacher" || roleValue === "admin") {
				filterConditions.push(eq(user.role, roleValue as "student" | "teacher" | "admin"));
			}
		}

		// Combine all filters using AND if any exist
		const whereClause =
			filterConditions.length > 0 ? and(...filterConditions) : undefined;

		const countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(user)
			.where(whereClause);

		const totalCount = countResult[0]?.count ?? 0;

		const userList = await db
			.select({
				...getTableColumns(user),
			})
			.from(user)
			.where(whereClause)
			.orderBy(desc(user.createdAt))
			.limit(limitPerPage)
			.offset(offset);

		res.status(200).json({
			data: userList,
			pagination: {
				page: currentPage,
				limit: limitPerPage,
				total: totalCount,
				totalPages: Math.ceil(totalCount / limitPerPage),
			},
		});
	} catch (error) {
		console.error(`GET /users error:${error}`);
		res.status(500).json({
			error: "Failed to get users.",
		});
	}
});

export default router;
