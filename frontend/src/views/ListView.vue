<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>商品一覧</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="goBridgeDemo">Bridge</ion-button>
          <ion-button @click="goCreate">追加</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-list v-if="items">
        <ion-item
          v-for="item in items"
          :key="item.id"
          button
          @click="goDetail(item.id)"
        >
          <ion-label>
            <h2>{{ item.name }}</h2>
            <p>¥{{ item.price }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <ion-text v-else color="medium" class="ion-padding">
        Loading...
      </ion-text>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonItem, IonLabel, IonButtons, IonButton, IonText,
} from '@ionic/vue'
import { listItems } from '../api/default/default'
import type { Item } from '../api/models'

const router = useRouter()
const items = ref<Item[] | null>(null)

onMounted(async () => {
  items.value = await listItems()
})

const goDetail = (id: number) => router.push({ name: 'detail', params: { id } })
const goCreate = () => router.push({ name: 'create' })
const goBridgeDemo = () => router.push({ name: 'bridge-demo' })
</script>
