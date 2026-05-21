<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/" />
        </ion-buttons>
        <ion-title>E: ホーム</ion-title>
        <ion-buttons slot="end">
          <ion-menu-button />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2>ハイブリッドホーム</h2>
      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>商品総数</ion-card-subtitle>
          <ion-card-title>{{ loading ? '...' : items.length }} 件</ion-card-title>
        </ion-card-header>
      </ion-card>
      <p class="ion-margin-top">
        画面下のタブで主機能、右の <ion-icon :icon="menuOutline" /> ボタンで
        補助機能（レポート・設定）にアクセス。
      </p>
      <ion-text v-if="error" color="danger">{{ error }}</ion-text>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonMenuButton, IonCard, IonCardHeader,
  IonCardTitle, IonCardSubtitle, IonIcon, IonText,
} from '@ionic/vue'
import { menuOutline } from 'ionicons/icons'
import { useItems } from '@/composables/useItems'

const { items, loading, error, load } = useItems()
onMounted(load)
</script>
