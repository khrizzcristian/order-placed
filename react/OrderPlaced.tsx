import React from 'react'
import { compose, graphql } from 'react-apollo'
import { InjectedIntlProps, injectIntl } from 'react-intl'
import { branch, renderComponent } from 'recompose'
import { Helmet, withRuntimeContext } from 'vtex.render-runtime'

import AnalyticsWrapper from './Analytics'
import Header from './components/Header'
import OrderInfo from './components/OrderInfo'
import Skeleton from './Skeleton'
import withoutSSR from './WithoutSSR'

import * as getOrderGroup from './graphql/getOrderGroup.graphql'
import ErrorMessage from './components/ErrorMessage'

export const CurrencyContext = React.createContext('BRL')

interface Props {
  orderGroupQuery: any
  inStore: boolean
}

class OrderPlaced extends React.Component<Props & InjectedIntlProps> {
  public render() {
    const { orderGroupQuery, inStore, intl } = this.props
    const { orderGroup } = orderGroupQuery

    return (
      <CurrencyContext.Provider
        value={orderGroup.orders[0].storePreferencesData.currencyCode}
      >
        <Helmet>
          <title>{intl.formatMessage({ id: 'page.title' })}</title>
        </Helmet>
        <AnalyticsWrapper eventList={orderGroup.analyticsData} />
        <Header
          orderGroup={orderGroup}
          profile={orderGroup.orders[0].clientProfileData}
          inStore={inStore}
        />
        <main>
          {orderGroup.orders.map((order: Order, index: number) => (
            <OrderInfo
              order={order}
              profile={order.clientProfileData}
              numOfOrders={orderGroup.orders.length}
              index={index}
              key={order.orderId}
            />
          ))}
        </main>
      </CurrencyContext.Provider>
    )
  }
}

export default compose(
  injectIntl,
  withRuntimeContext,
  withoutSSR,
  graphql(getOrderGroup.default, {
    name: 'orderGroupQuery',
    options: () => {
      const params = new URLSearchParams(location.search)
      const orderGroup = params.get('og')
      return {
        variables: {
          orderGroup,
        },
      }
    },
  }),
  /** render loading skeleton if query is still loading */
  branch(
    ({ orderGroupQuery }: any) => orderGroupQuery.loading,
    renderComponent(Skeleton)
  ),
  /** if query errored display an error alert */
  branch(
    ({ orderGroupQuery: { error } }: any) =>
      error && error.message && error.message.includes('403'),
    renderComponent(() => <ErrorMessage errorId="order.not-logged-in" />)
  ),
  /** if query resulted in an invalid orderGroup display an error alert*/
  branch(
    ({ orderGroupQuery: { orderGroup } }: any) =>
      orderGroup == null || orderGroup.orders == null,
    renderComponent(() => <ErrorMessage errorId="order.invalid" />)
  )
)(OrderPlaced)
