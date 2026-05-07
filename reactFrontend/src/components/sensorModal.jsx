import React from "react";

export default function SensorModal({ sensor, onClose }) {
  if (!sensor) return null;

  return (
    <div className="modal">
      <div className="modal-content">

        <div className="modal-header">
          <h2>{sensor.name}</h2>
          <span onClick={onClose} className="close">✖</span>
        </div>

        <div className="status-row">
          <div className="status-box">
            <p>Status</p>
            <h3 className="green">
              {sensor.state}
            </h3>,
          </div>

          <div className="status-box">
            <p>Armed Status</p>
            <h3 className="green">
              {sensor.armed ? "Armed" : "Disarmed"}
            </h3>
          </div>
        </div>

        <div className="info">
          <p><strong>Location:</strong> {sensor.location}</p>

          <p><strong>Battery</strong></p>
          <div className="bar">
            <div
              className="fill green"
              style={{ width: `${sensor.battery}%` }}
            />
          </div>

          <p><strong>Signal</strong></p>
          <div className="bar">
            <div
              className="fill blue"
              style={{ width: `${sensor.signal}%` }}
            />
          </div>

          <p><strong>Last Active:</strong> {sensor.lastActive}</p>
          <p><strong>Firmware:</strong> {sensor.firmware}</p>
          <p><strong>ID:</strong> {sensor.id}</p>
        </div>

        <button className="disarm-btn">
          {sensor.armed ? "Disarm Device" : "Arm Device"}
        </button>

      </div>
    </div>
  );
}