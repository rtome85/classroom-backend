import express from "express";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";

import { db } from "../db/index.js";
import {
	classes,
	departments,
	enrollments,
	subjects,
	user,
} from "../db/schema/index.js";

const router = express.Router();

// Get all departments with optional search and pagination
router.get("/", async (req, res) => {
	try {
		const { search, page, limit } = req.query;

		const pageParam = Array.isArray(page) ? page[0] : page;
		const limitParam = Array.isArray(limit) ? limit[0] : limit;
		const parsedPage = Number.parseInt(String(pageParam ?? "1"), 10);
		const parsedLimit = Number.parseInt(String(limitParam ?? "10"), 10);

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
		const searchTerm = typeof search === "string" ? search.trim() : undefined;

		const offset = (currentPage - 1) * limitPerPage;

		const filterConditions = [];

		if (searchTerm) {
			filterConditions.push(
				or(
					ilike(departments.name, `%${searchTerm}%`),
					ilike(departments.code, `%${searchTerm}%`),
				),
			);
		}

		const whereClause =
			filterConditions.length > 0 ? and(...filterConditions) : undefined;

		const countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(departments)
			.where(whereClause);

		const totalCount = countResult[0]?.count ?? 0;

		const departmentsList = await db
			.select({
				...getTableColumns(departments),
				totalSubjects: sql<number>`count(${subjects.id})`,
			})
			.from(departments)
			.leftJoin(subjects, eq(departments.id, subjects.departmentId))
			.where(whereClause)
			.groupBy(departments.id)
			.orderBy(desc(departments.createdAt))
			.limit(limitPerPage)
			.offset(offset);

		res.status(200).json({
			data: departmentsList,
			pagination: {
				page: currentPage,
				limit: limitPerPage,
				total: totalCount,
				totalPages: Math.ceil(totalCount / limitPerPage),
			},
		});
	} catch (error) {
		console.error("GET /departments error:", error);
		res.status(500).json({ error: "Failed to fetch departments" });
	}
});

export default router;
