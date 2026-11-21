import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { requireSession } from "./account";
import { findCourse } from "./courses";
import { db, type Assignment } from "./Database";

export const assignments = Router();
const textFields = [
  "title", "description", "due", "available", "group", "displayGradeAs",
  "submissionType", "assignTo", "until", "notes",
] as const;

function assignmentDraft(body: unknown): Partial<Assignment> | null {
  if (!body || typeof body !== "object") return null;
  const values = body as Record<string, unknown>;
  const draft: Partial<Assignment> = {};
  for (const field of textFields) {
    const value = values[field];
    if (value === undefined) continue;
    if (typeof value !== "string") return null;
    draft[field] = field === "title" ? value.trim() : value;
  }
  if (draft.title === "") return null;
  const { points, onlineEntry } = values;
  if (points !== undefined) {
    if (typeof points !== "number" || !Number.isFinite(points) || points < 0) return null;
    draft.points = points;
  }
  if (onlineEntry !== undefined) {
    if (!Array.isArray(onlineEntry) || !onlineEntry.every((entry) => typeof entry === "string")) return null;
    draft.onlineEntry = onlineEntry;
  }
  return draft;
}

function findAssignment(request: Request, response: Response) {
  const courseId = request.params.courseId ?? request.query.courseId;
  const assignment = db.assignments.find((record) =>
    record._id === request.params.assignmentId && (courseId === undefined || record.course === courseId));
  if (!assignment) response.status(404).json({ error: "Assignment not found in this course." });
  return assignment;
}

assignments.get("/courses/:courseId/assignments", (request, response) => {
  const course = findCourse(request, response);
  if (course) response.json(db.assignments.filter((assignment) => assignment.course === course._id));
});

assignments.get("/courses/:courseId/assignments/:assignmentId", (request, response) => {
  const assignment = findAssignment(request, response);
  if (assignment) response.json(assignment);
});

assignments.post("/courses/:courseId/assignments", requireSession, (request, response) => {
  const course = findCourse(request, response);
  if (!course) return;
  const draft = assignmentDraft(request.body);
  if (!draft?.title) {
    response.status(400).json({ error: "Enter a title and valid assignment fields." });
    return;
  }
  const assignment: Assignment = {
    description: "", points: 100, due: "", available: "", ...draft,
    title: draft.title, _id: randomUUID(), course: course._id,
  };
  db.assignments.push(assignment);
  response.status(201).json(assignment);
});

assignments.put("/assignments/:assignmentId", requireSession, (request, response) => {
  const assignment = findAssignment(request, response);
  if (!assignment) return;
  const draft = assignmentDraft(request.body);
  if (!draft) {
    response.status(400).json({ error: "Enter valid assignment fields." });
    return;
  }
  Object.assign(assignment, draft);
  response.json(assignment);
});

assignments.delete("/assignments/:assignmentId", requireSession, (request, response) => {
  const assignment = findAssignment(request, response);
  if (!assignment) return;
  db.assignments.splice(db.assignments.indexOf(assignment), 1);
  response.sendStatus(204);
});
