#include <Arduino.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_sleep.h>
#include "esp_wifi.h"

#define BAUD 115200
#define BUTTON_PIN_BITMASK 0x200000000 // 2^33 in hex

const int led = D10;
const int wakePin = D1;
RTC_DATA_ATTR int bootCount = 0;
RTC_DATA_ATTR int lastWorkingChannel = 3;

//ESP-NOW setup
typedef struct sensor_message {
  char sensorId[16];
  bool isOpen;
  int battery;
  int bootCount;
} sensor_message;

uint8_t gatewayMac[] = {0x80, 0xB5, 0x4E, 0xF3, 0xB1, 0xC4};

esp_now_peer_info_t peerInfo;
sensor_message msg;
volatile bool sendFinished = false;
volatile bool sendSuccess = false;

int startChannelScan()
{
  for (int ch = 1; ch <= 13; ch++) {
  esp_wifi_set_channel(ch, WIFI_SECOND_CHAN_NONE);
  Serial.print("Trying:");
  Serial.println(ch);

  sendFinished = false;

  esp_now_send(gatewayMac, (uint8_t*)&msg, sizeof(msg));

  unsigned long start = millis();
  while (!sendFinished && millis() - start < 500) {
    delay(10);
  }

  if (sendSuccess) {
    Serial.print("Found working channel: ");
    Serial.println(ch);
    return ch;
  }
  

}
return -1;
}

void onDataSent(const wifi_tx_info_t *tx_info, esp_now_send_status_t status) {
  Serial.print("Send status: ");

  if(status == ESP_NOW_SEND_SUCCESS)
  {
    Serial.println("Success");
    sendSuccess = true;
  }
  else
  {
    sendSuccess = false;
  }

  sendFinished = true;
}

/*
Method to print the reason by which ESP32
has been awaken from sleep
*/
void print_wakeup_reason(){
  esp_sleep_wakeup_cause_t wakeup_reason;

  wakeup_reason = esp_sleep_get_wakeup_cause();

  switch(wakeup_reason)
  {
    case ESP_SLEEP_WAKEUP_EXT0 : Serial.println("Wakeup caused by external signal using RTC_IO"); break;
    case ESP_SLEEP_WAKEUP_EXT1 : Serial.println("Wakeup caused by external signal using RTC_CNTL"); break;
    case ESP_SLEEP_WAKEUP_TIMER : Serial.println("Wakeup caused by timer"); break;
    case ESP_SLEEP_WAKEUP_TOUCHPAD : Serial.println("Wakeup caused by touchpad"); break;
    case ESP_SLEEP_WAKEUP_ULP : Serial.println("Wakeup caused by ULP program"); break;
    default : Serial.printf("Wakeup was not caused by deep sleep: %d\n",wakeup_reason); break;
  }
}

void sleepmodeSetup()
{
  pinMode(led, OUTPUT);
  pinMode(wakePin, INPUT);

  Serial.begin(BAUD);
  delay(1000); //Take some time to open up the Serial Monitor

  //Increment boot number and print it every reboot
  ++bootCount;
  Serial.println("Boot number: " + String(bootCount));

  //Print the wakeup reason for ESP32
  print_wakeup_reason();

  esp_deep_sleep_enable_gpio_wakeup(BIT(D1), ESP_GPIO_WAKEUP_GPIO_HIGH);
}

void espNowSetup()
{
   WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    WiFi.setSleep(false);
    esp_wifi_set_channel(lastWorkingChannel, WIFI_SECOND_CHAN_NONE);


  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return;
  }

  esp_now_register_send_cb(onDataSent);

  memcpy(peerInfo.peer_addr, gatewayMac, 6);
  peerInfo.channel = 0;
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("Failed to add peer");
    return;
  }

  Serial.println("ESP-NOW ready");
}

void sendSensorState(bool isOpen) {
  strcpy(msg.sensorId, "window_kitchen");
  msg.isOpen = isOpen;
  msg.battery = 92;
  msg.bootCount = bootCount;

  esp_wifi_set_channel(lastWorkingChannel, WIFI_SECOND_CHAN_NONE);

  sendFinished = false;
  sendSuccess = false;

  esp_err_t result = esp_now_send(
    gatewayMac,
    (uint8_t *) &msg,
    sizeof(msg)
  );

  if (result == ESP_OK) {
    Serial.println("Message queued");
  } else {
    Serial.println("Send error");
  }

  unsigned long start = millis();
  while (!sendFinished && millis() - start < 2000) {
    delay(10);
  }

   if (!sendSuccess) {
    Serial.println("Send failed, starting channel scan");

    int foundChannel = startChannelScan();

    if (foundChannel != -1) {
      lastWorkingChannel = foundChannel;

      Serial.print("Saved working channel: ");
      Serial.println(lastWorkingChannel);
    } else {
      Serial.println("No working channel found");
    }
  }
}

void setup(){

  sleepmodeSetup();
  espNowSetup();
  
  
}

uint8_t primaryChannel;
wifi_second_chan_t secondChannel;



void loop(){

  if(digitalRead(wakePin) == LOW)
  {
    sendSensorState(true);
    Serial.println("Going to sleep now");
    esp_deep_sleep_start();
  }
  
  esp_wifi_get_channel(&primaryChannel, &secondChannel);

  Serial.print("Current WiFi channel: ");
  Serial.println(primaryChannel);
  
  //send Data to iot Gateway
  sendSensorState(true);
  //esp-now connection

  digitalWrite(led, HIGH);   // turn the LED on 
  delay(10000);               // wait for a second
  digitalWrite(led, LOW);    // turn the LED off
  delay(10000);               // wait for a second
 
}


