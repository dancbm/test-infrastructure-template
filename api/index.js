import express from "express";
import serverless from "serverless-http";
import cors from "cors";

import { fetchTasks, createTasks, updateTasks, deleteTasks } from "./task.js";

const app = express();
const port = 3001;

if (process.env.DEVELOPMENT) {
    app.use(cors());
}

app.use(express.json());

app.get("/", (_, res) => {
    res.send("Hello World!");
});

app.get("/task", async (_, res) => {
    try {
        const tasks = await fetchTasks();

        res.send(tasks.Items);
    } catch (error) {
        res.status(400).send(`Error fetching tasks: ${error}`);
    }
});

app.post("/task", async (req, res) => {
    try {
        const task = req.body;

        const response = await createTasks(task);

        res.send(response);
    } catch (error) {
        res.status(400).send(`Error creating tasks: ${error}`);
    }
});

app.put("/task", async (req, res) => {
    try {
        const task = req.body;

        const response = await updateTasks(task);

        res.send(response);
    } catch (error) {
        res.status(400).send(`Error updating tasks: ${error}`);
    }
});

app.delete("/task/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const response = await deleteTasks(id);

        res.send(response);
    } catch (error) {
        res.status(400).send(`Error deleting tasks: ${error}`);
    }
});

if (process.env.DEVELOPMENT) {
    app.listen(port, () => {
        console.log(`Task app listening on port ${port}`);
    });
}

export const handler = serverless(app);
