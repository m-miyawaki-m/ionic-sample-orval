// AUTO-GENERATED – do not edit
import { http, HttpResponse } from 'msw'
import { listItemsFixtures } from './listItems.fixtures'

let currentListItemsScenario: keyof typeof listItemsFixtures = 'twoItems'
export function setListItemsScenario(key: keyof typeof listItemsFixtures) { currentListItemsScenario = key }

export const generatedHandlers = [
  http.get('/api/items', () => {
    const s = listItemsFixtures[currentListItemsScenario]
    return HttpResponse.json(s.body, { status: s.status })
  })
]
