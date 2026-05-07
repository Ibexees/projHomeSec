//import jwt from 'jsonwebtoken';
const jwt = require('jsonwebtoken');
const express = require('express');
const mqtt = require('mqtt');
const path = require('path');
require('dotenv').config();
const app = express();
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const format = require('node-pg-format').format;


app.use(cookieParser());

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/protected', authenticateToken,  (req, res) => {
  res.json({ message: 'ok', user: req.user });
});

function formatDate(date) {
  const d = new Date(date);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

app.get('/currentSensorstatus', authenticateToken, async (req, res) => {

    //TODO: retrieve Sensordata form sql server
     const result = await pool.query('select * from latestsensordata l');
  

    const sensors = result.rows.map((row, index) => ({
  id: index + 1,
  name: row.topic.split("/")[1] + " Sensor",
  location: row.topic.split("/")[1],
  online: true,
  armed: row.state === "CLOSED",
  state: row.state,
  battery: row.battery,
  signal: 95,
  lastActive: formatDate(row.ts),
  firmware: "v2.3.1"
}));

  console.log(sensors);

  res.json({ message: 'ok', sensors: sensors });
});

function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    req.user = user;
    next();
  });
}

app.get('/i/:status', (req, res) => {

    const status = req.params.status;
    

    if(status === "on")
    {
        mqttCon.publish("cmnd/Melder/POWER", "ON");
    }
    else
    {
        mqttCon .publish("cmnd/Melder/POWER", "OFF");
    }
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
})

app.post('/login', async (req, res) => {
         const { username, password } = req.body;

      try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    let reason;
    let success = false;
    let userId;
    let token;

    if(!user)
    {
        reason = "USER_NOT_FOUND";
    }
    else
    {
      userId = parseInt(user.id);
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        reason = "INVALID_PASSWORD";
      }
      else
      {
           reason = "LOGIN_SUCCESSFUL"
           success = true;

           token = jwt.sign(
              { userId: userId, username: user.username },
              process.env.JWT_SECRET,
              { expiresIn: "15m" }
            );
           
           res.cookie("token", token, {
            httpOnly: true,
            secure: false, // true bei HTTPS (Production!)
            sameSite: "lax",
            maxAge: 15 * 60 * 1000, // 15 Minuten
            path: "/"
          });

      }
    }
    //console.log(userId, success, reason);
    await pool.query(
  `INSERT INTO loginlog (userid, success, reason)
   VALUES ($1, $2, $3)`,
  [userId, success, reason]
);

    return res.json({success: success
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('DB Error');
  }
    

});

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

/*
$body = @{
    username = "testuser"
    password = "1234"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
*/

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query('select max(users.id) from users');
  const id = result.rows.id +1


  await pool.query(
    'INSERT INTO users(id,username, password) VALUES($1, $2, $3)',
    [id, username, hashedPassword]
  );

  res.json({ ok: true });
});

/*app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB Error');
  }
});*/

app.post('/unitUpdate', async (req, res) => {
    let batch = req.body;
    //console.log(batch);
    res.sendStatus(200);

    const rows = batch.map(({ topic, message, ts }) => {
    const [state, batteryStr] = message.split("|");
    return [topic, state, parseInt(batteryStr, 10), new Date(ts)];
    });

    const query = format(
    "INSERT INTO sensorlog (topic, state, battery, ts) VALUES %L",
    rows
    );

await pool.query(query);


});

const mqttCon = mqtt.connect(
                                process.env.mqttbrokerIP,
                                {
                                    username: process.env.mqttusername,
                                    password: process.env.mqttpassword
                                }
                            );


mqttCon .on("connect", () => {
    mqttCon.subscribe("alarm/waschküche");
    mqttCon.subscribe("alarm/wohnzimmer");
    mqttCon.subscribe("alarm/Schlafzimmer");
    console.log("Connected to MQTT broker");
});

mqttCon .on("error", (err) => {
    console.error("MQTT error:", err);
});

const queue = [];

const BATCH_SIZE = 10;     // max. Einträge pro Request
const INTERVAL_MS = 500;   // wie oft senden

//Bei Mqtt message recieve in die Queue Speichern
mqttCon.on("message", (topic, message) => {
  // message is Buffer
  //console.log("topic: " + topic.toString() + " message: " + message.toString());
    
    queue.push({
    topic: topic.toString(),
    message: message.toString(),
    ts: Date.now()
  });

  if (queue.length >= BATCH_SIZE) {
    processQueue(); // sofort triggern
  }

});

//Queue von Tür und Fenstermelder Daten abbarbeiten
async function processQueue() {
  if (queue.length === 0) return;
 
  // Batch erstellen
  const batch = queue.splice(0, BATCH_SIZE);

  try {
    const res = await fetch("http://localhost:3000/unitUpdate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      throw new Error("HTTP error " + res.status);
    }

  } catch (err) {
    console.error("Batch failed, retrying...", err);

    // zurück in Queue (vorne!)
    queue.unshift(...batch);
  }
}

// regelmäßig ausführen
setInterval(processQueue, INTERVAL_MS);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.connect()
  .then(client => {
    console.log("PostgreSQL connected");
    client.release();
  })
  .catch(err => {
    console.error("DB connection error:", err);
  });

app.listen(3000, '0.0.0.0', () => {
    console.log("Server running on port 3000");
    console.log(`Swagger UI available at: http://localhost:3000/api-docs`);
    console.log(`API JSON available at: http://localhost:3000/swagger.json`);
});