import { relations } from "drizzle-orm";
import {
	boolean,
	pgEnum,
	pgTable,
	text,
	timestamp,
	varchar,
	index,
	unique,
} from "drizzle-orm/pg-core";

const timestamps = {
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
};

// Role enum for user roles
export const roleEnum = pgEnum("role", ["student", "teacher", "admin"]);

// User table
export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: varchar("name", { length: 255 }).notNull(),
	email: varchar("email", { length: 255 }).notNull(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: varchar("image", { length: 500 }),
	role: roleEnum("role").notNull().default("student"),
	imageCldPubId: text("image_cld_pub_id"),
	...timestamps,
});

// Session table
export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		token: text("token").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		ipAddress: varchar("ip_address", { length: 45 }),
		userAgent: text("user_agent"),
		...timestamps,
	},
	(table) => ({
		userIdIdx: index("session_user_id_idx").on(table.userId),
		tokenUnique: unique("session_token_unique").on(table.token),
	}),
);

// Account table
export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accountId: text("account_id").notNull(),
		providerId: varchar("provider_id", { length: 100 }).notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		idToken: text("id_token"),
		password: text("password"),
		...timestamps,
	},
	(table) => ({
		userIdIdx: index("account_user_id_idx").on(table.userId),
		accountIdUnique: unique("account_account_id_unique").on(
			table.accountId,
			table.providerId,
		),
	}),
);

// Verification table
export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		...timestamps,
	},
	(table) => ({
		identifierIdx: index("verification_identifier_idx").on(table.identifier),
	}),
);

// Relations
export const userRelations = relations(user, ({ many }) => ({
	sessions: many(session),
	accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

// Type exports
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;
