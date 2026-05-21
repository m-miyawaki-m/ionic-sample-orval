<template>
  <ion-split-pane content-id="d-main" when="md">
    <ion-menu content-id="d-main">
      <ion-header>
        <ion-toolbar>
          <ion-title>D: メニュー</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-menu-toggle :auto-hide="false">
            <ion-item button :router-link="{ name: 'sample-d-items' }">
              <ion-icon slot="start" :icon="cartOutline" />
              <ion-label>商品</ion-label>
            </ion-item>
          </ion-menu-toggle>
          <ion-menu-toggle :auto-hide="false">
            <ion-item button :router-link="{ name: 'sample-d-settings' }">
              <ion-icon slot="start" :icon="settingsOutline" />
              <ion-label>設定</ion-label>
            </ion-item>
          </ion-menu-toggle>
          <ion-menu-toggle :auto-hide="false">
            <ion-item button router-link="/">
              <ion-icon slot="start" :icon="arrowBackOutline" />
              <ion-label>サンプル一覧へ戻る</ion-label>
            </ion-item>
          </ion-menu-toggle>
        </ion-list>
      </ion-content>
    </ion-menu>
    <ion-router-outlet id="d-main" />
  </ion-split-pane>
</template>

<script setup lang="ts">
import {
  IonSplitPane, IonMenu, IonMenuToggle, IonHeader, IonToolbar, IonTitle,
  IonContent, IonList, IonItem, IonLabel, IonIcon, IonRouterOutlet,
} from '@ionic/vue'
import { cartOutline, settingsOutline, arrowBackOutline } from 'ionicons/icons'
</script>
