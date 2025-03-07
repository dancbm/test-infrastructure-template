import { useState } from "react";
import { Button, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";

import { API_URL } from "../env";
import { signRequest } from "../authService";

type AskTaskFormProps = {
    fetchTasks: () => Promise<void>;
};

export const AddTaskForm = ({ fetchTasks }: AskTaskFormProps) => {
    const [newTask, setNewTask] = useState("");

    async function addNewTask() {
        try {
            const signedRequest = await signRequest(API_URL, "POST");
            await axios({
                url: signedRequest.url,
                method: signedRequest.method,
                headers: signedRequest.headers,
                data: {
                    name: newTask,
                    completed: false,
                },
            });

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
