import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { requireSession } from "./account";
import { db } from "./Database";

type Course = (typeof db.courses)[number];
const courseFields = ["name", "number", "startDate", "endDate", "department", "description", "image", "term"] as const;
export const courses = Router();
export const courseModules = Router();

function findCourse(request: Request, response: Response) {
  const course = db.courses.find(({ _id }) => _id === request.params.courseId);
  if (!course) response.status(404).json({ error: "Course not found." });
  return course;
}

function updateCourse(course: Course, body: Request["body"]) {
  for (const field of courseFields) {
    if (typeof body?.[field] === "string") course[field] = body[field].trim();
  }
  if (typeof body?.credits === "number" && Number.isFinite(body.credits)) course.credits = body.credits;
}

function removeMatching<T>(records: T[], match: (record: T) => boolean) {
  for (let index = records.length - 1; index >= 0; index--) {
    if (match(records[index])) records.splice(index, 1);
  }
}

courses.get("/courses", (_request, response) => response.json(db.courses));
courses.get("/users/current/courses", requireSession, (request, response) => {
  const userId = request.session.currentUser?._id;
  const enrolledIds = new Set(db.enrollments.filter(({ user }) => user === userId).map(({ course }) => course));
  response.json(db.courses.filter(({ _id }) => enrolledIds.has(_id)));
});
courses.get("/courses/:courseId", (request, response) => {
  const course = findCourse(request, response);
  if (course) response.json(course);
});

courses.post(["/courses", "/users/current/courses"], requireSession, (request, response) => {
  const user = request.session.currentUser!;
  if (typeof request.body?.name !== "string" || !request.body.name.trim()) {
    response.status(400).json({ error: "Course name is required." });
    return;
  }
  const course: Course = {
    _id: randomUUID(), name: "", number: "", startDate: "", endDate: "",
    department: "", credits: 0, description: "", image: "/images/reactjs.jpg", term: "",
  };
  updateCourse(course, request.body);
  db.courses.push(course);
  db.enrollments.push({ _id: randomUUID(), user: user._id, course: course._id });
  response.status(201).json(course);
});

courses.put("/courses/:courseId", requireSession, (request, response) => {
  const course = findCourse(request, response);
  if (!course) return;
  if (request.body?.name !== undefined && (typeof request.body.name !== "string" || !request.body.name.trim())) {
    response.status(400).json({ error: "Course name is required." });
    return;
  }
  updateCourse(course, request.body);
  response.json(course);
});

courses.delete("/courses/:courseId", requireSession, (request, response) => {
  const course = findCourse(request, response);
  if (!course) return;
  db.courses.splice(db.courses.indexOf(course), 1);
  removeMatching(db.enrollments, (record) => record.course === course._id);
  removeMatching(db.modules, (record) => record.course === course._id);
  removeMatching(db.assignments, (record) => record.course === course._id);
  response.sendStatus(204);
});

courseModules.get("/courses/:courseId/modules", (request, response) => {
  const course = findCourse(request, response);
  if (course) response.json(db.modules.filter((record) => record.course === course._id));
});

courseModules.post("/courses/:courseId/modules", requireSession, (request, response) => {
  const course = findCourse(request, response);
  if (!course) return;
  const { name, description } = request.body ?? {};
  if (typeof name !== "string" || !name.trim()) {
    response.status(400).json({ error: "Module name is required." });
    return;
  }
  const module = {
    _id: randomUUID(), name: name.trim(), description: typeof description === "string" ? description : "",
    course: course._id, lessons: [],
  };
  db.modules.push(module);
  response.status(201).json(module);
});

courseModules.put("/modules/:moduleId", requireSession, (request, response) => {
  const module = db.modules.find(({ _id }) => _id === request.params.moduleId);
  if (!module) {
    response.status(404).json({ error: "Module not found." });
    return;
  }
  const { name, description } = request.body ?? {};
  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    response.status(400).json({ error: "Module name is required." });
    return;
  }
  if (typeof name === "string") module.name = name.trim();
  if (typeof description === "string") module.description = description;
  response.json(module);
});

courseModules.delete("/modules/:moduleId", requireSession, (request, response) => {
  const index = db.modules.findIndex(({ _id }) => _id === request.params.moduleId);
  if (index < 0) {
    response.status(404).json({ error: "Module not found." });
    return;
  }
  db.modules.splice(index, 1);
  response.sendStatus(204);
});
