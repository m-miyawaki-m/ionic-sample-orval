<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>D: 設定</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list>
        <ion-item>
          <ion-toggle>通知を有効にする</ion-toggle>
        </ion-item>
        <ion-item>
          <ion-toggle>位置情報を使用</ion-toggle>
        </ion-item>
      </ion-list>
      <p class="ion-padding"><small>(ダミー設定)</small></p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonMenuButton, IonList, IonItem, IonToggle,
} from '@ionic/vue'
</script>
