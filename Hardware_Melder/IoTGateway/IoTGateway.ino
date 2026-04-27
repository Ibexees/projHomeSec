#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>
#include "ESP32MQTTClient.h"
#include "esp_idf_version.h" // check IDF version
#include <credentials.h>
#include "esp_wifi.h"

const char *ssid = WIFI_SSID;
const char *pass = WIFI_PASSWORD;

char *mqttServer = MQTT_BROKER_ADRESS ;
char *mqttUser = MQTT_USER;
char *mqttPassword = MQTT_PASSWORD;

char *subscribeTopic = "foo";
char publishTopic[100];

ESP32MQTTClient mqttClient;

int pubCount = 0;

volatile bool newEspNowMessage = false;

QueueHandle_t espNowQueue;


typedef struct sensor_message {
  char sensorId[16];
  bool isOpen;
  int battery;
  int bootCount;
} sensor_message;


sensor_message incomingMessage;

void onEspNowDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  char macStr[18];

  snprintf(macStr, sizeof(macStr),
           "%02X:%02X:%02X:%02X:%02X:%02X",
           info->src_addr[0],
           info->src_addr[1],
           info->src_addr[2],
           info->src_addr[3],
           info->src_addr[4],
           info->src_addr[5]);

  Serial.println("-----------------------------------");
  Serial.print("Message received from: ");
  Serial.println(macStr);

  if (len != sizeof(sensor_message)) {
    Serial.println("Invalid message size");
    return;
  }

  memcpy(&incomingMessage, data, sizeof(incomingMessage));

  Serial.print("Sensor ID: ");
  Serial.println(incomingMessage.sensorId);

  Serial.print("Door/Window Open: ");
  Serial.println(incomingMessage.isOpen ? "YES" : "NO");

  Serial.print("Battery: ");
  Serial.print(incomingMessage.battery);
  Serial.println(" %");

  Serial.print("Boot Count: ");
  Serial.println(incomingMessage.bootCount);

  Serial.println("ALARM: Door or window opened!");

  newEspNowMessage = true;
  xQueueSend(espNowQueue, &incomingMessage, 0);
    // Hier könntest du später ergänzen:
    // - Sirene aktivieren
    // - HTTP Request ans Backend senden
    // - MQTT Nachricht senden
    // - Datenbankeintrag erzeugen

  Serial.println("-----------------------------------");
}

void printMacAddress() {
  uint8_t mac[6];
  WiFi.macAddress(mac);

  Serial.println();
  Serial.println("Gateway MAC Address:");
  Serial.printf("{0x%02X, 0x%02X, 0x%02X, 0x%02X, 0x%02X, 0x%02X}\n",
                mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  Serial.println();
}

void mqttSetup()
{
      // Serial.begin(115200);
    log_i();
    log_i("setup, ESP.getSdkVersion(): ");
    log_i("%s", ESP.getSdkVersion());

    mqttClient.enableDebuggingMessages();

    mqttClient.setURI(mqttServer, mqttUser, mqttPassword);
    mqttClient.enableLastWillMessage("lwt", "I am going offline");
    mqttClient.setKeepAlive(30);
    mqttClient.setOnMessageCallback([](const std::string &topic, const std::string &payload) {
        log_i("Global callback: %s: %s", topic.c_str(), payload.c_str());
    });
    WiFi.begin(ssid, pass);

    while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
}
    WiFi.setSleep(false);
    esp_wifi_set_ps(WIFI_PS_NONE);
    esp_wifi_set_channel(WiFi.channel(), WIFI_SECOND_CHAN_NONE);

    Serial.print("WiFi status: ");
    Serial.println(WiFi.status());

    Serial.print("ESP IP: ");
    Serial.println(WiFi.localIP());


    uint8_t primaryChannel;
    wifi_second_chan_t secondChannel;

    esp_wifi_get_channel(&primaryChannel, &secondChannel); 
    Serial.print("Current WiFi channel: ");
    Serial.println(primaryChannel);

    mqttClient.loopStart();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  printMacAddress();

  espNowQueue = xQueueCreate(10, sizeof(sensor_message));

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return;
  }

  esp_now_register_recv_cb(onEspNowDataRecv);

  Serial.println("ESP-NOW Gateway Ready");

  mqttSetup();
}



void loop() {
  /*if(newEspNowMessage)
  {
    snprintf(publishTopic, sizeof(publishTopic), "alarm/%s", incomingMessage.sensorId);
    std::string msg = "Unit opened: " + std::to_string(incomingMessage.isOpen);
    mqttClient.publish(publishTopic, msg, 0, false);
    newEspNowMessage = false;
  }*/

  sensor_message msg;
if (xQueueReceive(espNowQueue, &msg, 0)) {
    char topic[100];
    snprintf(topic, sizeof(topic), "alarm/%s", msg.sensorId);

    std::string payload = msg.isOpen ? "OPEN" : "CLOSED";
    payload = payload + "|" +  std::to_string(msg.battery);
    mqttClient.publish(topic, payload, 0, false);
}
 

  delay(1000);
}

void onMqttConnect(esp_mqtt_client_handle_t client)
{
    if (mqttClient.isMyTurn(client)) // can be omitted if only one client
    {
        mqttClient.subscribe(subscribeTopic, [](const std::string &payload)
                             { log_i("%s: %s", subscribeTopic, payload.c_str()); });

        mqttClient.subscribe("bar/#", [](const std::string &topic, const std::string &payload)
                             { log_i("%s: %s", topic.c_str(), payload.c_str()); });
    }
}

#if ESP_IDF_VERSION < ESP_IDF_VERSION_VAL(5, 0, 0)
esp_err_t handleMQTT(esp_mqtt_event_handle_t event)
{
    mqttClient.onEventCallback(event);
    return ESP_OK;
}
#else  // IDF CHECK
void handleMQTT(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data)
{
    auto *event = static_cast<esp_mqtt_event_handle_t>(event_data);
    mqttClient.onEventCallback(event);
}
#endif // // IDF CHECK
