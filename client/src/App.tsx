import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import { LoginPage } from "./LoginPage";
import { Home } from "./Home";
import "./App.css";

const darkTheme = createTheme({
    palette: {
        mode: "dark",
    },
});

export const App = () => {
    const isAuthenticated = () => {
        const accessToken = sessionStorage.getItem("accessToken");
        return !!accessToken;
    };

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <BrowserRouter>
                <Routes>
                    <Route
                        path="/"
                        element={
                            isAuthenticated() ? (
                                <Navigate replace to="/home" />
                            ) : (
                                <Navigate replace to="/login" />
                            )
                        }
                    />
                    <Route path="/login" element={<LoginPage />} />
                    <Route
                        path="/home"
                        element={
                            isAuthenticated() ? (
                                <Home />
                            ) : (
                                <Navigate replace to="/login" />
                            )
                        }
                    />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
};
