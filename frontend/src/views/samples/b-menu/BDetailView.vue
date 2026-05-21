<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="{ name: 'sample-b-items' }" />
        </ion-buttons>
        <ion-title>B: 詳細</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="item">
        <h2>{{ item.name }}</h2>
        <p>ID: {{ item.id }}</p>
        <p>価格: ¥{{ item.price }}</p>
      </div>
      <ion-text v-if="loading" color="medium">Loading...</ion-text>
      <ion-text v-if="error" color="danger">{{ error }}</ion-text>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonText,
} from '@ionic/vue'
import { useItem } from '@/composables/useItems'

const props = defineProps<{ id: string }>()
const { item, loading, error, load } = useItem(Number(props.id))
onMounted(load)
</script>
