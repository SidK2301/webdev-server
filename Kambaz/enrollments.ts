import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requireSession } from "./account";
import { findCourse } from "./courses";
import { db } from "./Database";

export const enrollments = Router();

enrollments.get("/courses/:courseId/users", (request, response) => {
  const course = findCourse(request, response);
  if (!course) return;
  const enrolledIds = new Set(db.enrollments.filter((record) => record.course === course._id).map(({ user }) => user));
  const roster = db.users.filter(({ _id }) => enrolledIds.has(_id)).map(({
    _id, firstName, lastName, loginId, section, role, lastActivity, totalActivity,
  }) => ({ _id, firstName, lastName, loginId, section, role, lastActivity, totalActivity }));
  response.json(roster);
});

enrollments.route("/users/:uid/courses/:courseId")
  .all(requireSession, (request, response, next) => {
    const userId = request.session.currentUser?._id;
    if (request.params.uid !== "current" && request.params.uid !== userId) {
      response.status(403).json({ error: "You can only change your own enrollment." });
      return;
    }
    next();
  })
  .post((request, response) => {
    const course = findCourse(request, response);
    if (!course) return;
    const user = request.session.currentUser!._id;
    const existing = db.enrollments.find((record) => record.user === user && record.course === course._id);
    if (existing) {
      response.json(existing);
      return;
    }
    const enrollment = { _id: randomUUID(), user, course: course._id };
    db.enrollments.push(enrollment);
    response.status(201).json(enrollment);
  })
  .delete((request, response) => {
    const course = findCourse(request, response);
    if (!course) return;
    const user = request.session.currentUser?._id;
    const index = db.enrollments.findIndex((record) => record.user === user && record.course === course._id);
    if (index >= 0) db.enrollments.splice(index, 1);
    response.sendStatus(204);
  });
