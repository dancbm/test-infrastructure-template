import { useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

import { signIn } from "./authService";

export const LoginPage = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleSignIn = async (e: { preventDefault: () => void }) => {
        e.preventDefault();
        try {
            const session = await signIn({ username, password });
            console.log(
                "Sign in successful",
                session?.getAccessToken().getJwtToken()
            );
            if (
                session &&
                typeof session?.getAccessToken().getJwtToken() !== "undefined"
            ) {
                sessionStorage.setItem(
                    "accessToken",
                    session.getAccessToken().getJwtToken()
                );
                if (sessionStorage.getItem("accessToken")) {
                    window.location.href = "/home";
                } else {
                    console.error("Session token was not set properly.");
                }
            } else {
                console.error("SignIn session or AccessToken is undefined.");
            }
        } catch (error) {
            alert(`Sign in failed: ${error}`);
        }
    };

    return (
        <form
            onSubmit={handleSignIn}
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
        >
            <TextField
                size="small"
                label="Username"
                variant="outlined"
                onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
                size="small"
                label="Password"
                variant="outlined"
                onChange={(e) => setPassword(e.target.value)}
                type="password"
            />
            <Button variant="contained" type="submit">
                Sign In
            </Button>
        </form>
    );
};
