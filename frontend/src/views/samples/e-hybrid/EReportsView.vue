<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>E: レポート</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2>月次レポート</h2>
      <ion-card>
        <ion-card-content>
          <p>商品総数: {{ loading ? '...' : items.length }}</p>
          <p>合計金額: ¥{{ totalPrice }}</p>
        </ion-card-content>
      </ion-card>
      <p class="ion-margin-top"><small>(レポート例: 商品 API の集計)</small></p>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonMenuButton, IonCard, IonCardContent,
} from '@ionic/vue'
import { useItems } from '@/composables/useItems'

const { items, loading, load } = useItems()
onMounted(load)
const totalPrice = computed(() => items.value.reduce((sum, it) => sum + it.price, 0))
</script>
