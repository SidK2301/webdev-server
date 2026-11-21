import "dotenv/config";
import cors from "cors";
import express from "express";
import { lab5 } from "./Lab5/routes";

const app = express();
app.use(cors());
app.use(express.json());
app.get("/", (_request, response) => {
  response.type("text").send("Welcome to Full Stack Development!");
});
app.use("/lab5", lab5);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`Express listening on port ${port}`));
