import React, { useState } from "react";
import { useEffect } from "react";
import SensorCard from "../components/SensorCard";
import SensorModal from "../components/SensorModal";
import "../components/style.css";


export default function Dashboard() {

  useEffect(() => {
    getSensordata();
    }, []);

  const turnOn = async () => {
    await fetch("/api/i/on");
  };

  const turnOff = async () => {
    await fetch("/api/i/off");
  };

    const testprotected = async () => {
    await fetch("/api/protected", {
  method: "GET",
  credentials: "include"
});
  };

    const [selectedSensor, setSelectedSensor] = useState(null);
    const [sensors, setSensors] = useState([]);
  
    const getSensordata = async () => {
    const res = await fetch("/api/currentSensorstatus", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include"
  });

    const data = await res.json();
    console.log(data);

  if (res.ok) {
    
      console.log("Succsessfully loaded sensordata: ",data);
      setSensors(data.sensors);
      return;
  }

  console.log("Failed loading sensordata");

}


  

  /*const sensors = [
    {
      id: 1,
      name: "Front Door Sensor",
      location: "Main Entrance",
      state: true,
      armed: true,
      battery: 85,
      signal: 95,
      lastActive: "19.03.2026 10:30",
      firmware: "v2.3.1"
    },
    {
      id: 2,
      name: "Bedroom Window Sensor",
      location: "Master Bedroom",
      state: false,
      armed: true,
      battery: 78,
      signal: 90,
      lastActive: "19.03.2026 09:10",
      firmware: "v2.3.1"
    }
  ];*/



  return (
    <div>
      <h1>Dashboard</h1>

      <button onClick={turnOn}>Einschalten</button>
      <button onClick={turnOff}>Ausschalten</button>
      <button onClick={testprotected}>protected</button>
    
  

      <div className="container">
      <h2>Security Devices</h2>

      <div className="grid">
        {sensors.map((sensor) => (
          <SensorCard
            key={sensor.id}
            sensor={sensor}
            onClick={setSelectedSensor}
          />
        ))}
      </div>

      <SensorModal
        sensor={selectedSensor}
        onClose={() => setSelectedSensor(null)}
      />
    </div>
    </div>
  );
}