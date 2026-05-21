<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/samples/c/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>ホーム</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="items" href="/samples/c/items">
          <ion-icon :icon="cartOutline" />
          <ion-label>商品</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings" href="/samples/c/settings">
          <ion-icon :icon="settingsOutline" />
          <ion-label>設定</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonTabs, IonTabBar, IonTabButton,
  IonRouterOutlet, IonIcon, IonLabel,
} from '@ionic/vue'
import { homeOutline, cartOutline, settingsOutline } from 'ionicons/icons'
</script>
