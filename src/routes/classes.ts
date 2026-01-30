import { and, ilike, or, sql, eq, getTableColumns, desc } from "drizzle-orm";
import express from "express";
import { db } from "../db";
import { classes, subjects, user, departments } from "../db/schema";

const router = express.Router();

// Get all classes with optional search, filtering and pagination
router.get("/", async (req, res) => {
	try {
		const { search, subject, teacher, page, limit } = req.query;
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

		const offset = (currentPage - 1) * limitPerPage;

		const filterConditions = [];

		if (search) {
			filterConditions.push(
				or(
					ilike(classes.name, `%${search}%`),
					ilike(classes.inviteCode, `%${search}%`),
				),
			);
		}

		if (subject) {
			filterConditions.push(ilike(subjects.name, `%${subject}%`));
		}

		if (teacher) {
			filterConditions.push(ilike(user.name, `%${teacher}%`));
		}

		const whereClause =
			filterConditions.length > 0 ? and(...filterConditions) : undefined;

		const countResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(classes)
			.leftJoin(subjects, eq(classes.subjectId, subjects.id))
			.leftJoin(user, eq(classes.teacherId, user.id))
			.where(whereClause);

		const totalCount = countResult[0]?.count ?? 0;

		const classList = await db
			.select({
				...getTableColumns(classes),
				subject: { ...getTableColumns(subjects) },
				teacher: { ...getTableColumns(user) },
			})
			.from(classes)
			.leftJoin(subjects, eq(classes.subjectId, subjects.id))
			.leftJoin(user, eq(classes.teacherId, user.id))
			.where(whereClause)
			.orderBy(desc(classes.createdAt))
			.limit(limitPerPage)
			.offset(offset);

		res.status(200).json({
			data: classList,
			pagination: {
				page: currentPage,
				limit: limitPerPage,
				total: totalCount,
				totalPages: Math.ceil(totalCount / limitPerPage),
			},
		});
	} catch (error) {
		console.error(`GET /classes error:${error}`);
		res.status(500).json({
			error: "Failed to get classes.",
		});
	}
});

// Gets the class details with teacher, subject and department
router.get("/:id", async (req, res) => {
	try {
		const classId = Number(req.params.id);

		if (!Number.isFinite(classId))
			return res.status(400).json({ error: "No class found." });

		const [classDetails] = await db
			.select({
				...getTableColumns(classes),
				subject: {
					...getTableColumns(subjects),
				},
				department: {
					...getTableColumns(departments),
				},
				teacher: {
					...getTableColumns(user),
				},
			})
			.from(classes)
			.leftJoin(subjects, eq(classes.subjectId, subjects.id))
			.leftJoin(user, eq(classes.teacherId, user.id))
			.leftJoin(departments, eq(subjects.departmentId, departments.id))
			.where(eq(classes.id, classId));

		if (!classDetails)
			return res.status(404).json({ error: "No Class found." });

		res.status(200).json({ data: classDetails });
	} catch (error) {
		console.error(`GET /classes/:id error ${error}`);
		res.status(500).json({ error: "Failed to get class." });
	}
});

router.post("/", async (req, res) => {
	try {
		const [createdClass] = await db
			.insert(classes)
			.values({
				...req.body,
				inviteCode: Math.random().toString(36).substring(2, 9),
				schedules: [],
			})
			.returning({ id: classes.id });

		if (!createdClass) throw Error;

		res.status(201).json({ data: createdClass });
	} catch (error) {
		console.error(`POST /classes error ${error}`);
		res.status(500).json({ error: error });
	}
});

export default router;
