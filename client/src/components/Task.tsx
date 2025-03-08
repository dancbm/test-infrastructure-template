import { useState } from "react";
import { Button, Checkbox, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import classNames from "classnames";

import { UpdateTaskForm } from "./UpdateTaskForm";
import { API_URL } from "../env";
import { signRequest } from "../authService";

export type TaskType = {
    id: string;
    name: string;
    completed: boolean;
};

export type TaskProps = {
    task: TaskType;
    fetchTasks: () => Promise<void>;
};

export const Task = ({ task, fetchTasks }: TaskProps) => {
    const { id, name, completed } = task;
    const [isComplete, setIsComplete] = useState(completed);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    async function handleCompletion() {
        try {
            const body = JSON.stringify({
                id,
                name,
                completed: !isComplete,
            });
            const headers = await signRequest(API_URL, "PUT", body);
            const response = await fetch(API_URL, {
                method: "PUT",
                headers,
                body,
            });

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            await fetchTasks();

            setIsComplete((prev) => !prev);
        } catch (error) {
            console.error(error);
        }
    }

    async function handleDeleteTask() {
        try {
            const headers = await signRequest(
                `${API_URL}/${task.id}`,
                "DELETE"
            );
            const response = await fetch(`${API_URL}/${task.id}`, {
                method: "DELETE",
                headers,
            });

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }
            await fetchTasks();
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div className="task">
            <div className={classNames("flex", { done: isComplete })}>
                <Checkbox checked={isComplete} onChange={handleCompletion} />
                <Typography variant="h4">{task.name}</Typography>
            </div>
            <div className="taskButtons">
                <Button
                    variant="contained"
                    onClick={() => setIsDialogOpen(true)}
                >
                    <EditIcon />
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleDeleteTask}
                >
                    <DeleteIcon />
                </Button>
            </div>
            <UpdateTaskForm
                isDialogOpen={isDialogOpen}
                setIsDialogOpen={setIsDialogOpen}
                task={task}
                fetchTasks={fetchTasks}
            />
        </div>
    );
};
