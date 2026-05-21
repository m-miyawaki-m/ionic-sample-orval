// frontend/tests/e2e/specs/items-flow.cy.ts
describe('items flow: list → detail → delete / list → create', () => {
  beforeEach(() => {
    cy.fixture<{ id: number; name: string; price: number }[]>('listItems.json').as('items')
  })

  it('renders all items from the fixture', function () {
    cy.visit('/')
    cy.contains('商品一覧').should('be.visible')
    cy.get('ion-item').should('have.length', this.items.length)
    cy.contains('ion-item', this.items[0].name).should('be.visible')
    cy.contains('ion-item', `¥${this.items[0].price}`).should('be.visible')
  })

  it('navigates from list to detail (first item) and back', function () {
    cy.visit('/')
    cy.contains('ion-item', this.items[0].name).click()
    cy.contains(this.items[0].name).should('be.visible')
    cy.contains('ID:').should('be.visible')
    // 戻るボタンで一覧へ
    cy.get('ion-back-button').click()
    cy.contains('商品一覧').should('be.visible')
  })

  it('navigates from list to create, fills the form, and returns to list', function () {
    cy.visit('/')
    cy.contains('ion-button', '追加').click()
    cy.contains('商品作成').should('be.visible')

    // フォーム入力（ion-input 内の native input にタイプ）
    cy.get('ion-input').eq(0).find('input').type('テスト商品')
    cy.get('ion-input').eq(1).find('input').type('999')

    cy.contains('ion-button', '登録').should('not.have.attr', 'disabled')
    cy.contains('ion-button', '登録').click()

    // POST /api/items は Orval default mock が成功レスポンスを返す → router.replace で list へ
    cy.contains('商品一覧').should('be.visible')
  })

  it('deletes the first item from detail view and returns to list', function () {
    cy.visit('/')
    cy.contains('ion-item', this.items[0].name).click()
    cy.contains('商品詳細').should('be.visible')

    cy.contains('ion-button', '削除').click()

    // DELETE /api/items/:id 後 router.replace で list へ
    cy.contains('商品一覧').should('be.visible')
  })
})
