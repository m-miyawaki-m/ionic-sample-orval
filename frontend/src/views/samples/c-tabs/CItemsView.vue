<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>C: 商品</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list v-if="!loading && !error">
        <ion-item
          v-for="it in items"
          :key="it.id"
          button
          :router-link="{ name: 'sample-c-detail', params: { id: it.id } }"
          :detail="true"
        >
          <ion-label>
            <h2>{{ it.name }}</h2>
            <p>¥{{ it.price }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <ion-text v-if="loading" color="medium" class="ion-padding">Loading...</ion-text>
      <ion-text v-if="error" color="danger" class="ion-padding">{{ error }}</ion-text>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonText,
} from '@ionic/vue'
import { useItems } from '@/composables/useItems'

const { items, loading, error, load } = useItems()
onMounted(load)
</script>
