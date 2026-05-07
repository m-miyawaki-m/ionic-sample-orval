<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/" />
        </ion-buttons>
        <ion-title>商品詳細</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="item">
        <h2>{{ item.name }}</h2>
        <p>ID: {{ item.id }}</p>
        <p>価格: ¥{{ item.price }}</p>
        <ion-button color="danger" expand="block" @click="onDelete">削除</ion-button>
      </div>
      <ion-text v-else color="medium">Loading...</ion-text>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonButton, IonText,
} from '@ionic/vue'
import { getItem, deleteItem } from '../api/default/default'
import type { Item } from '../api/models'

const props = defineProps<{ id: string }>()
const router = useRouter()
const item = ref<Item | null>(null)

onMounted(async () => {
  item.value = await getItem(Number(props.id))
})

const onDelete = async () => {
  await deleteItem(Number(props.id))
  router.replace({ name: 'list' })
}
</script>
