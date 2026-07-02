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
const https = require('https');
const fs = require("fs");


app.use(cookieParser());

app.use(cors({
    origin: [
    "https://localhost:5173",
    "http://localhost:5173",
    "https://192.168.178.34:5173"
  ], 
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/protected', authenticateToken,  (req, res) => {
  res.json({ message: 'ok', user: req.user });
});



const options = {
  key: fs.readFileSync("localhost+2-key.pem"),
  cert: fs.readFileSync("localhost+2.pem"),
};

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

app.get('/currentSensorstatus', /*authenticateToken,*/ async (req, res) => {

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

  //console.log(sensors);

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
            secure: true, // true bei HTTPS (Production!)
            sameSite: "none",
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



app.post('/setArmedState', /*authenticateToken*/ async (req,res) => {
  const armstate = req.body.newState;

  console.log(armstate);

  try{
    const query = `insert into alarm_state (armed, updated_at) values( ${armstate},now())` //`UPDATE alarm_state SET armed = ${armstate}, updated_at = now() WHERE id = 1`
    await pool.query(query);
    res.sendStatus(200);
  }
  catch
  {

    res.sendStatus(500)
  }

});

app.get('/getArmedState',  /*authenticateToken, */ async (req, res)=> {

     try{
    const query = `select * from latest_alarm_state`//`Select * from alarm_state where id = 1`
    const result = await pool.query(query);
    

    res.json(result.rows);
  }
  catch
  {

    res.sendStatus(500)
  }

});

app.get('/batterytrend', /*authenticateToken,*/ async (req, res)=>{

    const range = req.query.range;
    const time_interval = parseTimeframe(range);



  const time_frame = date_trunc_format(range);


  
  
  let query = `SELECT DISTINCT ON (
    topic,
    date_trunc(${time_frame}, ts)
)
    topic,
    battery,
    date_trunc(${time_frame}, ts) as time
FROM sensorlog
WHERE
    ts > now() - interval ${time_interval}
    AND battery <> 0
ORDER BY
    topic,
    date_trunc(${time_frame}, ts),
    ts DESC;`

  try {

    const result = await pool.query(query);

    
    res.json(formatForRecharts(result.rows));

  } catch (err) {

    console.error(err);
  }

});

function formatForRecharts(rows) {
  const grouped = {};

  for (const row of rows) {
    const topicRaw = row.topic; // "alarm/Schlafzimmer"
    const value = row.battery;
    const timestamp = row.time;

    // 1. Topic bereinigen
    const topic = topicRaw.split("/").pop(); // "Schlafzimmer"

    // 2. Datum normalisieren (YYYY-MM-DD)
    const time = new Date(timestamp).toISOString().slice(0, 10);

    // 3. Gruppieren nach time
    if (!grouped[time]) {
      grouped[time] = { time };
    }

    grouped[time][topic] = value;
  }

  return Object.values(grouped)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

function formatLoginDataForRecharts(rows) {
  const grouped = {};

  for (const row of rows) {
    const usernameRaw = row.username; // "alarm/Schlafzimmer"
    const value = row.count;
    const timestamp = row.time;

    // 1. Topic bereinigen
    const topic = usernameRaw.split("/").pop(); // "Schlafzimmer"

    // 2. Datum normalisieren (YYYY-MM-DD)
    const time = new Date(timestamp).toISOString().slice(0, 10);

    // 3. Gruppieren nach time
    if (!grouped[time]) {
      grouped[time] = { time };
    }

    grouped[time][topic] = value;
  }

  return Object.values(grouped)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

app.get('/openingCount', authenticateToken, async (req, res) =>{

  const range= req.query.range;
  const time_frame = parseTimeframe(range);

  



  let query = `with collect_statechange as(

select id,topic,state,battery,ts,lag(state) over (partition by topic order by ts asc) prevState
from sensorlog s
where ts > now() - interval ${time_frame} 
)

select split_part(topic, '/', 2) topic,count(state) 
from collect_statechange 
where coalesce(prevState, 'NO PREV') != state and state = 'OPEN'
group by topic`

  try {

    const result = await pool.query(query);

    
    res.json(result.rows);

  } catch (err) {

    console.error(err);
  }


});

app.get('/loginCount', /*authenticateToken*/ async (req, res) =>{

  const range= req.query.range;
  const time_interval = parseTimeframe(range);
  const time_frame = date_trunc_format(range);
  



  let query =    `select distinct on (username, date_trunc(${time_frame}, eventtime)) 
                  username,date_trunc(${time_frame}, eventtime) time, count(*) 
                  from loginlog join users on id = userid 
                  where loginlog.eventtime > now() - interval ${time_interval}
                  group by username, date_trunc(${time_frame},eventtime);`

  try {
    const result = await pool.query(query);
    res.json(formatLoginDataForRecharts(result.rows));

  } catch (err) {
    console.error(err);
  }


});


    function date_trunc_format(range) 
    {
 
    switch(range)
    {
      case "week": return("'day'"); 
      case "month": return("'day'"); 
      case "year": return("'week'"); 
      case "day": return("'hour'"); 
    }

  }

function parseTimeframe(timeText)
{
  switch(timeText)
  {
    case "week": return("'7 days'"); break;
    case "month": return("'1 month'"); break;
    case "year": return("'1 year'"); break;
    case "day": return("'1 days'"); break;

  }


}

async function checkAlarm ()
{
 
  try {

    const result = await pool.query(`
      select * 
      from latestsensordata 
      full join latest_alarm_state on true
      where state = 'OPEN' and armed = true
    `);

    const triggered = result.rows.length > 0;

    if(triggered)
    {
        console.log("Siren on");
        mqttCon.publish("alarm/siren", "ON");
    }
    else
    {
        console.log("Siren off");
        mqttCon.publish("alarm/siren", "OFF");
    }

  } catch (err) {

    console.error(err);
  }
}

/*const mqttCon = mqtt.connect(
                                process.env.mqttbrokerIP,
                                {
                                    username: process.env.mqttusername,
                                    password: process.env.mqttpassword
                                }
                            );*/

const mqttCon = mqtt.connect(
  process.env.mqttbrokerIP,
  {
    username: process.env.mqttusername,
    password: process.env.mqttpassword,

    ca: fs.readFileSync("./ca.crt"),

    rejectUnauthorized: true
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

// ===============================
// UNIT UPDATE LOGIK AUSLAGERN
// ===============================

async function handleUnitUpdate(batch) {

  const rows = batch.map(({ topic, message, ts }) => {

    const [state, batteryStr] = message.split("|");

    return [
      topic,
      state,
      parseInt(batteryStr, 10),
      new Date(ts)
    ];
  });

  const query = format(
    "INSERT INTO sensorlog (topic, state, battery, ts) VALUES %L",
    rows
  );

  await pool.query(query);

  await checkAlarm();
}



// ===============================
// QUEUE PROCESSING
// OHNE FETCH / HTTPS / SOCKETS
// ===============================

async function processQueue() {

  if (queue.length === 0) return;

  // Batch erstellen
  const batch = queue.splice(0, BATCH_SIZE);

  try {

    await handleUnitUpdate(batch);

  } catch (err) {

    console.error("Batch failed, retrying...", err);

    // zurück in Queue
    queue.unshift(...batch);
  }
}


// regelmäßig ausführen
setInterval(processQueue, INTERVAL_MS);



// ===============================
// EXPRESS ROUTE
// ===============================

app.post('/unitUpdate', async (req, res) => {

  try {

    const batch = req.body;

    await handleUnitUpdate(batch);

    res.sendStatus(200);

  } catch (err) {

    console.error(err);

    res.sendStatus(500);
  }
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

https.createServer(options, app).listen(3000, '0.0.0.0', () => {
    console.log("Server running on port 3000");
    console.log(`Swagger UI available at: https://localhost:3000/api-docs`);
    console.log(`API JSON available at: https://localhost:3000/swagger.json`);
});