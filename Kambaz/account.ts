import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { db, type AccountUser, type User } from "./Database";

declare module "express-session" {
  interface SessionData {
    currentUser?: AccountUser;
  }
}

export const sessionCookieName = "kambaz.sid";
const passwordHashes = new Map<string, { salt: string; hash: Buffer }>();
export const accounts = Router();

function accountView({ _id, username, firstName, lastName, email, role }: User): AccountUser {
  return { _id, username, firstName, lastName, email, role };
}

function passwordMatches(user: User, password: string) {
  const stored = passwordHashes.get(user._id);
  return stored
    ? timingSafeEqual(stored.hash, scryptSync(password, stored.salt, stored.hash.length))
    : user.password === password;
}

function credentials(body: unknown) {
  if (!body || typeof body !== "object" || !("username" in body) || !("password" in body)) return;
  const { username, password } = body;
  if (typeof username !== "string" || typeof password !== "string") return;
  const name = username.trim();
  if (!name || name.length > 100 || !password || password.length > 200) return;
  return { username: name, password };
}

function openSession(request: Request, response: Response, next: NextFunction, user: User, status = 200) {
  request.session.regenerate((error) => {
    if (error) return next(error);
    const currentUser = accountView(user);
    request.session.currentUser = currentUser;
    request.session.save((failure) => {
      if (failure) return next(failure);
      response.status(status).json(currentUser);
    });
  });
}

export function requireSession(request: Request, response: Response, next: NextFunction) {
  if (!request.session.currentUser) {
    response.status(401).json({ error: "Sign in to continue." });
    return;
  }
  next();
}

accounts.post("/signin", (request, response, next) => {
  const values = credentials(request.body);
  const user = values && db.users.find((record) =>
    record.username === values.username && passwordMatches(record, values.password));
  if (!user) {
    response.status(401).json({ error: "Username or password is incorrect." });
    return;
  }
  openSession(request, response, next, user);
});

accounts.post("/signup", (request, response, next) => {
  const values = credentials(request.body);
  if (!values) {
    response.status(400).json({ error: "Enter a valid username and password." });
    return;
  }
  if (db.users.some((record) => record.username === values.username)) {
    response.status(400).json({ error: "That username is already taken." });
    return;
  }
  const user: User = {
    _id: randomUUID(), username: values.username, password: "", role: "STUDENT",
    firstName: "", lastName: "", email: "", loginId: "", section: "", lastActivity: "", totalActivity: "",
  };
  const salt = randomBytes(16).toString("hex");
  passwordHashes.set(user._id, { salt, hash: scryptSync(values.password, salt, 64) });
  db.users.push(user);
  openSession(request, response, next, user, 201);
});

accounts.get("/profile", requireSession, (request, response) => {
  const user = db.users.find(({ _id }) => _id === request.session.currentUser?._id);
  if (!user) {
    response.status(401).json({ error: "Sign in to continue." });
    return;
  }
  response.json(accountView(user));
});

accounts.put("/:userId", requireSession, (request, response, next) => {
  if (request.params.userId !== request.session.currentUser?._id) {
    response.status(403).json({ error: "You can only edit your own profile." });
    return;
  }
  const user = db.users.find(({ _id }) => _id === request.params.userId);
  if (!user) {
    response.status(404).json({ error: "Account not found." });
    return;
  }
  for (const field of ["firstName", "lastName", "email"] as const) {
    if (typeof request.body?.[field] === "string") user[field] = request.body[field];
  }
  request.session.currentUser = accountView(user);
  request.session.save((error) => {
    if (error) return next(error);
    response.json(request.session.currentUser);
  });
});

accounts.post("/signout", (request, response, next) => {
  const { httpOnly, path, sameSite, secure } = request.session.cookie;
  request.session.destroy((error) => {
    if (error) return next(error);
    response.clearCookie(sessionCookieName, { httpOnly, path, sameSite, secure: secure === true });
    response.sendStatus(204);
  });
});
