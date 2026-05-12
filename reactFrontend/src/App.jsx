import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import useAuth from "./hooks/useAuth";
import './App.css'
import PrivateRoute from "./components/privateRoute";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";


function App() {
  
  const auth = useAuth();
  return (
  <BrowserRouter>
      <nav>
        <Link to="/">Home</Link> |{" "}
        <Link to="/dashboard">Dashboard</Link> |{" "}
        {auth.user ? (
          <button onClick={auth.logout}>Logout</button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>

      <Routes>
        <Route
          path="/"
          element={
            <PrivateRoute user={auth.user}>
              <Home />
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute user={auth.user}>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/login"
          element={<Login onLogin={auth.login} />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
