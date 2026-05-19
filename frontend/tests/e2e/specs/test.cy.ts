describe('smoke: list view loads', () => {
  it('shows the list page title', () => {
    cy.visit('/')
    cy.contains('商品一覧').should('be.visible')
  })
})
