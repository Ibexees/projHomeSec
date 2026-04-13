const express = require('express');
const mqtt = require('mqtt');
const path = require('path');
require('dotenv').config();
const app = express();
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

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
    

    if(!user)
    {
        return res.json({ success: false });
    }

    const valid = await bcrypt.compare(password, user.password);


    if (!valid) {
    return res.json({ success: false });
    }

    return res.json({success: true});

  } catch (err) {
    console.error(err);
    res.status(500).send('DB Error');
  }
    

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

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('DB Error');
  }
});



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