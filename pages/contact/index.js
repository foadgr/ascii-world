import { Link } from 'components/link'
import { Layout } from 'layouts/default'
import Head from 'next/head'
import s from './contact.module.scss'

export default function Contact() {
  // Breadcrumb JSON-LD structured data
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'ASCII World',
        item: 'https://asciiworld.app',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Contact & Support',
        item: 'https://asciiworld.app/contact',
      },
    ],
  }

  return (
    <Layout
      seo={{
        title: 'Contact & Support',
        description:
          'Get in touch with the ASCII World team. Find documentation, resources, and support for the ASCII art tool.',
        keywords: [
          'contact',
          'ascii world',
          'support',
          'feedback',
          'documentation',
        ],
      }}
      theme="light"
    >
      <Head>
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      </Head>
      <div className={s.breadcrumbs}>
        <Link href="/" className={s.breadcrumbLink}>
          ← ASCII World
        </Link>
        <span className={s.breadcrumbSeparator}>›</span>
        <span className={s.breadcrumbCurrent}>Contact & Support</span>
      </div>

      <div className={s.contact}>
        <div className={s.container}>
          <header className={s.header}>
            <h1>Contact & Support</h1>
            <p>Get in touch or find helpful resources</p>
          </header>

          <div className={s.content}>
            <section className={s.howToUse}>
              <h2>How to Use ASCII World</h2>
              <div className={s.steps}>
                <div className={s.step}>
                  <div className={s.stepNumber}>1</div>
                  <div className={s.stepContent}>
                    <h3>Start your camera</h3>
                    <p>Tap the camera icon to begin</p>
                  </div>
                </div>
                <div className={s.step}>
                  <div className={s.stepNumber}>2</div>
                  <div className={s.stepContent}>
                    <h3>Choose tracking mode</h3>
                    <p>Select either hand or face tracking</p>
                  </div>
                </div>
                <div className={s.step}>
                  <div className={s.stepNumber}>3</div>
                  <div className={s.stepContent}>
                    <h3>Calibrate your distance</h3>
                    <p>
                      When you toggle tracking on, tap the orange icon to lock
                      in your current position
                    </p>
                  </div>
                </div>
                <div className={s.step}>
                  <div className={s.stepNumber}>4</div>
                  <div className={s.stepContent}>
                    <h3>Control the detail</h3>
                    <p>
                      Move closer to the camera for maximum detail, or further
                      away for minimum detail
                    </p>
                  </div>
                </div>
                <div className={s.step}>
                  <div className={s.stepNumber}>5</div>
                  <div className={s.stepContent}>
                    <h3>Switch cameras (mobile)</h3>
                    <p>
                      Use the camera switch button to toggle between front and
                      back cameras
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className={s.support}>
              <h2>Get in Touch</h2>
              <div className={s.supportOptions}>
                <div className={s.option}>
                  <h3>Questions or Feedback</h3>
                  <p>
                    For questions, collaboration opportunities, or general
                    inquiries
                  </p>
                  <Link href="https://x.com/hafezverde" className={s.link}>
                    Message @hafezverde on X
                  </Link>
                </div>
              </div>
            </section>

            <section className={s.resources}>
              <h2>Documentation & Resources</h2>
              <div className={s.resourceLinks}>
                <Link
                  href="https://ai.google.dev/edge/mediapipe/solutions/guide"
                  className={s.resourceLink}
                >
                  Google AI MediaPipe Documentation
                </Link>
                <Link href="https://threejs.org/" className={s.resourceLink}>
                  Three.js Documentation
                </Link>
                <Link
                  href="https://github.com/pmndrs/react-three-fiber"
                  className={s.resourceLink}
                >
                  React-Three-Fiber
                </Link>
                <Link
                  href="https://github.com/pmndrs/drei"
                  className={s.resourceLink}
                >
                  React-Three-Drei
                </Link>
                <Link
                  href="https://github.com/darkroomengineering/aniso"
                  className={s.resourceLink}
                >
                  Aniso - ASCII Tool
                </Link>
              </div>
            </section>

            <section className={s.about}>
              <h2>About ASCII World</h2>
              <p>
                ASCII World transforms your camera feed into ASCII art in
                real-time. Built with modern web technologies including
                MediaPipe for hand/face tracking, Three.js for rendering, and
                React for the interface.
              </p>
              <p>
                This project is forked from{' '}
                <Link href="https://aniso.darkroom.engineering">Aniso</Link>, an
                open-source ASCII tool built by{' '}
                <Link href="https://darkroom.engineering">
                  darkroom.engineering
                </Link>
                .
              </p>
              <p>
                Modified and enhanced by{' '}
                <Link href="https://x.com/hafezverde">@hafezverde</Link> to
                explore the intersection of computer vision, creative coding,
                and web technologies.
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  )
}
