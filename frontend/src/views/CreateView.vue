<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/" />
        </ion-buttons>
        <ion-title>商品作成</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-list>
        <ion-item>
          <ion-input v-model="name" label="商品名" label-placement="floating" />
        </ion-item>
        <ion-item>
          <ion-input v-model.number="price" type="number" label="価格" label-placement="floating" />
        </ion-item>
      </ion-list>
      <ion-button expand="block" :disabled="!canSubmit" @click="onSubmit" class="ion-margin-top">
        登録
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonList, IonItem, IonInput, IonButton,
} from '@ionic/vue'
import { createItem } from '../api/default/default'

const router = useRouter()
const name = ref('')
const price = ref<number | null>(null)
const canSubmit = computed(() => name.value.length > 0 && typeof price.value === 'number')

const onSubmit = async () => {
  if (!canSubmit.value) return
  await createItem({ name: name.value, price: price.value as number })
  router.replace({ name: 'list' })
}
</script>
