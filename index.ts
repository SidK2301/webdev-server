import "dotenv/config";
import cors from "cors";
import express from "express";
import session from "express-session";
import { accounts, sessionCookieName } from "./Kambaz/account";
import { assignments } from "./Kambaz/assignments";
import { enrollments } from "./Kambaz/enrollments";
import { courses, courseModules } from "./Kambaz/courses";
import { lab5 } from "./Lab5/routes";

const app = express();
const production = process.env.SERVER_ENV === "production";
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3000";
const secret = process.env.SESSION_SECRET;
if (production && !secret) throw new Error("SESSION_SECRET is required in production.");

if (production) app.set("trust proxy", 1);
app.use(cors({ origin: clientUrl, credentials: true }));
app.use(express.json());
app.get("/", (_request, response) => {
  response.type("text").send("Welcome to Full Stack Development!");
});
app.use("/lab5", lab5);

app.use("/api", (request, response, next) => {
  const origin = request.get("Origin");
  if (origin && origin !== clientUrl && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    response.status(403).json({ error: "This origin cannot change Kambaz data." });
    return;
  }
  next();
});
app.use("/api", session({
  name: sessionCookieName,
  secret: secret ?? "local-kambaz-session",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: production, sameSite: production ? "none" : "lax" },
}));
app.use("/api/users", accounts);
app.use("/api", courses, courseModules, assignments, enrollments);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`Express listening on port ${port}`));
