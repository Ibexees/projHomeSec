import React, { useEffect, useState } from "react";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

import "./analytics.css";

export default function Analytics() {

  const [range, setRange] = useState("week");

  const [openingsData, setOpeningsData] = useState([]);

  const [batteryData, setBatteryData] = useState([]);

  const [statusData, setStatusData] = useState([]);

  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {

    try {

      setLoading(true);

      //  Öffnungsstatistik
      const openingsRes = await fetch(
        `https://192.168.178.34:3000/openingCount?range=${range}`,
        {
          credentials: "include"
        }
      );

      const openings = await openingsRes.json();

      //  Batterieverlauf
      const batteryRes = await fetch(
        `https://192.168.178.34:3000/batterytrend?range=${range}`,
        {
          credentials: "include"
        }
      );

      const battery = await batteryRes.json();

      //  Statusübersicht
      const statusRes = await fetch(
        `https://192.168.178.34:3000/loginCount?range=${range}`,
        {
          credentials: "include"
        }
      );

      const status = await statusRes.json();

      setOpeningsData(openings);

      setBatteryData(battery);

      setStatusData(status);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {

    loadAnalytics();

  }, [range]);

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  return (

    <div className="analytics-page">

      <div className="analytics-header">

        <h1>Security Analytics</h1>

        <div className="range-buttons">

          <button
            className={range === "day" ? "active" : ""}
            onClick={() => setRange("day")}
          >
            Today
          </button>

          <button
            className={range === "week" ? "active" : ""}
            onClick={() => setRange("week")}
          >
            Week
          </button>

          <button
            className={range === "month" ? "active" : ""}
            onClick={() => setRange("month")}
          >
            Month
          </button>

          <button
            className={range === "year" ? "active" : ""}
            onClick={() => setRange("year")}
          >
            Year
          </button>

        </div>
      </div>

      <div className="analytics-grid">

        {/* OPENINGS */}

        <div className="analytics-card">

          <h2>Door Openings</h2>

          <ResponsiveContainer width="100%" height={300}>

            <BarChart data={openingsData}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="topic" />

              <YAxis />

              <Tooltip />

              <Bar dataKey="count" 
                   fill="#22c55e"
              />

            </BarChart>

          </ResponsiveContainer>

        </div>

        {/* BATTERY */}

        <div className="analytics-card">

          <h2>Battery History</h2>

          <ResponsiveContainer width="100%" height={300}>

            <LineChart data={batteryData}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="time" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                //dataKey="battery"
                dataKey="waschküche"
              />

               <Line
                type="monotone"
                //dataKey="battery"
                dataKey="Schlafzimmer"
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

        {/* Login History */}

        <div className="analytics-card">

          <h2>Login History</h2>

          <ResponsiveContainer width="100%" height={300}>

            <LineChart data={statusData}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="time" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                //dataKey="battery"
                dataKey="gillian"
              />

               <Line
                type="monotone"
                //dataKey="battery"
                dataKey="mar"
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </div>

    </div>
  );
}