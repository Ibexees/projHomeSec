const express = require('express');
const mqtt = require('mqtt');
const path = require('path');
const mqttClient = require('./.env');
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/i/:status', (req, res) => {

    const status = req.params.status;
 

    if(status === "on")
    {
        client.publish("Melder/1/cmnd/POWER", "ON");
    }
    else
    {
        client.publish("Melder/1/cmnd/POWER", "OFF");
    }
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
})



const client = mqtt.connect(
                                mqttClient.brokerIP,
                                {
                                    username: mqttClient.username,
                                    password: mqttClient.password
                                }
                            );


client.on("connect", () => {
    console.log("Connected to MQTT broker");
});

client.on("error", (err) => {
    console.error("MQTT error:", err);
});

app.listen(3000, '0.0.0.0', () => {
    console.log("Server running on port 3000");
    console.log(`Swagger UI available at: http://localhost:3000/api-docs`);
    console.log(`API JSON available at: http://localhost:3000/swagger.json`);
});