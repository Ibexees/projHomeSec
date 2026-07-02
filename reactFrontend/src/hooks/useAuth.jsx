import { useState } from "react";
import { useEffect } from "react";

export default function useAuth() {
  const [user, setUser] = useState(null);

   useEffect(() => {
    fetch("https://192.168.178.34:3000/protected", {
      credentials: "include",
    })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        setUser(data.user || true); // je nach backend
      })
      .catch(() => {
        setUser(null);
      });
  }, []);


  const login = async (username, password) => {

  const res = await fetch("https://192.168.178.34:3000/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      
    },
    credentials: "include",
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

    const logout = async () => {
    await fetch("https://192.168.178.34:3000/logout", {
      credentials: "include",
      method: "POST"
    });

    setUser(null);
  };

  return { user, login, logout };
}