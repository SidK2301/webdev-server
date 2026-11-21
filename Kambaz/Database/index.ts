import assignments from "./assignments.json";
import courses from "./courses.json";
import enrollments from "./enrollments.json";
import modules from "./modules.json";
import users from "./users.json";

export const db = { assignments, courses, enrollments, modules, users };

export type User = (typeof users)[number];
export type AccountUser = Pick<User, "_id" | "username" | "firstName" | "lastName" | "email" | "role">;
