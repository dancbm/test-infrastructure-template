import { useState } from "react";
import { Button, Checkbox, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import classNames from "classnames";
import axios from "axios";

import { UpdateTaskForm } from "./UpdateTaskForm";
import { API_URL } from "../env";

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
            await axios.put(API_URL, {
                id,
                name,
                completed: !isComplete,
            });

            await fetchTasks();

            setIsComplete((prev) => !prev);
        } catch (error) {
            console.error(error);
        }
    }

    async function handleDeleteTask() {
        try {
            await axios.delete(`${API_URL}/${task.id}`);
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
