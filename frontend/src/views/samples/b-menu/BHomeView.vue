<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/" />
        </ion-buttons>
        <ion-title>B: メニューホーム</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-grid>
        <ion-row>
          <ion-col size="6">
            <ion-card button @click="goItems">
              <ion-card-content class="ion-text-center">
                <ion-icon :icon="cartOutline" size="large" color="primary" />
                <h3>商品 {{ items.length }}</h3>
                <p>{{ loading ? '取得中...' : '商品一覧' }}</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card button>
              <ion-card-content class="ion-text-center">
                <ion-icon :icon="searchOutline" size="large" color="primary" />
                <h3>検索</h3>
                <p>(ダミー)</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card button>
              <ion-card-content class="ion-text-center">
                <ion-icon :icon="barChartOutline" size="large" color="primary" />
                <h3>レポート</h3>
                <p>(ダミー)</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
          <ion-col size="6">
            <ion-card button>
              <ion-card-content class="ion-text-center">
                <ion-icon :icon="settingsOutline" size="large" color="primary" />
                <h3>設定</h3>
                <p>(ダミー)</p>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-text v-if="error" color="danger" class="ion-padding">{{ error }}</ion-text>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonBackButton, IonGrid, IonRow, IonCol,
  IonCard, IonCardContent, IonIcon, IonText,
} from '@ionic/vue'
import {
  cartOutline, searchOutline, barChartOutline, settingsOutline,
} from 'ionicons/icons'
import { useItems } from '@/composables/useItems'

const router = useRouter()
const { items, loading, error, load } = useItems()
onMounted(load)
const goItems = () => router.push({ name: 'sample-b-items' })
</script>
