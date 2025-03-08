import { useEffect, useState } from "react";

import { AddTaskForm } from "./components/AddTaskForm";
import { Task, TaskType } from "./components/Task";
import { API_URL } from "./env";
import { signRequest } from "./authService";

export function Home() {
    const [tasks, setTasks] = useState<TaskType[]>([]);

    const fetchTasks = async () => {
        try {
            const headers = await signRequest(API_URL, "GET");
            const response = await fetch(API_URL, {
                method: "GET",
                headers,
            });

            if (!response.ok) {
                throw new Error(`Response status: ${response.status}`);
            }

            const data = await response.json();
            setTasks(data || []);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);

    return (
        <>
            <AddTaskForm fetchTasks={fetchTasks} />
            {tasks.map((task) => (
                <Task key={task.id} task={task} fetchTasks={fetchTasks} />
            ))}
        </>
    );
}
