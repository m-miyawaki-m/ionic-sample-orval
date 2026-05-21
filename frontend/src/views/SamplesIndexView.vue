<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>レイアウトサンプル</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p class="ion-padding-horizontal">
        Ionic Vue で組める 5 つのナビゲーションパターンのデモ。各画面のデータは
        OpenAPI 由来の orval 生成クライアント + zod バリデーションで取得しています。
      </p>

      <ion-list inset>
        <ion-item button :router-link="{ name: 'sample-a' }" :detail="true">
          <ion-icon slot="start" :icon="layersOutline" color="primary" />
          <ion-label>
            <h2>Pattern A — シンプル Stack</h2>
            <p>IonRouterOutlet 1本。最小構成・線形フロー。</p>
          </ion-label>
        </ion-item>
        <ion-item button :router-link="{ name: 'sample-b' }" :detail="true">
          <ion-icon slot="start" :icon="gridOutline" color="primary" />
          <ion-label>
            <h2>Pattern B — メニューホーム</h2>
            <p>カードグリッドのダッシュボード → 各機能へ。</p>
          </ion-label>
        </ion-item>
        <ion-item button :router-link="{ name: 'sample-c-home' }" :detail="true">
          <ion-icon slot="start" :icon="appsOutline" color="primary" />
          <ion-label>
            <h2>Pattern C — ボトムタブ</h2>
            <p>Android Material 標準。タブ毎に独立した戻る履歴。</p>
          </ion-label>
        </ion-item>
        <ion-item button :router-link="{ name: 'sample-d-items' }" :detail="true">
          <ion-icon slot="start" :icon="menuOutline" color="primary" />
          <ion-label>
            <h2>Pattern D — サイドメニュー (Drawer)</h2>
            <p>IonSplitPane + IonMenu。タブレットで自動展開。</p>
          </ion-label>
        </ion-item>
        <ion-item button :router-link="{ name: 'sample-e-home' }" :detail="true">
          <ion-icon slot="start" :icon="layersOutline" color="primary" />
          <ion-label>
            <h2>Pattern E — タブ + Drawer ハイブリッド</h2>
            <p>主要機能タブ + 補助機能 drawer。</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-list-header>
        <ion-label>既存サンプル</ion-label>
      </ion-list-header>
      <ion-list inset>
        <ion-item button :router-link="{ name: 'list' }" :detail="true">
          <ion-icon slot="start" :icon="cartOutline" color="medium" />
          <ion-label>
            <h2>商品 CRUD デモ</h2>
            <p>従来の /items 画面（一覧・詳細・作成）。</p>
          </ion-label>
        </ion-item>
        <ion-item button :router-link="{ name: 'bridge-demo' }" :detail="true">
          <ion-icon slot="start" :icon="phonePortraitOutline" color="medium" />
          <ion-label>
            <h2>Android ブリッジデモ</h2>
            <p>DemoSdk (Capacitor plugin) の通信サンプル。</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonList, IonListHeader, IonItem, IonLabel, IonIcon,
} from '@ionic/vue'
import {
  layersOutline, gridOutline, appsOutline, menuOutline,
  cartOutline, phonePortraitOutline,
} from 'ionicons/icons'
</script>
