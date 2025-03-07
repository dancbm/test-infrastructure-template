import { useState } from "react";
import CheckIcon from "@mui/icons-material/Check";
import axios from "axios";
import { Button, Dialog, DialogTitle, TextField } from "@mui/material";

import { TaskType } from "./Task";
import { API_URL } from "../env";

type UpdateTaskFormProps = {
    task: TaskType;
    isDialogOpen: boolean;
    setIsDialogOpen: (isDialogOpen: boolean) => void;
    fetchTasks: () => Promise<void>;
};

export const UpdateTaskForm = ({
    isDialogOpen,
    setIsDialogOpen,
    fetchTasks,
    task,
}: UpdateTaskFormProps) => {
    const { id, completed } = task;
    const [taskName, setTaskName] = useState("");

    async function handleUpdateTaskName() {
        try {
            await axios.put(API_URL, {
                id,
                name: taskName,
                completed,
            });

            await fetchTasks();

            setTaskName("");
        } catch (error) {
            console.log(error);
        }
    }

    return (
        <Dialog open={isDialogOpen}>
            <DialogTitle>Edit Task</DialogTitle>
            <div className="dialog">
                <TextField
                    size="small"
                    label="Task"
                    variant="outlined"
                    onChange={(e) => setTaskName(e.target.value)}
                />
                <Button
                    variant="contained"
                    onClick={async () => {
                        handleUpdateTaskName();
                        setIsDialogOpen(false);
                    }}
                >
                    <CheckIcon />
                </Button>
            </div>
        </Dialog>
    );
};
