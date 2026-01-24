import { and, ilike, or, sql, eq, getTableColumns, desc } from "drizzle-orm";
import express from "express";
import { departments, subjects } from "../db/schema";
import { db } from "../db";

const router = express.Router();

//Get all subjects with optional search, filtering and pagination
router.get("/", async (req, res) => {
	try {
		const { search, department, page, limit } = req.query;
		const pageValue = Array.isArray(page) ? page[0] : page;
		const limitValue = Array.isArray(limit) ? limit[0] : limit;
		const parsedPage = Number.parseInt(pageValue ?? "1", 10);
		const parsedLimit = Number.parseInt(limitValue ?? "10", 10);

		if (!Number.isFinite(parsedPage) || parsedPage < 1 || !Number.isFinite(parsedLimit) || parsedLimit < 1) {
			return res.status(400).json({ error: "Invalid pagination parameters." });
		}

		const MAX_LIMIT = 100;
		const currentPage = parsedPage;
		const limitPerPage = Math.min(parsedLimit, MAX_LIMIT);

		const offset = (currentPage - 1) * limitPerPage; //how many records to skip to get to the next page

		const filterConditions = [];

		// If search query exists, filter by subject name or subject code
		if (search) {
			filterConditions.push(
				or(
					ilike(subjects.name, `%${search}%`),
					ilike(subjects.code, `%${search}%`),
				),
			);
		}

		//If department filter exists, match department name
		if (department) {
			filterConditions.push(ilike(departments.name, `%${department}%`));
		}

		// Combine all filters using AND if any exist
		const whereClause =
			filterConditions.length > 0 ? and(...filterConditions) : undefined;

		const countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(subjects)
			.leftJoin(departments, eq(subjects.departmentId, departments.id))
			.where(whereClause);

		const totalCount = countResult[0]?.count ?? 0;

		const subjectList = await db
			.select({
				...getTableColumns(subjects),
				department: { ...getTableColumns(departments) },
			})
			.from(subjects)
			.leftJoin(departments, eq(subjects.departmentId, departments.id))
			.where(whereClause)
			.orderBy(desc(subjects.createdAt))
			.limit(limitPerPage)
			.offset(offset);

		res.status(200).json({
			data: subjectList,
			pagination: {
				page: currentPage,
				limit: limitPerPage,
				total: totalCount,
				totalPages: Math.ceil(totalCount / limitPerPage),
			},
		});
	} catch (error) {
		console.error(`GET /subjects error:${error}`);
		res.status(500).json({
			error: "Failed to get subjects.",
		});
	}
});

export default router;
