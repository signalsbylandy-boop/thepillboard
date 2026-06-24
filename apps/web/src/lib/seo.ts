import { useEffect } from 'react'

const SITE_NAME = 'ThePillboard'
const SITE_URL = 'https://thepillboard.com'
const DEFAULT_DESC =
  'The He Said / She Said platform — both sides of the gender conversation get equal airtime. Vote, debate, and share your perspective.'
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`

function upsertMeta(attrName: string, attrValue: string, content: string) {
  let el = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attrName, attrValue)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

function upsertJsonLd(data: string) {
  let el = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = data
}

export interface SeoProps {
  title: string
  description?: string
  ogImage?: string
  ogType?: 'website' | 'article'
  canonicalPath?: string
  jsonLd?: string
}

export function useSeoMeta({
  title,
  description,
  ogImage,
  ogType = 'website',
  canonicalPath,
  jsonLd,
}: SeoProps) {
  useEffect(() => {
    const pageTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
    document.title = pageTitle

    const desc = description ?? DEFAULT_DESC
    const img = ogImage ?? DEFAULT_IMAGE
    const canonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : SITE_URL

    upsertMeta('name', 'description', desc)

    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', desc)
    upsertMeta('property', 'og:image', img)
    upsertMeta('property', 'og:type', ogType)
    upsertMeta('property', 'og:site_name', SITE_NAME)
    upsertMeta('property', 'og:url', canonical)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:site', '@thepillboard')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', desc)
    upsertMeta('name', 'twitter:image', img)

    upsertLink('canonical', canonical)

    if (jsonLd) {
      upsertJsonLd(jsonLd)
    }

    return () => {
      document.title = SITE_NAME
    }
  }, [title, description, ogImage, ogType, canonicalPath, jsonLd])
}
