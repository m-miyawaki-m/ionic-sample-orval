<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/" />
        </ion-buttons>
        <ion-title>Bridge Demo</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- 初期化 -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>1. init</ion-card-title>
          <ion-card-subtitle>SDK を初期化</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-input
            v-model="apiKey"
            label="apiKey"
            label-placement="floating"
            placeholder="dummy-key"
          />
          <ion-button expand="block" class="ion-margin-top" @click="doInit">
            init({{ apiKey || 'empty' }})
          </ion-button>
          <ion-text :color="initialized ? 'success' : 'medium'">
            <p>state: {{ initialized ? 'initialized' : 'not initialized' }}</p>
          </ion-text>
        </ion-card-content>
      </ion-card>

      <!-- 同期 -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>2. sync</ion-card-title>
          <ion-card-subtitle>getDeviceInfo / echo</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-button expand="block" @click="doGetDeviceInfo">
            getDeviceInfo()
          </ion-button>
          <ion-text v-if="deviceInfo" color="primary">
            <p>model={{ deviceInfo.model }} / version={{ deviceInfo.sdkVersion }}</p>
          </ion-text>

          <ion-input
            v-model="echoText"
            label="echo text"
            label-placement="floating"
            class="ion-margin-top"
          />
          <ion-button expand="block" @click="doEcho">echo()</ion-button>
          <ion-text v-if="echoResult" color="primary"><p>{{ echoResult }}</p></ion-text>
        </ion-card-content>
      </ion-card>

      <!-- 非同期 -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>3. async</ion-card-title>
          <ion-card-subtitle>performAction (~800ms)</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-input
            v-model="actionInput"
            label="input"
            label-placement="floating"
          />
          <ion-button
            expand="block"
            class="ion-margin-top"
            :disabled="busy"
            @click="doPerformAction"
          >
            {{ busy ? '...running' : 'performAction()' }}
          </ion-button>
          <ion-text v-if="actionOutput" color="primary">
            <p>output: {{ actionOutput }}</p>
          </ion-text>
        </ion-card-content>
      </ion-card>

      <!-- イベント -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>4. events</ion-card-title>
          <ion-card-subtitle>startCounter / onCountChange</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-button expand="block" @click="doStartCounter">startCounter(1000)</ion-button>
          <ion-button expand="block" color="medium" @click="doStopCounter">stopCounter()</ion-button>
          <ion-text color="primary"><h2>count: {{ count }}</h2></ion-text>
        </ion-card-content>
      </ion-card>

      <!-- エラー -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>5. error</ion-card-title>
          <ion-card-subtitle>triggerError</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-button expand="block" color="danger" @click="doTriggerError">
            triggerError()
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- エラー表示 -->
      <ion-card v-if="lastError" color="danger">
        <ion-card-header>
          <ion-card-title>lastError</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>code: {{ lastError.code }}</p>
          <p>message: {{ lastError.message }}</p>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonButton, IonInput, IonText,
} from '@ionic/vue'

import { useDemoSdk } from '@/composables/useDemoSdk'
import type { DeviceInfo } from '@/native/demo-sdk-bridge'

const {
  initialized, count, lastError,
  init, getDeviceInfo, echo, performAction, triggerError,
  startCounter, stopCounter,
} = useDemoSdk()

const apiKey = ref('dummy-key')
const echoText = ref('hello')
const actionInput = ref('hello')
const deviceInfo = ref<DeviceInfo | null>(null)
const echoResult = ref<string | null>(null)
const actionOutput = ref<string | null>(null)
const busy = ref(false)

async function doInit() {
  await init(apiKey.value)
}

async function doGetDeviceInfo() {
  deviceInfo.value = await getDeviceInfo()
}

async function doEcho() {
  echoResult.value = await echo(echoText.value)
}

async function doPerformAction() {
  busy.value = true
  try {
    actionOutput.value = await performAction(actionInput.value)
  } finally {
    busy.value = false
  }
}

async function doStartCounter() {
  await startCounter(1000)
}

async function doStopCounter() {
  await stopCounter()
}

async function doTriggerError() {
  await triggerError()
}
</script>
