<template>
  <ion-split-pane content-id="e-main" when="md">
    <ion-menu content-id="e-main" side="end">
      <ion-header>
        <ion-toolbar>
          <ion-title>E: 補助メニュー</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <ion-list-header>
            <ion-label>補助機能</ion-label>
          </ion-list-header>
          <ion-menu-toggle :auto-hide="false">
            <ion-item button :router-link="{ name: 'sample-e-reports' }">
              <ion-icon slot="start" :icon="barChartOutline" />
              <ion-label>レポート</ion-label>
            </ion-item>
          </ion-menu-toggle>
          <ion-menu-toggle :auto-hide="false">
            <ion-item button :router-link="{ name: 'sample-e-settings' }">
              <ion-icon slot="start" :icon="settingsOutline" />
              <ion-label>設定</ion-label>
            </ion-item>
          </ion-menu-toggle>
          <ion-menu-toggle :auto-hide="false">
            <ion-item button router-link="/">
              <ion-icon slot="start" :icon="arrowBackOutline" />
              <ion-label>サンプル一覧へ</ion-label>
            </ion-item>
          </ion-menu-toggle>
        </ion-list>
      </ion-content>
    </ion-menu>
    <ion-tabs id="e-main">
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" href="/samples/e/home">
          <ion-icon :icon="homeOutline" />
          <ion-label>ホーム</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="items" href="/samples/e/items">
          <ion-icon :icon="cartOutline" />
          <ion-label>商品</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-split-pane>
</template>

<script setup lang="ts">
import {
  IonSplitPane, IonMenu, IonMenuToggle, IonHeader, IonToolbar, IonTitle,
  IonContent, IonList, IonListHeader, IonItem, IonLabel, IonIcon,
  IonTabs, IonTabBar, IonTabButton, IonRouterOutlet,
} from '@ionic/vue'
import {
  homeOutline, cartOutline, barChartOutline, settingsOutline, arrowBackOutline,
} from 'ionicons/icons'
</script>
