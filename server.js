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
        mqttCon.publish("Melder/1/cmnd/POWER", "ON");
    }
    else
    {
        mqttCon .publish("Melder/1/cmnd/POWER", "OFF");
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
            maxAge: 15 * 60 * 1000 // 15 Minuten
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



const mqttCon = mqtt.connect(
                                process.env.mqttbrokerIP,
                                {
                                    username: process.env.mqttusername,
                                    password: process.env.mqttpassword
                                }
                            );


mqttCon .on("connect", () => {
    console.log("Connected to MQTT broker");
});

mqttCon .on("error", (err) => {
    console.error("MQTT error:", err);
});

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