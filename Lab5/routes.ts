import { Router, type Request, type Response } from "express";

export const lab5 = Router();

const operations = {
  add: (a: number, b: number) => a + b,
  subtract: (a: number, b: number) => a - b,
  multiply: (a: number, b: number) => a * b,
  divide: (a: number, b: number) => a / b,
};

function calculate(response: Response, operation: unknown, left: unknown, right: unknown) {
  if (typeof left !== "string" || typeof right !== "string" || !left.trim() || !right.trim()) {
    return response.status(400).send("Two operands are required");
  }
  const a = Number(left);
  const b = Number(right);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return response.status(400).send("Operands must be finite numbers");
  }
  if (typeof operation !== "string" || !Object.hasOwn(operations, operation)) {
    return response.status(400).send("Unknown operation");
  }
  const result = operations[operation as keyof typeof operations](a, b);
  return response.type("text").send(result.toString());
}

lab5.get("/welcome", (_request, response) => response.type("text").send("Welcome to Lab 5"));
for (const operation of Object.keys(operations)) {
  lab5.get(`/${operation}/:a/:b`, (request, response) => {
    calculate(response, operation, request.params.a, request.params.b);
  });
}
lab5.get("/calculator", (request, response) => {
  const { operation, a, b } = request.query;
  calculate(response, operation, a, b);
});

const assignment = {
  id: 1,
  title: "NodeJS Assignment",
  description: "Build an Express API",
  due: "2026-11-29",
  completed: false,
  score: 0,
};

const module = {
  id: "M101",
  name: "RESTful Web APIs",
  description: "Read and write data over HTTP",
  course: "RS105",
};

lab5.get("/assignment", (_request, response) => response.json(assignment));
lab5.get("/assignment/title", (_request, response) => response.json(assignment.title));
lab5.get("/assignment/title/:title", (request, response) => {
  assignment.title = request.params.title;
  response.json(assignment);
});
lab5.get("/assignment/score/:score", (request, response) => {
  const score = Number(request.params.score);
  if (!Number.isFinite(score)) {
    response.status(400).json({ error: "Invalid score" });
    return;
  }
  assignment.score = score;
  response.json(assignment);
});
lab5.get("/assignment/completed/:completed", (request, response) => {
  const { completed } = request.params;
  if (completed !== "true" && completed !== "false") {
    response.status(400).json({ error: "Completed must be true or false" });
    return;
  }
  assignment.completed = completed === "true";
  response.json(assignment);
});
lab5.get("/module", (_request, response) => response.json(module));
lab5.get("/module/name", (_request, response) => response.json(module.name));
lab5.get("/module/name/:name", (request, response) => {
  module.name = request.params.name;
  response.json(module);
});
lab5.get("/module/description/:description", (request, response) => {
  module.description = request.params.description;
  response.json(module);
});

type Todo = { id: number; title: string; completed: boolean; description: string };
const todos: Todo[] = [
  { id: 1, title: "Learn Express", completed: true, description: "Start an HTTP server" },
  { id: 2, title: "Practice requests", completed: false, description: "Try path and query parameters" },
  { id: 3, title: "Fetch remote data", completed: true, description: "Load JSON with Axios" },
];
let nextId = 4;

function createTodo(fields: Partial<Omit<Todo, "id">> = {}) {
  const todo = { id: nextId++, title: "New Task", description: "", completed: false, ...fields };
  todos.push(todo);
  return todo;
}

function todoFields(body: Request["body"]): Partial<Omit<Todo, "id">> {
  const fields: Partial<Omit<Todo, "id">> = {};
  if (typeof body?.title === "string") fields.title = body.title;
  if (typeof body?.description === "string") fields.description = body.description;
  if (typeof body?.completed === "boolean") fields.completed = body.completed;
  return fields;
}

function withTodo(callback: (todo: Todo, request: Request, response: Response) => void) {
  return (request: Request, response: Response) => {
    const todo = todos.find((item) => item.id === Number(request.params.id));
    if (!todo) {
      response.status(404).json({ error: "Todo not found" });
      return;
    }
    callback(todo, request, response);
  };
}

lab5.get("/todos", (request, response) => {
  const { completed } = request.query;
  response.json(completed === "true" || completed === "false"
    ? todos.filter((todo) => todo.completed === (completed === "true"))
    : todos);
});
lab5.get("/todos/create", (_request, response) => {
  createTodo();
  response.json(todos);
});
lab5.get("/todos/:id", withTodo((todo, _request, response) => {
  response.json(todo);
}));
lab5.get("/todos/:id/delete", withTodo((todo, _request, response) => {
  todos.splice(todos.indexOf(todo), 1);
  response.json(todos);
}));
for (const field of ["title", "description"] as const) {
  lab5.get(`/todos/:id/${field}/:value`, withTodo((todo, request, response) => {
    todo[field] = String(request.params.value);
    response.json(todos);
  }));
}
lab5.get("/todos/:id/completed/:value", withTodo((todo, request, response) => {
  const { value } = request.params;
  if (value !== "true" && value !== "false") {
    response.status(400).json({ error: "Completed must be true or false" });
    return;
  }
  todo.completed = value === "true";
  response.json(todos);
}));
lab5.post("/todos", (request, response) => {
  response.status(201).json(createTodo(todoFields(request.body)));
});
lab5.put("/todos/:id", withTodo((todo, request, response) => {
  Object.assign(todo, todoFields(request.body));
  response.json(todo);
}));
lab5.delete("/todos/:id", withTodo((todo, _request, response) => {
  todos.splice(todos.indexOf(todo), 1);
  response.sendStatus(204);
}));
