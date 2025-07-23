import { ASCII } from 'components/ascii'
import { ClientOnly } from 'components/isomorphic'
import { Layout } from 'layouts/default'
import s from './home.module.scss'

export default function Home() {
  return (
    <Layout theme="light" showFooter={false}>
      <section className={s.hero}>
        <ClientOnly>
          <ASCII />
        </ClientOnly>
      </section>
    </Layout>
  )
}
