import { ref, type Ref } from 'vue'
import { listItems, getItem } from '@/api/default/default'
import {
  ListItemsResponse,
  GetItemResponse,
} from '@/api/zod/default/default.zod'
import type { Item } from '@/api/models'

function toErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}

export function useItems() {
  const items = ref<Item[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const raw = await listItems()
      items.value = ListItemsResponse.parse(raw) as Item[]
    } catch (e) {
      error.value = toErrorMessage(e)
    } finally {
      loading.value = false
    }
  }

  return { items, loading, error, load }
}

export function useItem(id: Ref<number> | number) {
  const item = ref<Item | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const idValue = typeof id === 'number' ? id : id.value
      const raw = await getItem(idValue)
      item.value = GetItemResponse.parse(raw) as Item
    } catch (e) {
      error.value = toErrorMessage(e)
    } finally {
      loading.value = false
    }
  }

  return { item, loading, error, load }
}
