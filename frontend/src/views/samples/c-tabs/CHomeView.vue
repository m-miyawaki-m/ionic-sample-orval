<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/" />
        </ion-buttons>
        <ion-title>C: ホーム</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2>ダッシュボード</h2>
      <ion-card>
        <ion-card-header>
          <ion-card-subtitle>商品総数</ion-card-subtitle>
          <ion-card-title>{{ loading ? '...' : items.length }} 件</ion-card-title>
        </ion-card-header>
      </ion-card>
      <ion-text v-if="error" color="danger">{{ error }}</ion-text>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonCard, IonCardHeader,
  IonCardTitle, IonCardSubtitle, IonText,
} from '@ionic/vue'
import { useItems } from '@/composables/useItems'

const { items, loading, error, load } = useItems()
onMounted(load)
</script>
