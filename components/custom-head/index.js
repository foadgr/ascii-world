import NextHead from 'next/head'

export function CustomHead({ title = '', description, image, keywords }) {
  const siteUrl = 'https://asciiworld.app'
  const fullTitle = title
    ? `${title} | ASCII World`
    : 'ASCII World - Control your world with ASCII'
  const defaultDescription =
    description ||
    'An open-source ASCII tool built by @hafezverde to create live ASCII filters on your phone or webcam.'
  const defaultImage = image || `${siteUrl}/twitter-card.png`

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'ASCII World',
    description: defaultDescription,
    url: siteUrl,
    applicationCategory: 'GraphicsApplication',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    creator: {
      '@type': 'Organization',
      name: 'hafezverde',
      url: 'https://x.com/hafezverde',
    },
    keywords: keywords?.length
      ? keywords.join(', ')
      : 'ascii, art, mediapipe, computer vision, hand tracking, face tracking, generator, converter, text art, character art, webgl, react',
  }

  return (
    <>
      <NextHead>
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />

        <meta
          name="robots"
          content={
            process.env.NODE_ENV !== 'development'
              ? 'index,follow'
              : 'noindex,nofollow'
          }
        />
        <meta
          name="googlebot"
          content={
            process.env.NODE_ENV !== 'development'
              ? 'index,follow'
              : 'noindex,nofollow'
          }
        />

        <meta
          name="keywords"
          content={
            keywords?.length
              ? keywords.join(',')
              : 'ascii,art,mediapipe,computer vision,hand tracking,face tracking,generator,converter,text,character,webgl,react,tool'
          }
        />
        <meta name="author" content="hafezverde" />
        <meta name="referrer" content="no-referrer" />
        <meta name="format-detection" content="telephone=no" />
        <meta httpEquiv="x-dns-prefetch-control" content="off" />
        <meta httpEquiv="Window-Target" content="_value" />
        <meta name="geo.region" content="US" />
        <meta name="apple-mobile-web-app-title" content="ASCII World" />

        <title>{fullTitle}</title>
        <meta name="description" content={defaultDescription} />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={defaultDescription} />
        <meta property="og:image" content={defaultImage} />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:site_name" content="ASCII World" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={fullTitle} />
        <meta name="twitter:description" content={defaultDescription} />
        <meta name="twitter:image" content={defaultImage} />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for structured data
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </NextHead>
    </>
  )
}
