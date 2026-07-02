# projHomeSec - Home Security System

## Project Overview

This project combines hardware components (ESP door/window units) with a web application to provide a complete home security solution. The system monitors entry points and provides users with a responsive dashboard for real-time status updates.

**For detailed project documentation, see:** [Marik_Projekt Bericht Home Security System.pdf](./Marik_Projekt%20Bericht%20Home%20Security%20System.pdf)

## Project Structure

### Core Components

- **`frontend/`** - NOT IN USE ANYMORE! Legacy frontend implementation (HTML/CSS/JavaScript) 
- **`reactFrontend/`** - Modern React-based frontend
  - The most important files in the react Frontend are the page files projHomeSec/reactFrontend/src/pages/ .
  - Dashboard.jsx this page contains the visualisation of persisted sensordata like Battery History
  - Home.jsx includes the Sensorview via the sensormodal that informs the user of the current battery and opening state of individual Sensors
  - Login.jsx this page is used as the entrypoint and to authenticate users trying to access the application (Needed for User Session to access API)
- **`server.js`** - Node.js backend server handling API requests and data management
  - Server.js is the whole Backend Web Backend Logik for this Project.
  - The Server Talks to the IOT Gateway via MQTT where it recieves data from the sensors.
  - The Server inserts Recieved Sensordata into the PostgreSQL Database.
  - The Server is the only API that the react frontend calls from or writes to.
- **`Hardware_Melder/`** - ESP firmware and hardware-related code (C++)
- **`Persistence/`** - Contains a overview of the used create Table statements in the Database 

### Configuration Files

- **`.gitignore`** - Git ignore rules, this includes the Certifikates and other .env Files like passwords.

## 🛠️ Technology Stack

| Language | Usage | 
|----------|-------|
| **JavaScript** | Frontend & Backend
| **C++** | ESP Hardware Firmware 


### Key Technologies

- **Backend:** Node.js with Express (server.js)
- **Frontend:** React (reactFrontend) with modern UI components
- **Hardware:** ESP32 for door and window sensors
- **Data Storage:** Persistent storage layer (PostgreSQL) for sensor data and events