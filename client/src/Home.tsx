import { useEffect, useState } from "react";
import axios from "axios";

import { AddTaskForm } from "./components/AddTaskForm";
import { Task, TaskType } from "./components/Task";
import { API_URL } from "./env";
import { signRequest } from "./authService";

export function Home() {
    const [tasks, setTasks] = useState<TaskType[]>([]);

    const fetchTasks = async () => {
        try {
            const signedRequest = await signRequest(API_URL);

            if (!signedRequest)
                throw new Error("Couldn't get valid credentials");

            const { data } = await axios({
                url: signedRequest.url,
                method: signedRequest.method,
                headers: signedRequest.headers,
            });

            setTasks(data);
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
