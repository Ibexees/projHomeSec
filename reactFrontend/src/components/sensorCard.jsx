import React from "react";

export default function SensorCard({ sensor, onClick }) {
  return (
    <div
      onClick={() => onClick(sensor)}
      className="sensor-card"
    >
      <div className="sensor-header">
        <div className="icon">🚪</div>
        <div className="signal">📶</div>
      </div>

      <h3>{sensor.name}</h3>
      <p className="location">{sensor.location}</p>

      <div className="meta">
        <span className={`badge ${sensor.state}`}>
          {sensor.state}
        </span>
        <span>🔋 {sensor.battery}%</span>
      </div>

      <button className="armed-btn">
        {sensor.armed ? "🛡 Armed" : "Disarmed"}
      </button>
    </div>
  );
}