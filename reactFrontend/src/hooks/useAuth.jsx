import { useState } from "react";

export default function useAuth() {
  const [user, setUser] = useState(null);

  const login = async (username, password) => {

  const res = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (res.ok) {
    
    if(data.success)
    {
      console.log("Login success", data);
      setUser(username);
      return true;
    }
  }

  console.log("Login failed", data);
  setUser(null);
  return false;

  };

  const logout = () => setUser(null);

  return { user, login, logout };
}