describe('items: list view backed by OpenAPI examples fixture', () => {
  it('renders all items from the fixture', () => {
    cy.fixture<{ id: number; name: string; price: number }[]>('listItems.json').then((items) => {
      cy.visit('/')
      cy.contains('商品一覧').should('be.visible')
      cy.get('ion-item').should('have.length', items.length)
      cy.contains('ion-item', items[0].name).should('be.visible')
      cy.contains('ion-item', `¥${items[0].price}`).should('be.visible')
    })
  })

  it('navigates from list to detail (first item)', () => {
    cy.fixture<{ id: number; name: string }[]>('listItems.json').then((items) => {
      cy.visit('/')
      cy.contains('ion-item', items[0].name).click()
      // DetailView shows the same name
      cy.contains(items[0].name).should('be.visible')
    })
  })
})
