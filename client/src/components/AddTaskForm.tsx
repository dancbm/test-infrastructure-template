import { useState } from "react";
import { Button, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import { API_URL } from "../env";
import { signRequest } from "../authService";

type AskTaskFormProps = {
    fetchTasks: () => Promise<void>;
};

export const AddTaskForm = ({ fetchTasks }: AskTaskFormProps) => {
    const [newTask, setNewTask] = useState("");

    async function addNewTask() {
        try {
            const body = JSON.stringify({
                name: newTask,
                completed: false,
            });
            const headers = await signRequest(API_URL, "POST", body);
            const response = await fetch(API_URL, {
                method: "POST",
                headers,
                body,
            });

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            await fetchTasks();

            setNewTask("");
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <>
            <Typography
                align="center"
                variant="h2"
                paddingTop={2}
                paddingBottom={2}
            >
                My Task List
            </Typography>
            <div className="addTaskForm">
                <TextField
                    size="small"
                    label="Task"
                    variant="outlined"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                />
                <Button
                    variant="outlined"
                    onClick={addNewTask}
                    disabled={!newTask.length}
                >
                    <AddIcon />
                </Button>
            </div>
        </>
    );
};
